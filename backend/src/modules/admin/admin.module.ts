import { Module, MiddlewareConsumer } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { MaintenanceMiddleware } from '../../common/middleware/maintenance.middleware';

@Module({
  imports: [JwtModule.register({}), AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MaintenanceMiddleware).exclude('api/admin').forRoutes('*');
  }
}
