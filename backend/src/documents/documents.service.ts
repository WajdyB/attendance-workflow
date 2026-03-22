// src/documents/documents.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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

      // Generate unique filename
      const sanitizedFileName = file.originalname.replace(
        /[^a-zA-Z0-9.]/g,
        '_',
      );
      const fileName = `documents/${userId}/${Date.now()}-${sanitizedFileName}`;

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

      // Save document metadata in database
      const document = await this.prisma.document.create({
        data: {
          userId,
          title: createDocumentDto.title,
          category: createDocumentDto.category,
          fileUrl: publicUrl,
          fileType: file.mimetype,
          fileSize: file.size,
        },
      });

      this.logger.log(
        `Document uploaded: ${document.title} for user ${userId}`,
      );

      return {
        message: 'Document uploaded successfully',
        document,
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

  async getUserDocuments(userId: string) {
    try {
      const documents = await this.prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return documents;
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

      return document;
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
          this.logger.error(
            `Error deleting file from storage: ${storageError}`,
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
        orderBy: { createdAt: 'desc' },
      });

      return documents;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch documents by category: ${errorMessage}`,
      );
      throw new BadRequestException('Failed to fetch documents');
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
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ],
          },
        );
        this.logger.log('Documents bucket created successfully');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error ensuring documents bucket: ${errorMessage}`);
    }
  }
}
