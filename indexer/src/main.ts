import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import Web3 from 'web3';
import { EVMIndexerService } from './evm-indexer/evm-indexer.service';
import { ICONIndexerService } from './icon-indexer/icon-indexer.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const options = new DocumentBuilder()
    .setTitle('Realtime Indexer')
    .setDescription('Chat created using Nest.js + Websockets')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);

  switch (process.env.NETWORK) {
    case 'icon':
      const iconIndexer = await app.get(ICONIndexerService);
      iconIndexer.start(
        Number(process.env.ICON_BLOCK_HEIGHT),
        process.env.ICON_NETWORK_ID,
      );
      break;
    case 'sepolia':
      const web3 = new Web3(process.env.SEPOLIA_RPC_URL);
      const evmIndexer = await app.get(EVMIndexerService);
      evmIndexer.start(
        Number(process.env.SEPOLIA_BLOCK_HEIGHT),
        process.env.SEPOLIA_NETWORK_ID,
        web3,
      );
    default:
      break;
  }
}
bootstrap();
