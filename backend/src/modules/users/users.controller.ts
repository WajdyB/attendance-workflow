// src/users/users.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorator/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('add')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id/dossier')
  async getDossier(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.getDossier(id);
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Patch(':id/password')
  @UseGuards(RolesGuard)
  @RequireRoles(Role.ADMIN, Role.SUPER_ADMIN)
  async updatePassword(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserPasswordDto: UpdateUserPasswordDto,
  ) {
    return this.usersService.updateUserPassword(
      id,
      updateUserPasswordDto.newPassword,
    );
  }

  @Delete(':id')
  async delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.delete(id);
  }

  @Post(':id/picture')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPicture(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadPicture(id, file);
  }

  @Delete(':id/picture')
  async removePicture(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.removePicture(id);
  }

  @Post(':collaboratorId/manager/:managerId')
  async setManager(
    @Param('collaboratorId', new ParseUUIDPipe()) collaboratorId: string,
    @Param('managerId', new ParseUUIDPipe()) managerId: string,
  ) {
    return this.usersService.setManager(collaboratorId, managerId);
  }

  @Get(':userId/manager')
  async getManager(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.usersService.getManager(userId);
  }

  @Get(':managerId/supervised-collaborators')
  async getSupervisedCollaborators(
    @Param('managerId', new ParseUUIDPipe()) managerId: string,
  ) {
    return this.usersService.getSupervisedCollaborators(managerId);
  }
}
