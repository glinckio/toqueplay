import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private redis: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const maintenanceFlag = await this.redis.get('system:maintenance');
    if (maintenanceFlag !== 'true') {
      return next();
    }

    // Allow admin requests through
    const user = (req as any).user;
    if (user && user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Allow auth-related routes so admin can still login
    if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/google')) {
      return next();
    }

    const globalMessage = await this.redis.get('system:globalMessage');

    res.status(503).json({
      statusCode: 503,
      code: 'MAINTENANCE_MODE',
      message: globalMessage ?? 'System under maintenance. Please try again later.',
    });
  }
}
