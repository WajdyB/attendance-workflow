import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { SupabaseClient } from '@supabase/supabase-js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Get('test-supabase')
  async testSupabase() {
    const { data, error } = await this.supabase.auth.getSession();

    return {
      message: 'Supabase connection works',
      data,
      error,
    };
  }
}
