import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HomeService } from './home.service';

@ApiTags('Home')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('home')
  @ApiOperation({ summary: 'Dashboard com dados agregados' })
  async getDashboard(@CurrentUser('id') userId: string) {
    return this.homeService.getDashboard(userId);
  }

  @Get('feed')
  @ApiOperation({ summary: 'Feed de atividades do usuário' })
  async getFeed(@CurrentUser('id') userId: string) {
    return this.homeService.getFeed(userId);
  }
}
