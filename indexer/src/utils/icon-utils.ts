import { Logger } from '@nestjs/common';
import IconService from 'icon-sdk-js';
import Wallet from 'icon-sdk-js/build/Wallet';

export const {
  HttpProvider,
  IconAmount,
  IconBuilder,
  IconConverter,
  SignedTransaction,
  IconWallet,
} = IconService;
// Create an instance of HttpProvider and IconService
const httpProvider = new HttpProvider(
  'https://berlin.net.solidwallet.io/api/v3',
);

export const iconService = new IconService(httpProvider);

// Define a function to get the balance of a given wallet address
export async function getBalance(walletAddress: string): Promise<number> {
  // Get the balance of the wallet address
  const balanceRaw = await iconService.getBalance(walletAddress).execute();
  const balance = IconAmount.fromLoop(
    balanceRaw,
    IconAmount.Unit.LOOP.toString(),
  ).toString();
  return Number(balance);
}

export async function getBalanceOf(
  wallet: Wallet,
  contractAddress: string,
  ownerAddress: string,
): Promise<number> {
  const params = {
    _owner: ownerAddress,
  };
  return callTransaction(wallet, contractAddress, 'balanceOf', params, true);
}

export async function getLastestBlockTimestamp(): Promise<number> {
  const block = await iconService.getLastBlock().execute();
  return Number(block.timeStamp);
}
export function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function getMinutesBetweenDates(startDate: Date, endDate: Date) {
  const diff = endDate.getTime() - startDate.getTime();
  return diff / 60000;
}

export function isWallet(address): boolean {
  if (address && address.length >= 42 && address.startsWith('hx')) {
    return true;
  }
  false;
}

export async function callTransaction(
  wallet: Wallet,
  to: string,
  method: string,
  params: any = null,
  isNumber = false,
) {
  try {
    const transaction = new IconBuilder.CallBuilder()
      .from(wallet.getAddress())
      .to(to)
      .method(method)
      .params(params)
      .build();

    const txResult = await iconService.call(transaction).execute();
    if (isNumber) return Number(txResult || 0);
    else return txResult;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function sendTransaction(
  wallet: Wallet,
  value: number,
  to: string,
  method: string,
  params: any = null,
): Promise<any> {
  try {
    const transaction = new IconBuilder.CallTransactionBuilder()
      .from(wallet.getAddress())
      .to(to)
      .value(value)
      .stepLimit(process.env.ICON_TRANSACTION_STEP_LIMIT)
      .nid(process.env.ICON_SERVICE_TARGET_NETWORK_ID)
      .version(IconConverter.toBigNumber('3'))
      .timestamp(IconConverter.toHexNumber(new Date().getTime() * 1000))
      .method(method)
      .params(params)
      .build();

    const signed_transaction = new SignedTransaction(transaction, wallet);

    const txHash = await iconService
      .sendTransaction(signed_transaction)
      .execute();
    await sleep(5000);
    const result = await getTxResult(txHash);
    return result;
  } catch (error) {
    Logger.error('sendTransaction failed', error);
    throw error;
  }
}

export async function getTxResult(txHash: string) {
  // await sleep(5000);
  try {
    const result = await iconService.getTransactionResult(txHash).execute();
    return result;
  } catch (err) {
    Logger.error('getTxResult failed', err);
    throw err;
  }
}

export function workerLogGenerate(workerTag: string, message: string): string {
  return `${workerTag}: ${message}`;
}
