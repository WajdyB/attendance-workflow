// src/documents/dto/create-document.dto.ts
import { IsString, IsOptional, IsEnum, IsArray, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { DocumentCategory } from '@prisma/client';

export class CreateDocumentDto {
  @IsString()
  title!: string;

  @IsEnum(DocumentCategory)
  category!: DocumentCategory;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (Array.isArray(value)) {
      return value.filter(
        (entry): entry is string => typeof entry === 'string',
      );
    }

    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (entry): entry is string => typeof entry === 'string',
          );
        }
      } catch {
        return value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
    }

    return [];
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsUUID()
  uploadedBy?: string;
}
