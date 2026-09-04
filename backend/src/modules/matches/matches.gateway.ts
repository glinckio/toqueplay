import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../common/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  jti?: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
})
export class MatchesGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  private readonly logger = new Logger(MatchesGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private redisService: RedisService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async afterInit() {
    try {
      const pubClient = this.redisService.getClient().duplicate();
      const subClient = this.redisService.getClient().duplicate();
      (this.server as any).adapter(createAdapter(pubClient, subClient));
    } catch {
      // Redis adapter optional — falls back to in-memory
    }
  }

  // Sockets carry live match/bracket/friendly updates — same account rules as
  // the REST API: a valid, non-revoked JWT is required to open the connection
  // at all. Room membership itself stays open (matches/tournaments are public
  // to any authenticated user, same as their REST GET counterparts).
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization?.toString().replace(/^Bearer\s+/i, ''));

      if (!token) throw new Error('missing token');

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.jti) {
        const revoked = await this.redisService.get(`revoked:jwt:${payload.jti}`);
        if (revoked) throw new Error('token revoked');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, status: true },
      });
      if (!user || user.status !== 'ACTIVE') throw new Error('user not found or inactive');

      client.data.userId = user.id;
      this.logger.debug(`ws connected client=${client.id} userId=${user.id}`);
    } catch (err) {
      this.logger.warn(`ws rejected client=${client.id}: ${(err as Error).message}`);
      client.disconnect(true);
    }
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
