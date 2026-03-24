import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { TimesheetsService } from './timesheets.service';
import { UpsertTimesheetDraftDto } from './dto/upsert-timesheet-draft.dto';
import { ApproveTimesheetDto } from './dto/approve-timesheet.dto';
import { RejectTimesheetDto } from './dto/reject-timesheet.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { Response } from 'express';

@Controller('timesheets')
@UseGuards(RolesGuard)
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Get('projects')
  async listProjects() {
    return this.timesheetsService.listProjects();
  }

  @Post('draft')
  async upsertDraft(@Body() dto: UpsertTimesheetDraftDto) {
    return this.timesheetsService.upsertDraft(dto);
  }

  @Post(':id/submit')
  async submit(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.timesheetsService.submit(id);
  }

  @Post(':id/approve')
  async approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ApproveTimesheetDto,
  ) {
    return this.timesheetsService.approve(id, dto);
  }

  @Post(':id/reject')
  async reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectTimesheetDto,
  ) {
    return this.timesheetsService.reject(id, dto);
  }

  @Get('user/:userId')
  async findByUser(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('weekStartDate') weekStartDate?: string,
  ) {
    return this.timesheetsService.findByUser(userId, weekStartDate);
  }

  @Get('manager/:managerId/submitted')
  async findSubmittedForManager(
    @Param('managerId', new ParseUUIDPipe()) managerId: string,
  ) {
    return this.timesheetsService.findSubmittedForManager(managerId);
  }

  @Get('reports/user/:userId/weekly')
  async getWeeklyReport(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('weekStartDate') weekStartDate: string,
  ) {
    return this.timesheetsService.getWeeklyReport(userId, weekStartDate);
  }

  @Get('reports/user/:userId/monthly')
  async getMonthlyReport(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.timesheetsService.getMonthlyReport(
      userId,
      Number(year),
      Number(month),
    );
  }

  @Get('reports/projects/totals')
  async getProjectTotals(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.timesheetsService.getProjectTotals(Number(year), Number(month));
  }

  @Get('export/excel')
  async exportExcel(
    @Query('year') year: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    const csv = await this.timesheetsService.exportMonthlyExcel(
      Number(year),
      Number(month),
    );

    const fileName = `timesheets-${year}-${month}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csv);
  }

  @Get('export/pdf')
  async exportPdf(
    @Query('year') year: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.timesheetsService.exportMonthlyPdf(
      Number(year),
      Number(month),
    );

    const fileName = `timesheets-${year}-${month}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  }

  @Get(':id')
  async findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.timesheetsService.findById(id);
  }
}
