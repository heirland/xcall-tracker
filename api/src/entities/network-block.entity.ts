import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class NetworkBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  blockNumber: number;

  @Column({ unique: true })
  nid: string;

  @Column({ unique: true })
  networkName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
