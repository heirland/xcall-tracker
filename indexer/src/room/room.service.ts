import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';

import { Room } from './entities/room.entity';

import { CreateRoomDto } from 'src/room/dto/create-room.dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room) private readonly roomRepository: Repository<Room>,
  ) {}

  async findAll() {
    const rooms = await this.roomRepository.find({ relations: ['messages'] });

    return rooms;
  }

  async findOne(id: string) {
    const room = await this.roomRepository.findOne(id);

    if (!room) {
      throw new NotFoundException(`There is no room under id ${id}`);
    }

    return room;
  }

  async findOneWithContract(contract: string) {
    let contractReverse;
    if (contract) {
      contractReverse = contract.split('_').reverse().join('_');
    }
    const room = await this.roomRepository.findOne({
      where: { contract: In([contractReverse, contract]) },
    });
    return room;
  }

  async findOneByName(contract: string) {
    const room = await this.roomRepository.findOne({ contract });

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
