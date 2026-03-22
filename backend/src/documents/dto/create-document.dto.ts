// src/documents/dto/create-document.dto.ts
import { IsString, IsOptional, IsEnum, IsInt, IsUrl } from 'class-validator';
import { DocumentCategory } from '@prisma/client';

export class CreateDocumentDto {
  @IsString()
  title!: string;

  @IsEnum(DocumentCategory)
  category!: DocumentCategory;

  @IsOptional()
  @IsString()
  description?: string;
}
