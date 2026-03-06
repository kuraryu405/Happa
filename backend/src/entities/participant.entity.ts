import { Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { Room } from './room.entity';
import { User } from './user.entity';

@Entity('participants')
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Room, (room) => room.participants)
  room: Room;

  @ManyToOne(() => User, (user) => user.participants)
  user: User;

  @CreateDateColumn()
  joinedAt: Date;
}