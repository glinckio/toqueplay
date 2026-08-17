import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../common/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      deviceToken: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      notification: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('registerToken', () => {
    it('should upsert a device token', async () => {
      prisma.deviceToken.upsert.mockResolvedValue({ id: 'dt1', token: 'abc', platform: 'android' });

      const result = await service.registerToken('user-1', 'abc', 'android');

      expect(prisma.deviceToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_token: { userId: 'user-1', token: 'abc' } },
          create: { userId: 'user-1', token: 'abc', platform: 'android' },
        }),
      );
    });
  });

  describe('removeToken', () => {
    it('should delete a device token', async () => {
      prisma.deviceToken.findUnique.mockResolvedValue({ id: 'dt1' });
      prisma.deviceToken.delete.mockResolvedValue({ id: 'dt1' });

      await service.removeToken('user-1', 'abc');

      expect(prisma.deviceToken.delete).toHaveBeenCalledWith({ where: { id: 'dt1' } });
    });

    it('should do nothing if token not found', async () => {
      prisma.deviceToken.findUnique.mockResolvedValue(null);

      await service.removeToken('user-1', 'nonexistent');

      expect(prisma.deviceToken.delete).not.toHaveBeenCalled();
    });
  });

  describe('findMine', () => {
    it('should return paginated notifications', async () => {
      prisma.notification.findMany.mockResolvedValue([{ id: 'n1' }]);
      prisma.notification.count.mockResolvedValue(1);

      const result = await service.findMine('user-1', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      prisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(result.unreadCount).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'user-1' });
      prisma.notification.update.mockResolvedValue({ id: 'n1', read: true });

      const result = await service.markAsRead('n1', 'user-1');

      expect(result.read).toBe(true);
    });

    it('should throw if notification not found', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await expect(
        service.markAsRead('nonexistent', 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', read: false },
          data: { read: true },
        }),
      );
      expect(result.message).toBeDefined();
    });
  });
});
