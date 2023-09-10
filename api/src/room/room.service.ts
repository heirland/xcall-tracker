import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';

import { Room } from './entities/room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { contract } from 'web3/lib/commonjs/eth.exports';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room) private readonly roomRepository: Repository<Room>,
  ) {}

  async findAll() {
    const rooms = await this.roomRepository.find({
      relations: ['transactions'],
    });

    return rooms;
  }

  async findOne(id: string) {
    const room = await this.roomRepository.findOne(id);

    if (!room) {
      throw new NotFoundException(`There is no room under id ${id}`);
    }

    return room;
  }

  async findOneWithRelations(id: string) {
    Logger.log(`room id :${id}`);
    const room = await this.roomRepository.findOne({
      where: { id },
      relations: ['transactions'],
    });

    if (!room) {
      throw new NotFoundException(`There is no room under id ${id}`);
    }

    return room;
  }

  async findOneByContracts(contract1st: string, contract2nd: string) {
    const room = await this.roomRepository.findOne({
      where: {
        contract: In([
          `${contract1st.toLowerCase()}_${contract2nd.toLowerCase()}`,
          `${contract2nd.toLowerCase()}_${contract1st.toLowerCase()}`,
        ]),
      },
      relations: ['transactions'],
    });
    return room;
  }

  async create(createRoomDto: CreateRoomDto) {
    const room = await this.roomRepository.create({
      ...createRoomDto,
    });

    return this.roomRepository.save(room);
  }

  async remove(id: string) {
    const room = await this.findOne(id);

    return this.roomRepository.remove(room);
  }
}
