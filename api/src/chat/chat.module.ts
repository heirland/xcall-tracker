import { Module } from '@nestjs/common';

import { ChatGateway } from './chat.gateway';

import { RoomModule } from 'src/room/room.module';
import { ChatController } from './chat.controller';

@Module({
  imports: [RoomModule],
  controllers: [ChatController],
  providers: [ChatGateway],
})
export class ChatModule {}
