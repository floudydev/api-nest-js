import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { RankingService } from '../ranking/ranking.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, AuthenticatedSocket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly rankingService: RankingService,
  ) {}

  // Подключение пользователя
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Получаем токен из query или headers
      const token = client.handshake.auth?.token || 
                   client.handshake.query?.token ||
                   client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      // Верифицируем токен
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Получаем пользователя
      const user = await this.userService.findById(payload.sub);
      if (!user || !user.isActive) {
        client.disconnect();
        return;
      }

      // Сохраняем информацию о подключении
      client.userId = user.id;
      client.username = user.username;
      this.connectedUsers.set(user.id, client);

      // Обновляем статус онлайн
      await this.userService.updateOnlineStatus(user.id, true);

      // Подключаем к личной комнате
      client.join(`user:${user.id}`);

      // Уведомляем о подключении
      client.emit('connected', {
        message: 'Успешное подключение',
        userId: user.id,
        username: user.username,
      });

      // Отправляем обновленный список онлайн пользователей всем
      this.broadcastOnlineUsers();

      console.log(`👤 Пользователь ${user.username} подключился`);
    } catch (error) {
      console.error('Ошибка при подключении:', error);
      client.disconnect();
    }
  }

  // Отключение пользователя
  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      
      // Обновляем статус оффлайн
      await this.userService.updateOnlineStatus(client.userId, false);
      
      // Уведомляем об отключении
      this.broadcastOnlineUsers();
      
      console.log(`👤 Пользователь ${client.username} отключился`);
    }
  }

  // Подписка на обновления рейтинга
  @SubscribeMessage('subscribe:ranking')
  async handleSubscribeRanking(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) return;
    
    client.join('ranking-updates');
    
    // Отправляем текущий рейтинг
    const ranking = await this.rankingService.getRanking({ limit: 10 });
    client.emit('ranking:update', ranking);
  }

  // Отписка от обновлений рейтинга
  @SubscribeMessage('unsubscribe:ranking')
  handleUnsubscribeRanking(@ConnectedSocket() client: AuthenticatedSocket) {
    client.leave('ranking-updates');
  }

  // Подписка на обновления конкретного пользователя
  @SubscribeMessage('subscribe:user')
  handleSubscribeUser(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string },
  ) {
    if (!client.userId) return;
    
    client.join(`user-updates:${data.userId}`);
  }

  // Получение списка онлайн пользователей
  @SubscribeMessage('get:online-users')
  async handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) return;
    
    const onlineUsers = await this.userService.getOnlineUsers();
    client.emit('online-users', onlineUsers);
  }

  // Пинг для проверки соединения
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  // Публичные методы для отправки уведомлений

  // Отправка обновления рейтинга всем подписчикам
  async broadcastRankingUpdate() {
    const ranking = await this.rankingService.getRanking({ limit: 10 });
    this.server.to('ranking-updates').emit('ranking:update', ranking);
  }

  // Отправка обновления пользователя
  async broadcastUserUpdate(userId: string, userData: any) {
    this.server.to(`user-updates:${userId}`).emit('user:update', userData);
    this.server.to(`user:${userId}`).emit('profile:update', userData);
  }

  // Отправка личного уведомления пользователю
  async sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Отправка уведомления всем подключенным пользователям
  async broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Отправка списка онлайн пользователей
  private async broadcastOnlineUsers() {
    const onlineUsers = await this.userService.getOnlineUsers();
    this.server.emit('online-users', onlineUsers);
  }

  // Получение информации о подключенных пользователях
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Проверка, подключен ли пользователь
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
