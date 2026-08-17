import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { ChatType } from '@prisma/client';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async listUserChats(userId: string) {
    const teamMemberships = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const teamIds = teamMemberships.map((m) => m.teamId);

    if (teamIds.length === 0) return [];

    return this.prisma.chat.findMany({
      where: {
        OR: [
          { type: ChatType.INTRA_TEAM, teamId: { in: teamIds } },
          {
            type: ChatType.INTER_TEAM,
            OR: [
              { teamAId: { in: teamIds } },
              { teamBId: { in: teamIds } },
            ],
          },
        ],
      },
      include: {
        team: { select: { id: true, name: true, avatarUrl: true } },
        teamA: { select: { id: true, name: true, avatarUrl: true } },
        teamB: { select: { id: true, name: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(chatId: string, userId: string, page = 1, limit = 30) {
    await this.validateAccess(chatId, userId);

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { chatId },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.chatMessage.count({ where: { chatId } }),
    ]);

    return {
      data: messages.reverse(),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async sendMessage(chatId: string, userId: string, dto: SendMessageDto) {
    await this.validateAccess(chatId, userId);

    const message = await this.prisma.chatMessage.create({
      data: {
        chatId,
        senderId: userId,
        content: dto.content,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    await this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async validateAccess(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw AppError.chatNotFound();
    }

    const isMember = await this.isUserInChat(chat, userId);
    if (!isMember) {
      throw AppError.notChatMember();
    }

    return chat;
  }

  private async isUserInChat(chat: { type: ChatType; teamId: string | null; teamAId: string | null; teamBId: string | null }, userId: string): Promise<boolean> {
    const teamIds = chat.type === ChatType.INTRA_TEAM
      ? [chat.teamId!]
      : [chat.teamAId!, chat.teamBId!].filter(Boolean);

    if (teamIds.length === 0) return false;

    const membership = await this.prisma.teamMember.findFirst({
      where: {
        userId,
        teamId: { in: teamIds },
      },
    });

    return !!membership;
  }

  async createIntraTeamChat(teamId: string) {
    return this.prisma.chat.create({
      data: {
        type: ChatType.INTRA_TEAM,
        teamId,
      },
    });
  }

  async createInterTeamChat(teamAId: string, teamBId: string) {
    const sorted = [teamAId, teamBId].sort();
    const existing = await this.prisma.chat.findUnique({
      where: { teamAId_teamBId: { teamAId: sorted[0], teamBId: sorted[1] } },
    });
    if (existing) return existing;

    return this.prisma.chat.create({
      data: {
        type: ChatType.INTER_TEAM,
        teamAId: sorted[0],
        teamBId: sorted[1],
      },
    });
  }
}
