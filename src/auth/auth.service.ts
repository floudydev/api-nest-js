import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { TokenService } from '../token/token.service';
import { User } from '../user/entities/user.entity';
import {
  LoginDto,
  LoginWithTokenDto,
  RegisterDto,
  RefreshTokenDto,
  ValidateTokenDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  // Вход по логину и паролю
  async login(loginDto: LoginDto): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const { username, password } = loginDto;

    // Находим пользователя
    const user = await this.userService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Неверные учетные данные');
    }

    // Проверяем пароль
    const isPasswordValid = await this.userService.validatePassword(user, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверные учетные данные');
    }

    // Проверяем активность аккаунта
    if (!user.isActive) {
      throw new UnauthorizedException('Аккаунт заблокирован');
    }

    // Создаем токены
    const accessToken = await this.tokenService.createAccessToken(user);
    const refreshToken = await this.tokenService.createRefreshToken(user);

    // Обновляем статус онлайн
    await this.userService.updateOnlineStatus(user.id, true);

    // Удаляем пароль из ответа
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as User,
      accessToken,
      refreshToken,
    };
  }

  // Вход по временному токену
  async loginWithToken(loginWithTokenDto: LoginWithTokenDto): Promise<{ message: string }> {
    const { token } = loginWithTokenDto;

    // Проверяем временный токен
    const isValid = await this.tokenService.validateTemporaryToken(token);
    if (!isValid) {
      throw new UnauthorizedException('Неверный или истекший токен');
    }

    return { message: 'Токен валиден, можно использовать для регистрации' };
  }

  // Регистрация по токену
  async register(registerDto: RegisterDto): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const { username, password, registrationToken } = registerDto;

    // Проверяем токен регистрации
    const isTokenValid = await this.tokenService.validateTemporaryToken(registrationToken);
    if (!isTokenValid) {
      throw new BadRequestException('Неверный или истекший токен регистрации');
    }

    // Создаем пользователя
    const user = await this.userService.createUser(username, password);

    // Создаем токены
    const accessToken = await this.tokenService.createAccessToken(user);
    const refreshToken = await this.tokenService.createRefreshToken(user);

    // Обновляем статус онлайн
    await this.userService.updateOnlineStatus(user.id, true);

    // Удаляем пароль из ответа
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as User,
      accessToken,
      refreshToken,
    };
  }

  // Получение временного токена
  async getTemporaryToken(): Promise<{ token: string; expiresIn: string }> {
    const token = await this.tokenService.createTemporaryToken();
    return {
      token,
      expiresIn: '10 минут',
    };
  }

  // Обновление токена
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken, password } = refreshTokenDto;

    // Валидируем refresh токен
    const user = await this.tokenService.validateRefreshToken(refreshToken);
    if (!user) {
      throw new UnauthorizedException('Неверный refresh токен');
    }

    // Проверяем пароль для дополнительной безопасности
    const isPasswordValid = await this.userService.validatePassword(user, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный пароль');
    }

    // Инвалидируем старый refresh токен
    await this.tokenService.invalidateRefreshToken(refreshToken);

    // Создаем новые токены
    const newAccessToken = await this.tokenService.createAccessToken(user);
    const newRefreshToken = await this.tokenService.createRefreshToken(user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  // Валидация токена
  async validateToken(validateTokenDto: ValidateTokenDto): Promise<{ isValid: boolean; user?: any }> {
    const { token } = validateTokenDto;

    try {
      // Сначала пробуем как access токен
      const payload = await this.tokenService.validateAccessToken(token);
      const user = await this.userService.findById(payload.sub);
      
      if (!user || !user.isActive) {
        return { isValid: false };
      }

      return {
        isValid: true,
        user: {
          id: user.id,
          username: user.username,
          balance: user.balance,
          iq: user.iq,
          level: user.level,
        },
      };
    } catch (error) {
      // Если не access токен, проверяем как обычный токен
      const exists = await this.tokenService.tokenExists(token);
      return { isValid: exists };
    }
  }

  // Выход из системы
  async logout(userId: string, refreshToken: string): Promise<{ message: string }> {
    // Обновляем статус оффлайн
    await this.userService.updateOnlineStatus(userId, false);
    
    // Инвалидируем refresh токен
    await this.tokenService.invalidateRefreshToken(refreshToken);

    return { message: 'Успешный выход из системы' };
  }
}
