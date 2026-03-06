import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Room } from './room.entity';
import { Answer } from './answer.entity';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  questionText: string;

  @Column({ default: 0 })
  yesCount: number;

  @Column({ default: 0 })
  noCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Room, (room) => room.questions)
  room: Room;

  @OneToMany(() => Answer, (answer) => answer.question)
  answers: Answer[];
}