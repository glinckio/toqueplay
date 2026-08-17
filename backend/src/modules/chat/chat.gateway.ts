import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisService } from '../../common/redis/redis.service';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private redisService: RedisService,
  ) {}

  async afterInit() {
    const pubClient = this.redisService.getClient().duplicate();
    const subClient = this.redisService.getClient().duplicate();
    this.server.adapter(createAdapter(pubClient, subClient));
  }

  handleConnection(client: Socket) {
    // Client connected
  }

  handleDisconnect(client: Socket) {
    // Client disconnected — rooms auto-cleaned
  }

  @SubscribeMessage('chat:join')
  async handleJoinChat(client: Socket, data: { chatId: string }) {
    client.join(`chat:${data.chatId}`);
  }

  @SubscribeMessage('chat:leave')
  handleLeaveChat(client: Socket, data: { chatId: string }) {
    client.leave(`chat:${data.chatId}`);
  }

  @SubscribeMessage('chat:message')
  async handleMessage(
    client: Socket,
    data: { chatId: string; content: string; userId: string },
  ) {
    const message = await this.chatService.sendMessage(data.chatId, data.userId, {
      content: data.content,
    });

    this.server.to(`chat:${data.chatId}`).emit('chat:message', message);
  }

  emitToChat(chatId: string, event: string, data: any) {
    this.server.to(`chat:${chatId}`).emit(event, data);
  }
}
