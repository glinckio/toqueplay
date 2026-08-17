import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AppError } from '../../common/errors/app-error';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async registerToken(userId: string, token: string, platform: string) {
    return this.prisma.deviceToken.upsert({
      where: { userId_token: { userId, token } },
      update: { platform },
      create: { userId, token, platform },
    });
  }

  async removeToken(userId: string, token: string) {
    const deviceToken = await this.prisma.deviceToken.findUnique({
      where: { userId_token: { userId, token } },
    });

    if (!deviceToken) return;

    await this.prisma.deviceToken.delete({
      where: { id: deviceToken.id },
    });
  }

  async findMine(userId: string, page: number = 1, limit: number = 20, unreadOnly: boolean = false) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (unreadOnly) where.read = false;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return { unreadCount: count };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw AppError.notificationNotFound();
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { message: 'All notifications marked as read' };
  }
}
