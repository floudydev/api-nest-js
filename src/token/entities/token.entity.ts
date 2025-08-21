import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum TokenType {
  TEMPORARY = 'temporary',
  ACCESS = 'access',
  REFRESH = 'refresh',
}

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  token: string;

  @Column({
    type: 'enum',
    enum: TokenType,
  })
  type: TokenType;

  @Column({ nullable: true })
  @Index()
  userId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  // Проверка на истечение срока действия
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Проверка на валидность
  get isValid(): boolean {
    return this.isActive && !this.isUsed && !this.isExpired;
  }
}
