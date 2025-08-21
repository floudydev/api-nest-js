import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { Token } from './entities/token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token]),
    JwtModule.register({}), // Конфигурация будет в сервисе
  ],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
