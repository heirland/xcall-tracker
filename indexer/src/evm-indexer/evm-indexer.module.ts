import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ICONIndexerModule } from 'src/icon-indexer/icon-indexer.module';
import { EVMIndexerService } from './evm-indexer.service';
import { NetworkBlock, Transaction } from 'src/entities';
import { RoomModule } from 'src/room/room.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, NetworkBlock]),
    ICONIndexerModule,
    RoomModule,
  ],
  providers: [EVMIndexerService],
  exports: [EVMIndexerService],
})
export class EVMIndexerModule {}
