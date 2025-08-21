import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  username: string;

  @Column()
  password: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'int', default: 100 })
  iq: number;

  @Column({ type: 'int', default: 0 })
  level: number;

  @Column({ type: 'int', default: 0 })
  experience: number;

  @Column({ type: 'int', default: 0 })
  gamesPlayed: number;

  @Column({ type: 'int', default: 0 })
  gamesWon: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isOnline: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Вычисляемые поля
  get winRate(): number {
    return this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed) * 100 : 0;
  }

  get ranking(): number {
    return this.balance * 0.4 + this.iq * 0.3 + this.level * 0.2 + this.winRate * 0.1;
  }
}
