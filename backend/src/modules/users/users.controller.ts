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
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  UsersService,
  type RequestingUser,
} from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorator/roles.decorator';
import { Role } from '../../common/enums/role.enum';

type RequestWithRequestingUser = Request & { user?: RequestingUser & Record<string, unknown> };

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('add')
  @RequireRoles(Role.ADMIN)
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
    @Req() req: RequestWithRequestingUser,
  ) {
    const requester = req.user as RequestingUser | undefined;
    return this.usersService.updateUser(id, updateUserDto, requester);
  }

  @Patch(':id/password')
  @RequireRoles(Role.ADMIN)
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
  @RequireRoles(Role.ADMIN)
  async delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.delete(id);
  }

  @Post(':id/picture')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPicture(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithRequestingUser,
  ) {
    const requester = req.user as RequestingUser | undefined;
    return this.usersService.uploadPicture(id, file, requester);
  }

  @Delete(':id/picture')
  async removePicture(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: RequestWithRequestingUser,
  ) {
    const requester = req.user as RequestingUser | undefined;
    return this.usersService.removePicture(id, requester);
  }

  @Post(':collaboratorId/manager/:managerId')
  @RequireRoles(Role.ADMIN)
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
