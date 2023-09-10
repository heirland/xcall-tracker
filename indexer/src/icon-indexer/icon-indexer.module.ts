import { Module } from '@nestjs/common';
import { ICONIndexerService } from './icon-indexer.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NetworkBlock, Transaction } from 'src/entities';
import { RoomModule } from 'src/room/room.module';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, NetworkBlock]), RoomModule],
  providers: [ICONIndexerService],
  exports: [ICONIndexerService],
})
export class ICONIndexerModule {}
