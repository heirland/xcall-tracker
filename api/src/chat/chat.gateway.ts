import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { RoomService } from 'src/room/room.service';
import { JoinRoomDto } from './dto/join-room.dto';

@UsePipes(new ValidationPipe())
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'],
    credentials: true,
  },
})
export class ChatGateway {
  constructor(private readonly roomService: RoomService) {}

  @WebSocketServer()
  server: Server;

  onModuleInit() {
    this.server.on('connection', (socket) => {
      Logger.log(socket.id, 'Connected');
    });
  }
  connectedUsers: Map<string, string> = new Map();

  async handleConnection(client: Socket): Promise<void> {
    const roomId = client.handshake.query.roomId.toString();

    this.connectedUsers.set(client.id, roomId);

    return this.onRoomJoin(client, { roomId });
  }

  async handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('join')
  async onRoomJoin(client: Socket, joinRoomDto: JoinRoomDto) {
    const { roomId } = joinRoomDto;
    const limit = 10;

    const room = await this.roomService.findOneWithRelations(roomId);
    const transactions = room.transactions.slice(limit * -1);

    client.join(roomId);
    client.emit('message', transactions);
  }
  async sendMessage(message: string, room: string) {
    Logger.log(`---------${room}-------`);
    this.server.sockets.to(room).emit('transaction', message);
  }
}
