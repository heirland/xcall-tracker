import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Transaction } from 'src/entities';

@Entity()
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  contract: string;

  @OneToMany(() => Transaction, (transaction: Transaction) => transaction.room)
  transactions: Array<Transaction>;
}
