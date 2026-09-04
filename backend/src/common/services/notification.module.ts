import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { MailModule } from '../../modules/mail/mail.module';

@Global()
@Module({
  imports: [MailModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
