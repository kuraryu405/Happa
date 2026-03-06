import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Participant } from './participant.entity';
import { Question } from './question.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roomKey: string;
  //if game is ended, roomKey is null or add NULLcolumn (boolean)

  @Column({ nullable: true })
  context: string;

  @Column()
  createdBy: string; 

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  isGameEnded: boolean;
  
  @OneToMany(() => Participant, (participant) => participant.room)
  participants: Participant[];

  @OneToMany(() => Question, (question) => question.room)
  questions: Question[];
}