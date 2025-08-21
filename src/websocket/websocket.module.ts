import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { UserModule } from '../user/user.module';
import { RankingModule } from '../ranking/ranking.module';

@Module({
  imports: [
    JwtModule.register({}),
    UserModule,
    RankingModule,
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class WebsocketModule {}
