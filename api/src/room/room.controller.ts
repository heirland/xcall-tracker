import { Controller, Get, Logger, Param } from '@nestjs/common';
import { RoomService } from './room.service';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.roomService.findOne(id);
  }

  @Get()
  async find() {
    return this.roomService.findAll();
  }

  @Get(':contract1st/:contract2nd')
  async findByContracts(
    @Param('contract1st') contract1st: string,
    @Param('contract2nd') contract2nd: string,
  ) {
    return this.roomService.findOneByContracts(contract1st, contract2nd);
  }
}
