import { Inject, Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { Kysely } from 'kysely';

import { DB_TOKEN } from '../../common/db.module';
import type { DB } from '../../common/db.types';

/**
 * Live device sync.
 *
 * Rooms:
 *   - user:{userId}  → every connection from this user joins this room.
 *
 * Outbound events:
 *   - azan.play, quran.play, settings.changed, device.kicked
 *
 * Inbound events:
 *   - ping, playback.ack, presence
 *
 * Auth: token passed via auth.token query param; verified on connection.
 * Across multiple backend pods, the Redis adapter (set up in main.ts) ensures
 * a publish on one pod reaches sockets connected to all other pods.
 */
@WebSocketGateway({ namespace: 'v1/sync', cors: { origin: '*' } })
export class SyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly log = new Logger(SyncGateway.name);

  constructor(
    private readonly jwt: JwtService,
    @Inject(DB_TOKEN) private readonly db: Kysely<DB>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth?.token as string) ?? (client.handshake.query?.token as string);
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        publicKey: process.env.JWT_PUBLIC_KEY_PATH ? require('fs').readFileSync(process.env.JWT_PUBLIC_KEY_PATH, 'utf8') : 'dev-only-secret',
        algorithms: [process.env.JWT_PUBLIC_KEY_PATH ? 'RS256' : 'HS256'],
      });
      const userId = payload.sub;
      client.data.userId = userId;
      await client.join(`user:${userId}`);
      this.log.log(`WS connect user=${userId} sid=${client.id}`);
    } catch (err) {
      this.log.warn(`WS auth failed sid=${client.id}: ${(err as Error).message}`);
      client.emit('device.kicked', { reason: 'auth_failed' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.log.log(`WS disconnect sid=${client.id}`);
  }

  async emitToUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  @SubscribeMessage('ping')
  onPing(@ConnectedSocket() client: Socket, @MessageBody() body: { ts: number }) {
    client.emit('pong', { clientTs: body?.ts, serverTs: Date.now() });
  }

  @SubscribeMessage('playback.ack')
  async onAck(@ConnectedSocket() client: Socket, @MessageBody() body: { playbackId: string; status: string; deviceId?: string; err?: string }) {
    const userId = client.data.userId as string;
    if (!userId) return;
    await this.db
      .insertInto('playback_events')
      .values({
        user_id: userId,
        device_id: body.deviceId ?? null,
        playback_id: body.playbackId,
        kind: 'azan',
        status: (body.status === 'played' ? 'played' : 'failed') as any,
        error: body.err ?? null,
        fired_at: new Date(),
      })
      .execute();
  }

  @SubscribeMessage('presence')
  async onPresence(@ConnectedSocket() client: Socket, @MessageBody() body: { deviceId: string; batteryLevel?: number; network?: string }) {
    const userId = client.data.userId as string;
    if (!userId || !body.deviceId) return;
    await this.db.updateTable('devices').set({ last_seen_at: new Date() }).where('id', '=', body.deviceId).where('user_id', '=', userId).execute();
  }
}
