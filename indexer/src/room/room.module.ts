import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from 'src/user/user.module';

import { Room } from './entities/room.entity';
import { RoomService } from './room.service';

@Module({
  imports: [TypeOrmModule.forFeature([Room]), UserModule],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
