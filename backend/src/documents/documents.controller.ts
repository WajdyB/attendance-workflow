// src/documents/documents.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorator/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { DocumentCategory } from '@prisma/client';

@Controller('documents')
@UseGuards(RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload/:userId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
  ) {
    return this.documentsService.uploadDocument(
      userId,
      file,
      createDocumentDto,
    );
  }

  @Get('getdocuments/:userId')
  async getUserDocuments(@Param('userId') userId: string) {
    return this.documentsService.getUserDocuments(userId);
  }

  @Get('getdocuments/:userId/category')
  async getDocumentsByCategory(
    @Param('userId') userId: string,
    @Query('category') category: DocumentCategory,
  ) {
    return this.documentsService.getDocumentsByCategory(userId, category);
  }

  @Get('getdocumentbyid/:id/:userId')
  async getDocument(@Param('id') id: string, @Param('userId') userId: string) {
    return this.documentsService.getDocumentById(id, userId);
  }

  @Delete('deletedocument/:id/:userId')
  async deleteDocument(
    @Param('id') id: string,

    @Param('userId') userId: string,
  ) {
    return this.documentsService.deleteDocument(id, userId);
  }
}
