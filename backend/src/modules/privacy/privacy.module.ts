import { Module } from '@nestjs/common';
import { PrivacyController, AdminPrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { PrivacyRetentionCron } from './privacy-retention.cron';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [PrivacyController, AdminPrivacyController],
  providers: [PrivacyService, PrivacyRetentionCron],
  exports: [PrivacyService],
})
export class PrivacyModule {}
