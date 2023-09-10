import { Body, Controller, Post } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { EventDto } from './dto/event.dto';

@Controller('event')
export class ChatController {
  constructor(private readonly chat: ChatGateway) {}

  @Post('/')
  async newEvent(@Body() event: EventDto) {
    if (event.key === process.env.KEY) {
      this.chat.sendMessage(event.data, event.contractId);
    }
  }
}
