import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NetworkBlock, Transaction } from 'src/entities';
import { RoomService } from 'src/room/room.service';
import { configs } from 'src/utils/config';
import { EVENT_NAMES } from 'src/utils/constant';
import {
  decodeEventLog,
  findEventByName,
  getEVMEventMap,
  getEVMMethodMap,
} from 'src/utils/evm-utils';
import { Repository } from 'typeorm';
import Web3 from 'web3';

import { sendRequest } from 'src/utils/utils';

let networkName;
let networkId;
let web3;
let blockHeight;

@Injectable()
export class EVMIndexerService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepository: Repository<Transaction>,
    @InjectRepository(NetworkBlock)
    private readonly networkBlockRepository: Repository<NetworkBlock>,
    private readonly roomService: RoomService,
  ) {}

  async runTransactionHandlers(txReceipt, block, tx) {
    const events = getEVMEventMap(web3);
    try {
      if (txReceipt && txReceipt.status) {
        await this.handleCallMessageEvent(events, txReceipt);
        await this.handleCallExecutedEvent(events, txReceipt);
        await this.handleCallMessageSentEvent(events, txReceipt, tx);
        await this.handleResponseMessageEvent(events, txReceipt);
        await this.handleRollbackMessageEvent(events, txReceipt);
      } else {
        // handlers don't need tx receipt go here.
      }
    } catch (error) {
      Logger.error(`${networkName}:runTransactionHandlers fails`, error);
    }
  }

  async retryGetTransactionReceipt(tx, block) {
    const receipt = await web3.eth.getTransactionReceipt(tx.hash);

    if (receipt) {
      await this.runTransactionHandlers(receipt, block, tx);
    } else {
      setTimeout(
        async () => await this.retryGetTransactionReceipt(tx, block),
        5000,
      );
    }
  }

  async runBlockHandlers(block) {
    for (const tx of block.transactions) {
      if (
        tx.to &&
        (tx.to.toLowerCase() === configs.XCALL_SECONDARY.toLowerCase() ||
          tx.to.toLowerCase() === configs.BMC_SECONDARY.toLowerCase())
      ) {
        await this.retryGetTransactionReceipt(tx, block);
      }
    }
  }

  async getBlockData() {
    const block = await web3.eth.getBlock(blockHeight, true);
    const timeout = block ? 0 : 3000; // Block time ~3 seconds, wait longer for new blocks created.

    if (block) {
      if (block.transactions?.length > 0) {
        Logger.log(
          `${networkName}:getBlockData received block ${block.number}, ${block.hash}`,
        );

        await this.networkBlockRepository.update(
          { nid: networkId },
          { blockNumber: block.number },
        );
        await this.runBlockHandlers(block);
      }

      ++blockHeight;
    }

    setTimeout(async () => await this.retryGetBlockData(), timeout);
  }

  async retryGetBlockData() {
    try {
      await this.getBlockData();
    } catch (error) {
      // Bad error.message if block isn't available: Error: Returned error: Expect block number from id: BlockId::Number(1577159)
      // is not ready i.e. mining, importing
      if (error.message.indexOf('Expect block number from id') > 0) {
        Logger.log(
          `Block ${blockHeight} is not available. Waiting for a few seconds.`,
        );
        setTimeout(async () => await this.retryGetBlockData(), 3 * 1000);
        return true;
      }

      Logger.error(
        `${networkName}:retryGetBlockData fails to fetch block, retry in 3 seconds`,
        error,
      );
      setTimeout(async () => await this.retryGetBlockData(), 3 * 1000);
    }
  }

  async handleCallMessageEvent(events, txReceipt) {
    const txEvent = findEventByName(
      EVENT_NAMES.CALL_MESSAGE,
      events,
      txReceipt.logs,
    );
    if (txEvent) {
      const ts = decodeEventLog(
        web3,
        events,
        EVENT_NAMES.CALL_MESSAGE,
        txEvent,
      );
      await this.txRepository.update(
        {
          sn: ts._sn.toString(),
        },
        {
          reqId: ts._reqId.toString(),
          event: EVENT_NAMES.CALL_MESSAGE,
          data: ts._data,
        },
      );

      const txResultData = await this.txRepository.findOne({
        where: { sn: ts._sn.toString() },
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

  async handleCallExecutedEvent(events, txReceipt) {
    const txEventExecuted = findEventByName(
      EVENT_NAMES.CALL_EXECUTED,
      events,
      txReceipt.logs,
    );
    if (txEventExecuted) {
      const ts = decodeEventLog(
        web3,
        events,
        EVENT_NAMES.CALL_EXECUTED,
        txEventExecuted,
      );
      await this.txRepository.update(
        {
          reqId: ts._reqId.toString(),
        },
        {
          event: EVENT_NAMES.CALL_EXECUTED,
          code: ts._code.toString(),
          messages: ts._msg,
          txHashExecuted: txReceipt.transactionHash,
        },
      );
      const txResultData = await this.txRepository.findOne({
        where: { reqId: ts._reqId.toString() },
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

  async handleCallMessageSentEvent(events, txReceipt, transaction) {
    const txEventSent = findEventByName(
      EVENT_NAMES.CALL_MESSAGE_SENT,
      events,
      txReceipt.logs,
    );

    if (txEventSent) {
      const ts = decodeEventLog(
        web3,
        events,
        EVENT_NAMES.CALL_MESSAGE_SENT,
        txEventSent,
      );
      const methodAbi = getEVMMethodMap().get('sendCallMessage');
      // get only data without function selector
      const inputData: any = web3.eth.abi.decodeParameters(
        methodAbi.inputs,
        '0x' + transaction.input.slice(10),
      );

      const toNetworkParsed = inputData._to.split('/');

      const tx = {
        txHashSent: transaction.hash,
        event: EVENT_NAMES.CALL_MESSAGE_SENT,
        fromAddress: ts._from.toLowerCase(),
        toAddress: inputData._to,
        sn: ts._sn.toString(),
        fromNetwork: configs.NETWORK_LABEL_SEPOLIA,
        toNetwork: toNetworkParsed[2],
      } as Transaction;

      if (
        process.env.FILTER !== 'true' ||
        tx.toNetwork !== configs.NETWORK_LABEL_BERLIN
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

      const txData = this.txRepository.create(tx);
      await this.txRepository.save(txData);
      await sendRequest({
        key: process.env.KEY,
        contractId: room.id,
        data: JSON.stringify(txData),
      });
    }
  }

  async handleResponseMessageEvent(events, txResult) {
    const txEventResponse = findEventByName(
      EVENT_NAMES.RESPONSE_MESSAGE,
      events,
      txResult.logs,
    );
    if (txEventResponse) {
      const ts = decodeEventLog(
        web3,
        events,
        EVENT_NAMES.RESPONSE_MESSAGE,
        txEventResponse,
      );
      await this.txRepository.update(
        {
          sn: ts._sn.toString(),
        },
        {
          event: EVENT_NAMES.RESPONSE_MESSAGE,
          code: ts._code.toString(),
          messages: ts._msg,
          txHashRollback: txResult.transactionHash,
        },
      );
      const txResultData = await this.txRepository.findOne({
        where: { sn: ts._sn.toString() },
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

  async handleRollbackMessageEvent(events, txResult) {
    const txEventRollback = findEventByName(
      EVENT_NAMES.ROLLBACK_EXECUTED,
      events,
      txResult.logs,
    );
    if (txEventRollback) {
      const ts = decodeEventLog(
        web3,
        events,
        EVENT_NAMES.ROLLBACK_EXECUTED,
        txEventRollback,
      );
      await this.txRepository.update(
        {
          sn: ts._sn.toString(),
        },
        {
          event: EVENT_NAMES.ROLLBACK_EXECUTED,
          txHashRollback: txResult.transactionHash,
        },
      );
      const txResultData = await this.txRepository.findOne({
        where: { sn: ts._sn.toString() },
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

  async start(blockHeightConfig: number, nid: string, web3Config: Web3) {
    const networkBlock = await this.networkBlockRepository.findOne({
      nid,
    });
    web3 = web3Config;
    networkId = nid;
    networkName = networkBlock.networkName;
    if (blockHeightConfig === -1) {
      blockHeight = networkBlock.blockNumber;
    }

    if (blockHeightConfig > 0) {
      blockHeight = blockHeightConfig;
    }

    const height = await web3.eth.getBlockNumber();

    if (blockHeight === 0 || blockHeight > height) {
      blockHeight = height;
    }

    Logger.log(`Starting ${networkName} block indexer at block`, blockHeight);
    await this.retryGetBlockData();
    Logger.log(`Started ${networkName} block indexer`);
  }
}
