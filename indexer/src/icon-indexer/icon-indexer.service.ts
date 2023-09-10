import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NetworkBlock, Transaction } from 'src/entities';
import { RoomService } from 'src/room/room.service';
import { configs } from 'src/utils/config';
import { getTxResult, iconService } from 'src/utils/icon-utils';
import {
  filterCallExecutedEvent,
  filterCallMessageEvent,
  filterCallMessageSentEvent,
  filterResponseMessageEvent,
  filterRollbackMessageEvent,
  parseIconCallExecutedEvent,
  parseIconCallMessageEvent,
  parseIconCallMessageSentEvent,
  parseIconResponseMessageEvent,
  parseIconRollbackMessageEvent,
  sendRequest,
} from 'src/utils/utils';
import { Repository } from 'typeorm';

let blockHeight;
@Injectable()
export class ICONIndexerService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepository: Repository<Transaction>,
    @InjectRepository(NetworkBlock)
    private readonly networkBlockRepository: Repository<NetworkBlock>,
    private readonly roomService: RoomService,
  ) {}
  async retryGetTransactionResult(tx, block) {
    try {
      const txResult = await getTxResult(tx.txHash);

      if (txResult) {
        await this.runTransactionHandlers(tx, txResult, block);
      } else {
        setTimeout(
          async () => await this.retryGetTransactionResult(tx, block),
          1000,
        );
      }
    } catch (error) {
      if (error.slice(0, 21) === '[RPC ERROR] Executing') {
        Logger.log(`${error} ${tx.txHash}`);
        setTimeout(
          async () => await this.retryGetTransactionResult(tx, block),
          1000,
        );
      } else {
        Logger.error(
          'icon:Fail to get transaction result %s, %s',
          tx.txHash,
          error,
        );
      }
    }
  }

  async runBlockHandlers(block) {
    for (const tx of block.confirmedTransactionList) {
      if (tx.to) {
        await this.retryGetTransactionResult(tx, block);
      }
    }
  }

  async runTransactionHandlers(transaction, txResult, block) {
    try {
      if (txResult && txResult.status === 1) {
        await this.handleCallMessageSentEvent(txResult);
        await this.handleCallExecutedEvent(txResult);
        await this.handleCallMessageEvent(txResult);
        await this.handleResponseMessageEvent(txResult);
        await this.handleRollbackMessageEvent(txResult);
        Logger.log('icon:runTransactionHandlers success %O');
      }
      // More transaction handlers go here.
    } catch (error) {
      Logger.log('icon:runTransactionHandlers fails %O', error);
    }
  }
  async getBlockByHeight(height) {
    try {
      // Issue: it might unresponsive here on btp!!!
      const block = await iconService.getBlockByHeight(height).execute();
      return block;
    } catch (error) {
      if (error === '[RPC ERROR] E1005:Not found') {
        Logger.log(`icon:Block ${height} not found`);
        return null;
      }

      throw error;
    }
  }

  async retryGetBlockData() {
    try {
      await this.getBlockData();
    } catch (error) {
      // Reading to fast, next block is not available.
      if (error.slice(0, 20) === '[RPC ERROR] NotFound') {
        Logger.error(error);
        setTimeout(async () => await this.retryGetBlockData(), 5000);
      } else {
        // Unknown error, just wait longer to try again.
        Logger.log(
          'icon:Failed to fetch block %d, retry in 1 minutes: %s',
          blockHeight,
          error,
        );
        setTimeout(async () => await this.retryGetBlockData(), 1 * 60 * 1000);
      }
    }
  }

  async getBlockData() {
    const block = await this.getBlockByHeight(blockHeight);
    const timeout = block ? 0 : 5000; // Wait longer for new blocks created.

    if (block) {
      // Logger.log('Block: %O', block);

      if (block.confirmedTransactionList.length > 0) {
        Logger.log(`icon:Received block ${block.height}, ${block.blockHash}`);

        await this.networkBlockRepository.update(
          { nid: process.env.ICON_NETWORK_ID },
          { blockNumber: block.height },
        );

        await this.runBlockHandlers(block);
      }

      ++blockHeight;
    }

    setTimeout(async () => await this.retryGetBlockData(), timeout);
  }

  async start(blockHeightConfig: number, networkId: string) {
    // Continue from last indexed block?
    if (blockHeightConfig === -1) {
      const networkBlock = await this.networkBlockRepository.findOne({
        nid: networkId,
      });
      blockHeight = networkBlock.blockNumber;
    }

    if (blockHeightConfig > 0) {
      blockHeight = blockHeightConfig;
    }

    const block = await iconService.getLastBlock().execute();

    // Start at head block, and when invalid block height.
    if (blockHeightConfig === 0 || blockHeightConfig > block.height) {
      blockHeight = block.height;
    }

    Logger.log('Starting ICON block indexer at block %d...', blockHeight);

    await this.retryGetBlockData();
    Logger.log('Started ICON block indexer');
  }

  async handleCallMessageSentEvent(txResult) {
    const event = filterCallMessageSentEvent(txResult.eventLogs);
    if (event.length > 0) {
      const eventParsed = parseIconCallMessageSentEvent(event);
      const toNetworkParsed = eventParsed._to.split('/');
      const tx = {
        txHashSent: txResult.txHash,
        event: eventParsed._eventName,
        fromAddress: eventParsed._from.toLowerCase(),
        toAddress: eventParsed._to.toLowerCase(),
        sn: eventParsed._sn,
        fromNetwork: configs.NETWORK_LABEL_BERLIN,
        toNetwork: toNetworkParsed[2],
      } as Transaction;

      if (
        process.env.FILTER !== 'true' ||
        tx.toNetwork !== configs.NETWORK_LABEL_SEPOLIA
      ) {
        return;
      }

      const contract = `${tx.fromAddress}_${toNetworkParsed[3].toLowerCase()}`;

      let room = await this.roomService.findOneWithContract(contract);
      if (!room) {
        room = await this.roomService.create({
          contract,
        });
      }

      tx.room = room;

      const txData = await this.txRepository.create(tx);
      await this.txRepository.save(txData);
      await sendRequest({
        key: process.env.KEY,
        contractId: room.id,
        data: JSON.stringify(txData),
      });
    }
  }

  async handleCallExecutedEvent(txResult) {
    const event = filterCallExecutedEvent(txResult.eventLogs);
    if (event.length > 0) {
      const eventParsed = parseIconCallExecutedEvent(event);
      const updateTxInfo = {
        event: eventParsed._eventName,
        message: eventParsed._msg,
        code: eventParsed._code,
      };
      await this.txRepository.update(
        { reqId: eventParsed._reqId },
        { ...updateTxInfo },
      );

      const txResultData = await this.txRepository.findOne({
        where: { reqId: eventParsed._reqId },
        relations: ['room'],
      });

      txResultData &&
        (await sendRequest({
          key: process.env.KEY,
          contractId: txResultData.room.id,
          data: JSON.stringify(txResultData),
        }));
    }
  }

  async handleCallMessageEvent(txResult) {
    const event = filterCallMessageEvent(txResult.eventLogs);
    if (event.length > 0) {
      const eventParsed = parseIconCallMessageEvent(event);
      await this.txRepository.update(
        {
          sn: eventParsed._sn,
        },
        {
          reqId: eventParsed._reqId,
          event: eventParsed._eventName,
          data: eventParsed._data,
        },
      );

      const txResultData = await this.txRepository.findOne({
        where: { sn: eventParsed._sn },
        relations: ['room'],
      });

      txResultData &&
        (await sendRequest({
          key: process.env.KEY,
          contractId: txResultData.room.id,
          data: JSON.stringify(txResultData),
        }));
    }
  }

  async handleResponseMessageEvent(txResult) {
    const event = filterResponseMessageEvent(txResult.eventLogs);
    if (event.length > 0) {
      const eventParsed = parseIconResponseMessageEvent(event);
      await this.txRepository.update(
        {
          sn: eventParsed._sn,
        },
        {
          code: eventParsed._code,
          event: eventParsed._eventName,
          messages: eventParsed._msg,
        },
      );

      const txResultData = await this.txRepository.findOne({
        where: { sn: eventParsed._sn },
        relations: ['room'],
      });

      txResultData &&
        (await sendRequest({
          key: process.env.KEY,
          contractId: txResultData.room.id,
          data: JSON.stringify(txResultData),
        }));
    }
  }

  async handleRollbackMessageEvent(txResult) {
    const event = filterRollbackMessageEvent(txResult.eventLogs);
    if (event.length > 0) {
      const eventParsed = parseIconRollbackMessageEvent(event);
      await this.txRepository.update(
        {
          sn: eventParsed._sn,
        },
        {
          event: eventParsed._eventName,
        },
      );
      const txResultData = await this.txRepository.findOne({
        where: { sn: eventParsed._sn },
        relations: ['room'],
      });

      txResultData &&
        (await sendRequest({
          key: process.env.KEY,
          contractId: txResultData.room.id,
          data: JSON.stringify(txResultData),
        }));
    }
  }
}
