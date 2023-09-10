import { Room } from 'src/room/entities/room.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  txHashSent: string;

  @Column({ unique: true, nullable: true })
  txHashExecuted: string;

  @Column({ unique: true, nullable: true })
  txHashRollback: string;

  @Column({ unique: true })
  sn: string;

  @Column({ nullable: true })
  fromAddress: string;

  @Column({ nullable: true })
  toAddress: string;

  @Column({ nullable: true })
  fromNetwork: string;

  @Column({ nullable: true })
  toNetwork: string;

  @Column()
  event: string;

  @Column({ nullable: true })
  messages: string;

  @Column({ unique: true, nullable: true })
  reqId: string;

  @Column({ nullable: true })
  data: string;

  @Column({ nullable: true })
  code: string;

  @JoinTable()
  @ManyToOne(() => Room, (room: Room) => room.transactions)
  room: Room;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
