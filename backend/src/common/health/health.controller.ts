import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis/redis.service';
import { Public } from '../decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    let database: 'up' | 'down' = 'down';
    let redis: 'up' | 'down' = 'down';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {}

    try {
      const pong = await this.redisService.get('ping');
      redis = pong === null ? 'up' : 'up'; // key exists or not — connection works either way
    } catch {}

    const status = database === 'up' && redis === 'up' ? 'ok' : 'degraded';

    return { status, database, redis, timestamp: new Date().toISOString() };
  }
}
