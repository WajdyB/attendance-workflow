// src/documents/documents.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentCategory } from '@prisma/client';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    createDocumentDto: CreateDocumentDto,
  ) {
    try {
      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Ensure documents bucket exists
      await this.ensureDocumentsBucket();

      const normalizedTitle = createDocumentDto.title.trim();
      const latestVersion = await this.prisma.document.findFirst({
        where: {
          userId,
          title: normalizedTitle,
          category: createDocumentDto.category,
        },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });

      const versionNumber = (latestVersion?.versionNumber ?? 0) + 1;

      // Generate unique filename
      const sanitizedFileName = file.originalname.replace(
        /[^a-zA-Z0-9.]/g,
        '_',
      );
      const fileName = `documents/${userId}/${Date.now()}-v${versionNumber}-${sanitizedFileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } =
        await this.supabaseService.adminClient.storage
          .from('documents')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
          });

      if (uploadError) {
        throw new BadRequestException(
          `Failed to upload file: ${uploadError.message}`,
        );
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = this.supabaseService.adminClient.storage
        .from('documents')
        .getPublicUrl(fileName);

      const parsedTags = (() => {
        if (!createDocumentDto.tags) {
          return [] as string[];
        }

        if (Array.isArray(createDocumentDto.tags)) {
          return createDocumentDto.tags;
        }

        try {
          const value: unknown = JSON.parse(
            createDocumentDto.tags as unknown as string,
          );
          return Array.isArray(value)
            ? value.filter(
                (entry): entry is string => typeof entry === 'string',
              )
            : [];
        } catch {
          return String(createDocumentDto.tags)
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean);
        }
      })();

      // Save document metadata in database
      const document = await this.prisma.document.create({
        data: {
          userId,
          uploadedBy: createDocumentDto.uploadedBy ?? userId,
          title: normalizedTitle,
          description: createDocumentDto.description,
          category: createDocumentDto.category,
          versionNumber,
          originalName: file.originalname,
          tags: parsedTags,
          fileUrl: publicUrl,
          fileType: file.mimetype,
          fileSize: BigInt(file.size),
        },
      });

      this.logger.log(
        `Document uploaded: ${document.title} for user ${userId}`,
      );

      return {
        message: 'Document uploaded successfully',
        document: this.serializeForResponse(document),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to upload document: ${errorMessage}`);
      throw new BadRequestException('Failed to upload document');
    }
  }

  async getUserDocuments(
    userId: string,
    filters?: {
      category?: DocumentCategory;
      search?: string;
      tag?: string;
    },
  ) {
    try {
      const documents = await this.prisma.document.findMany({
        where: {
          userId,
          ...(filters?.category ? { category: filters.category } : {}),
          ...(filters?.search
            ? {
                OR: [
                  {
                    title: {
                      contains: filters.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    description: {
                      contains: filters.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    originalName: {
                      contains: filters.search,
                      mode: 'insensitive',
                    },
                  },
                ],
              }
            : {}),
          ...(filters?.tag ? { tags: { has: filters.tag } } : {}),
        },
        orderBy: [{ title: 'asc' }, { versionNumber: 'desc' }],
      });

      return this.serializeForResponse(documents);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch documents for user ${userId}: ${errorMessage}`,
      );
      throw new BadRequestException('Failed to fetch documents');
    }
  }

  async getDocumentById(id: string, userId: string) {
    try {
      const document = await this.prisma.document.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      return this.serializeForResponse(document);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch document ${id}: ${errorMessage}`);
      throw new BadRequestException('Failed to fetch document');
    }
  }

  async deleteDocument(id: string, userId: string) {
    try {
      // Find document
      const document = await this.prisma.document.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      // ✅ FIXED: Check if fileUrl exists before trying to split it
      if (document.fileUrl) {
        try {
          const fileName = document.fileUrl.split('/').pop();
          if (fileName) {
            const { error: deleteError } =
              await this.supabaseService.adminClient.storage
                .from('documents')
                .remove([`documents/${userId}/${fileName}`]);

            if (deleteError) {
              this.logger.error(
                `Failed to delete file from storage: ${deleteError.message}`,
              );
              // Continue with database deletion even if storage delete fails
            }
          }
        } catch (storageError) {
          const storageMessage =
            storageError instanceof Error
              ? storageError.message
              : String(storageError);
          this.logger.error(
            `Error deleting file from storage: ${storageMessage}`,
          );
          // Continue with database deletion
        }
      } else {
        this.logger.warn(
          `Document ${id} has no fileUrl, skipping storage deletion`,
        );
      }

      // Delete from database
      await this.prisma.document.delete({
        where: { id },
      });

      this.logger.log(`Document deleted: ${document.title}`);

      return {
        message: 'Document deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete document ${id}: ${errorMessage}`);
      throw new BadRequestException('Failed to delete document');
    }
  }

  async getDocumentsByCategory(userId: string, category: DocumentCategory) {
    try {
      const documents = await this.prisma.document.findMany({
        where: {
          userId,
          category,
        },
        orderBy: [{ title: 'asc' }, { versionNumber: 'desc' }],
      });

      return this.serializeForResponse(documents);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch documents by category: ${errorMessage}`,
      );
      throw new BadRequestException('Failed to fetch documents');
    }
  }

  async getDocumentVersions(
    userId: string,
    title?: string,
    category?: DocumentCategory,
  ) {
    try {
      if (!title) {
        return [];
      }

      const documents = await this.prisma.document.findMany({
        where: {
          userId,
          title,
          ...(category ? { category } : {}),
        },
        orderBy: { versionNumber: 'desc' },
      });

      return this.serializeForResponse(documents);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch document versions for ${title}: ${errorMessage}`,
      );
      throw new BadRequestException('Failed to fetch document versions');
    }
  }

  private async ensureDocumentsBucket() {
    try {
      const { data: buckets } =
        await this.supabaseService.adminClient.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === 'documents');

      if (!bucketExists) {
        await this.supabaseService.adminClient.storage.createBucket(
          'documents',
          {
            public: true,
            fileSizeLimit: 10485760, // 10MB
            allowedMimeTypes: [
              'application/pdf',
              'image/jpeg',
              'image/png',
              'image/webp',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ],
          },
        );
        this.logger.log('Documents bucket created successfully');
      }
    } catch (error) {
      const supabaseError = error as PostgrestError;
      const errorMessage =
        typeof supabaseError?.message === 'string'
          ? supabaseError.message
          : error instanceof Error
            ? error.message
            : 'Unknown error';
      this.logger.error(`Error ensuring documents bucket: ${errorMessage}`);
    }
  }

  private serializeForResponse<T>(payload: T): T {
    return this.convertBigInt(payload) as T;
  }

  private convertBigInt(value: unknown): unknown {
    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.convertBigInt(entry));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
          key,
          this.convertBigInt(entry),
        ]),
      );
    }

    return value;
  }
}
