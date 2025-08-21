import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Создание нового пользователя
  async createUser(username: string, password: string): Promise<User> {
    // Проверяем, существует ли пользователь
    const existingUser = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким именем уже существует');
    }

    // Хешируем пароль
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Создаем пользователя
    const user = this.userRepository.create({
      username,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  // Поиск пользователя по имени
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
    });
  }

  // Поиск пользователя по ID
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  // Валидация пароля
  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  // Обновление статуса онлайн
  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.userRepository.update(userId, { isOnline });
  }

  // Обновление баланса
  async updateBalance(userId: string, amount: number): Promise<void> {
    await this.userRepository.increment({ id: userId }, 'balance', amount);
  }

  // Обновление статистики игр
  async updateGameStats(userId: string, won: boolean): Promise<void> {
    const updateData: any = { gamesPlayed: () => 'gamesPlayed + 1' };
    
    if (won) {
      updateData.gamesWon = () => 'gamesWon + 1';
    }

    await this.userRepository.update(userId, updateData);
  }

  // Обновление опыта и уровня
  async updateExperience(userId: string, exp: number): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const newExp = user.experience + exp;
    const newLevel = Math.floor(newExp / 1000); // Каждые 1000 опыта = новый уровень

    await this.userRepository.update(userId, {
      experience: newExp,
      level: newLevel,
    });
  }

  // Получение всех активных пользователей
  async getActiveUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { isActive: true },
      select: ['id', 'username', 'isOnline', 'balance', 'iq', 'level'],
    });
  }

  // Получение онлайн пользователей
  async getOnlineUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { isOnline: true, isActive: true },
      select: ['id', 'username', 'balance', 'iq', 'level'],
    });
  }
}
