import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  LoginDto,
  LoginWithTokenDto,
  RegisterDto,
  RefreshTokenDto,
  ValidateTokenDto,
} from './dto/auth.dto';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Вход по логину и паролю
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // Вход по временному токену
  @Post('login/token')
  @HttpCode(HttpStatus.OK)
  async loginWithToken(@Body() loginWithTokenDto: LoginWithTokenDto) {
    return this.authService.loginWithToken(loginWithTokenDto);
  }

  // Регистрация по токену
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Получение временного токена
  @Post('token/temporary')
  @HttpCode(HttpStatus.OK)
  async getTemporaryToken() {
    return this.authService.getTemporaryToken();
  }

  // Обновление токена
  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  // Валидация токена
  @Post('token/validate')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Body() validateTokenDto: ValidateTokenDto) {
    return this.authService.validateToken(validateTokenDto);
  }

  // Выход из системы
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req, @Body() body: { refreshToken: string }) {
    return this.authService.logout(req.user.sub, body.refreshToken);
  }
}
