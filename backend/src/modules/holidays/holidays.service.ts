import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';

@Injectable()
export class HolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(year?: number) {
    return this.prisma.publicHoliday.findMany({
      where: year ? { OR: [{ year: null }, { year }] } : undefined,
      orderBy: { date: 'asc' },
    });
  }

  async create(dto: CreateHolidayDto) {
    return this.prisma.publicHoliday.create({
      data: {
        name: dto.name,
        date: new Date(dto.date),
        year: dto.year ?? null,
      },
    });
  }

  async update(id: string, dto: Partial<CreateHolidayDto>) {
    const holiday = await this.prisma.publicHoliday.findUnique({ where: { id } });
    if (!holiday) throw new NotFoundException('Holiday not found');

    return this.prisma.publicHoliday.update({
      where: { id },
      data: {
        name: dto.name ?? holiday.name,
        date: dto.date ? new Date(dto.date) : holiday.date,
        year: dto.year !== undefined ? dto.year : holiday.year,
      },
    });
  }

  async remove(id: string) {
    const holiday = await this.prisma.publicHoliday.findUnique({ where: { id } });
    if (!holiday) throw new NotFoundException('Holiday not found');
    await this.prisma.publicHoliday.delete({ where: { id } });
    return { success: true };
  }
}
