import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorator/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('holidays')
@UseGuards(RolesGuard)
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Get()
  async findAll(@Query('year') year?: string) {
    return this.holidaysService.findAll(year ? Number(year) : undefined);
  }

  @Post()
  @RequireRoles(Role.ADMIN)
  async create(@Body() dto: CreateHolidayDto) {
    return this.holidaysService.create(dto);
  }

  @Patch(':id')
  @RequireRoles(Role.ADMIN)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: Partial<CreateHolidayDto>,
  ) {
    return this.holidaysService.update(id, dto);
  }

  @Delete(':id')
  @RequireRoles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.holidaysService.remove(id);
  }
}
