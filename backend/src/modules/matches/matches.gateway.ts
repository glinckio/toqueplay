import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisService } from '../../common/redis/redis.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class MatchesGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  private readonly logger = new Logger(MatchesGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private redisService: RedisService) {}

  async afterInit() {
    try {
      const pubClient = this.redisService.getClient().duplicate();
      const subClient = this.redisService.getClient().duplicate();
      (this.server as any).adapter(createAdapter(pubClient, subClient));
    } catch {
      // Redis adapter optional — falls back to in-memory
    }
  }

  handleConnection(client: Socket) {
    this.logger.debug(`ws connected client=${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`ws disconnected client=${client.id}`);
  }

  @SubscribeMessage('tournament:join')
  handleJoinTournament(client: Socket, data: { tournamentId: string }) {
    client.join(`tournament:${data.tournamentId}`);
  }

  @SubscribeMessage('tournament:leave')
  handleLeaveTournament(client: Socket, data: { tournamentId: string }) {
    client.leave(`tournament:${data.tournamentId}`);
  }

  @SubscribeMessage('friendly:join')
  handleFriendlyJoin(client: Socket, payload: { friendlyId: string }) {
    client.join(`friendly:${payload.friendlyId}`);
  }

  @SubscribeMessage('friendly:leave')
  handleFriendlyLeave(client: Socket, payload: { friendlyId: string }) {
    client.leave(`friendly:${payload.friendlyId}`);
  }

  @SubscribeMessage('match:join')
  handleMatchJoin(client: Socket, payload: { matchId: string }) {
    this.logger.verbose(`ws match:join matchId=${payload.matchId} client=${client.id}`);
    client.join(`match:${payload.matchId}`);
  }

  @SubscribeMessage('match:leave')
  handleMatchLeave(client: Socket, payload: { matchId: string }) {
    client.leave(`match:${payload.matchId}`);
  }

  emitToTournament(tournamentId: string, event: string, data: any) {
    this.server.to(`tournament:${tournamentId}`).emit(event, data);
  }

  emitToFriendly(friendlyId: string, event: string, data: any) {
    this.server.to(`friendly:${friendlyId}`).emit(event, data);
  }

  emitToMatch(matchId: string, event: string, data: any) {
    this.server.to(`match:${matchId}`).emit(event, data);
  }
}
