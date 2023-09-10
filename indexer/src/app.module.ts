import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

import { UserModule } from './user/user.module';

import { ConfigModule } from '@nestjs/config';
import { RoomModule } from './room/room.module';
import { ICONIndexerModule } from './icon-indexer/icon-indexer.module';
import { EVMIndexerModule } from './evm-indexer/evm-indexer.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
    }),
    UserModule,
    RoomModule,
    ICONIndexerModule,
    EVMIndexerModule,
  ],
  providers: [],
})
export class AppModule {}
