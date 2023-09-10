import IconService from 'icon-sdk-js';
import fs, { readFileSync } from 'fs';
import Web3 from 'web3';
import { ethers } from 'ethers';
import { configs } from './config';
import path from 'path';
import axios from 'axios';
const {
  IconBuilder,
  IconConverter,
  SignedTransaction,
  HttpProvider,
  IconWallet,
} = IconService;

const { CallTransactionBuilder, CallBuilder } = IconBuilder;
const {
  contract,
  PK_BERLIN,
  PK_SEPOLIA,
  NID,
  ICON_RPC_URL,
  EVM_RPC_URL,
  jarPath,
  solPath,
  XCALL_PRIMARY,
  XCALL_SECONDARY,
  NETWORK_LABEL_BERLIN,
  NETWORK_LABEL_SEPOLIA,
  deploymentsPath,
  xcallAbiPath,
} = configs;

const HTTP_PROVIDER = new HttpProvider(ICON_RPC_URL);
const ICON_SERVICE = new IconService(HTTP_PROVIDER);
const ICON_WALLET = IconWallet.loadPrivateKey(PK_BERLIN);

const EVM_SERVICE = new Web3(EVM_RPC_URL);
const EVM_WALLET = EVM_SERVICE.eth.accounts.privateKeyToAccount(PK_SEPOLIA);
EVM_SERVICE.eth.accounts.wallet.add(EVM_WALLET);

/*
 * getIcoNContractByteCode - returns the byte code of the contract
 * @returns {string} - the byte code of the contract
 * @throws {Error} - if there is an error reading the contract
 */
function getIconContractByteCode() {
  try {
    return fs.readFileSync(jarPath).toString('hex');
  } catch (e) {
    console.log(e);
    throw new Error('Error reading contract info');
  }
}

/*
 * isDeployed - checks if the contract is deployed
 * @returns {boolean} - true if the contract is deployed, false otherwise
 * @throws {Error} - if there is an error checking the deployments
 */
function isDeployed() {
  try {
    if (!fs.existsSync(deploymentsPath)) {
      return false;
    }
    return true;
  } catch (e) {
    console.log(e);
    throw new Error('Error checking deployments');
  }
}

/*
 * getEvmContract - returns the EVM contract
 * @param {string} abiPath - the path to the EVM contract abi
 * @returns {object} - the EVM contract
 * @throws {Error} - if there is an error reading the EVM contract
 */
function getEvmContract(abiPath) {
  try {
    const result = {
      abi: null,
      bytecode: null,
    };
    const contract = JSON.parse(
      fs
        .readFileSync(path.resolve(__dirname, '../../src/utils/' + abiPath))
        .toString(),
    );
    result.abi = contract.abi;
    result.bytecode = contract.bytecode;
    return result;
  } catch (e) {
    console.log(e);
    throw new Error('Error reading EVM contract info');
  }
}

/*
 * getDappContract - returns the Dapp contract
 * @returns {object} - the Dapp contract
 * @throws {Error} - if there is an error reading the Dapp contract
 */
function getDappContract() {
  return getEvmContract(solPath);
}

/*
 * getXcallContract - returns the Xcall contract
 * @returns {object} - the Xcall contract
 * @throws {Error} - if there is an error reading the Xcall contract
 */
function getXcallContract() {
  return getEvmContract(xcallAbiPath);
}

/*
 * getIconDappDeploymentsParams - returns the params for the Icon contract
 * @param {string} label - the label of the network
 * @param {string} dappContract - the address of the Dapp contract
 * @returns {object} - the params for the Icon contract
 * @throws {Error} - if there is an error getting the params
 */
function getIconDappDeploymentsParams(label, dappContract) {
  const result = {
    _sourceXCallContract: XCALL_PRIMARY,
    _destinationBtpAddress: getBtpAddress(label, dappContract),
  };
  return result;
}

/*
 * getBtpAddress - returns the BTP address
 * @param {string} label - the label of the network
 * @param {string} address - the address of the contract
 * @returns {string} - the BTP address
 * @throws {Error} - if there is an error getting the BTP address
 */
function getBtpAddress(label, address) {
  return `btp://${label}/${address}`;
}

/*
 * getScoreApi - returns the abi of the contract
 * @param {string} contract - the address of the contract
 * @returns {object} - the abi of the contract
 * @throws {Error} - if there is an error getting the abi
 */
async function getScoreApi(contract) {
  try {
    return await ICON_SERVICE.getScoreApi(contract).execute();
  } catch (e) {
    console.log('error getting abi', e);
    throw new Error('Error getting abi');
  }
}

/*
 * filterEventICON - filters the event logs
 * @param {object} eventlogs - the event logs
 * @param {string} sig - the signature of the event
 * @param {string} address - the address of the contract
 * @returns {object} - the filtered event logs
 * @throws {Error} - if there is an error filtering the event logs
 */
function filterEventICON(eventlogs, sig, address) {
  return eventlogs.filter((event) => {
    return (
      event.indexed &&
      event.indexed[0] === sig &&
      (!address || address === event.scoreAddress)
    );
  });
}

/*
 * filterCallMessageSentEvent - filters the CallMessageSent event logs
 * @param {object} eventlogs - the event logs
 * @returns {object} - the filtered event logs
 * @throws {Error} - if there is an error filtering the event logs
 */
export function filterCallMessageSentEvent(eventlogs) {
  return filterEventICON(
    eventlogs,
    'CallMessageSent(Address,str,int,int)',
    XCALL_PRIMARY,
  );
}

/*
 * filterCallMessage - filters the CallMessage event logs
 * @param {object} eventlogs - the event logs
 * @returns {object} - the filtered event logs
 * @throws {Error} - if there is an error filtering the event logs
 */
export function filterCallMessageEvent(eventlogs) {
  return filterEventICON(
    eventlogs,
    'CallMessage(str,int,int,bytes)',
    XCALL_PRIMARY,
  );
}

/*
 * filterCallExecutedEvent - filters the CallMessage event logs
 * @param {object} eventlogs - the event logs
 * @returns {object} - the filtered event logs
 * @throws {Error} - if there is an error filtering the event logs
 */
export function filterCallExecutedEvent(eventlogs) {
  return filterEventICON(eventlogs, 'CallExecuted(int,int,str)', XCALL_PRIMARY);
}

/*
 * filterResponseMessageEvent - filters the ResponseMessage event logs
 * @param {object} eventlogs - the event logs
 * @returns {object} - the filtered event logs
 * @throws {Error} - if there is an error filtering the event logs
 */
export function filterResponseMessageEvent(eventlogs) {
  return filterEventICON(
    eventlogs,
    'ResponseMessage(int,int,str)',
    XCALL_PRIMARY,
  );
}

/*
 * filterRollbackMessageEvent - filters the RollbackMessage event logs
 * @param {object} eventlogs - the event logs
 * @returns {object} - the filtered event logs
 * @throws {Error} - if there is an error filtering the event logs
 */
export function filterRollbackMessageEvent(eventlogs) {
  return filterEventICON(eventlogs, 'RollbackMessage(int)', XCALL_PRIMARY);
}
/*
 * parseCallMessageSentEvent - parses the CallMessageSent event logs
 * @param {object} event - the event logs
 * @returns {object} - the parsed event logs
 * @throws {Error} - if there is an error parsing the event logs
 */
export function parseIconCallMessageSentEvent(event) {
  const indexed = event[0].indexed || [];
  const data = event[0].data || [];
  return {
    _eventName: indexed[0].split('(')[0],
    _from: indexed[1],
    _to: indexed[2],
    _sn: BigInt(indexed[3]).toString(),
    _nsn: BigInt(data[0]).toString(),
  };
}

/*
 * parseIconCallExecutedEvent - parses the CallExecuted event logs
 * @param {object} event - the event logs
 * @returns {object} - the parsed event logs
 * @throws {Error} - if there is an error parsing the event logs
 */
export function parseIconCallExecutedEvent(event) {
  const indexed = event[0].indexed || [];
  const data = event[0].data || [];
  return {
    _eventName: indexed[0].split('(')[0],
    _reqId: indexed[1].toString(),
    _code: BigInt(data[0]).toString(),
    _msg: data[1],
  };
}

/*
 * parseIconCallMessageEvent - parses the CallMessage event logs
 * @param {object} event - the event logs
 * @returns {object} - the parsed event logs
 * @throws {Error} - if there is an error parsing the event logs
 */
export function parseIconCallMessageEvent(event) {
  const indexed = event[0].indexed || [];
  const data = event[0].data || [];
  return {
    _eventName: indexed[0].split('(')[0],
    _from: indexed[1],
    _to: indexed[2],
    _sn: BigInt(indexed[3]).toString(),
    _reqId: BigInt(data[0]).toString(),
    _data: data[1],
  };
}

/*
 * parseIconResponseMessageEvent - parses the ResponseMessage event logs
 * @param {object} event - the event logs
 * @returns {object} - the parsed event logs
 * @throws {Error} - if there is an error parsing the event logs
 */
export function parseIconResponseMessageEvent(event) {
  const indexed = event[0].indexed || [];
  const data = event[0].data || [];
  return {
    _eventName: indexed[0].split('(')[0],
    _sn: indexed[1].toString(),
    _code: BigInt(data[0]).toString(),
    _msg: data[1],
  };
}

/*
 * parseIconRollbackMessageEvent - parses the RollbackMessage event logs
 * @param {object} event - the event logs
 * @returns {object} - the parsed event logs
 * @throws {Error} - if there is an error parsing the event logs
 */
export function parseIconRollbackMessageEvent(event) {
  const indexed = event[0].indexed || [];
  return {
    _eventName: indexed[0].split('(')[0],
    _sn: BigInt(indexed[1]).toString(),
  };
}

/*
 * sleep - sleeps for the specified time
 * @param {number} ms - the time to sleep
 * @returns {object} - async function
 */
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/*
 * getTxResult - gets the transaction result
 * @param {string} txHash - the transaction hash
 * @returns {object} - the transaction result
 * @throws {Error} - if there is an error getting the transaction result
 */
async function getTxResult(txHash) {
  const maxLoops = 10;
  let loop = 0;
  while (loop < maxLoops) {
    try {
      return await ICON_SERVICE.getTransactionResult(txHash).execute();
    } catch (e) {
      console.log(`txResult (pass ${loop}): ${e}`);
      loop++;
      await sleep(1000);
    }
  }
}

/*
 * filterCallExecutedEventEvm - filters the CallExecuted event logs
 * @param {string} id - the id of the event
 * @returns {object} - the filtered event logs
 * @throws {Error} - if there is an error filtering the event logs
 */
function filterCallExecutedEventEvm(id) {
  const xcallContract = getXcallContractEVM();
  const callMessageFilters = xcallContract.filters.CallExecuted(id);
  return callMessageFilters;
}

/*
 * filterCallMessageEventEvm - filters the CallMessage event logs
 * @param {string} iconDappAddress - the address of the ICON dapp
 * @param {string} evmDappAddress - the address of the EVM dapp
 * @param {string} sn - the serial number cross chain transaction
 * @returns {object} - the filtered event logs
 * @throws {Error} - if there is an error filtering the event logs
 */
function filterCallMessageEventEvm(iconDappAddress, evmDappAddress, sn) {
  const btpAddressSource = getBtpAddress(NETWORK_LABEL_BERLIN, iconDappAddress);
  const xcallContract = getXcallContractEVM();
  const callMessageFilters = xcallContract.filters.CallMessage(
    btpAddressSource,
    evmDappAddress,
    sn,
  );
  return callMessageFilters;
}

/*
 * getVotesFromEVM - gets the votes from the EVM chain
 * @param {string} contractAddress - the address of the contract
 * @returns {object} - the votes
 * @throws {Error} - if there is an error getting the votes
 */
async function getVotesFromEVM(contractAddress) {
  const contractObject = getDappContractObject(contractAddress);
  return await contractObject.getVotes();
}

/*
 * getDappContractObject - gets the dapp contract object
 * @param {string} contractAddress - the address of the contract
 * @returns {object} - the dapp contract object
 * @throws {Error} - if there is an error getting the dapp contract object
 */
function getDappContractObject(contractAddress) {
  try {
    const { abi } = getDappContract();
    return getContractObjectEVM(abi, contractAddress);
  } catch (e) {
    console.log(e);
    throw new Error('Error getting dapp contract');
  }
}

/*
 * getXcallContractEVM - gets the xcall contract object
 * @returns {object} - the xcall contract object
 * @throws {Error} - if there is an error getting the xcall contract object
 */
export function getXcallContractEVM() {
  try {
    const { abi } = getXcallContract();
    return getContractObjectEVM(abi, XCALL_SECONDARY);
  } catch (e) {
    console.log(e);
    throw new Error('Error getting Xcall contract');
  }
}
/*
 * getContractObjectEVM - gets the contract object
 * @param {object} abi - the abi of the contract
 * @param {string} address - the address of the contract
 * @returns {object} - the contract object
 * @throws {Error} - if there is an error getting the contract object
 */
function getContractObjectEVM(abi, address) {
  try {
    const provider = new ethers.JsonRpcProvider(EVM_RPC_URL);
    const signer = new ethers.Wallet(PK_SEPOLIA, provider);
    const contractObject = new ethers.Contract(address, abi, signer);
    return contractObject;
  } catch (e) {
    console.log(e);
    throw new Error('Error getting contract object');
  }
}

/*
 * waitEventEVM - waits for the event to be emitted
 * @param {object} filterCM - the filter for the event
 * @returns {object} - the event logs
 * @throws {Error} - if there is an error waiting for the event
 */
async function waitEventEVM(filterCM) {
  const contract = getXcallContractEVM();
  let height = await contract.getBlockNumber();
  let next = height + 1;
  console.log('block height', height);
  while (true) {
    if (height == next) {
      await sleep(1000);
      next = (await contract.getBlockNumber()) + 1;
      continue;
    }
    for (; height < next; height++) {
      console.log(`waitEventEvmChain: ${height} -> ${next}`);
      const events = await contract.queryFilter(filterCM, height);
      if (events.length > 0) {
        return events;
      }
    }
  }
}

/*
 * executeCallEvm - calls the executeCall method of the xcall contract
 * @param {string} id - the id of the cross chain transaction
 * @param {string} data - the data of the cross chain transaction
 * @returns {object} - the transaction receipt
 * @throws {Error} - if there is an error executing the call
 */
async function executeCallEvm(id, data) {
  try {
    const contract = getXcallContractEVM();
    return await sendSignedTxEVM(contract, 'executeCall', id, data);
  } catch (e) {
    console.log(e);
    throw new Error('Error executing call');
  }
}

/*
 * sendSignedTxEVM - sends the signed transaction
 * @param {object} contract - the contract object
 * @param {string} method - the method to call
 * @param {any[]} args - the arguments of the method
 * @returns {object} - the transaction receipt
 * @throws {Error} - if there is an error sending the signed transaction
 */
async function sendSignedTxEVM(contract, method, ...args) {
  const txParams = { gasLimit: 15000000 };

  const tx = await contract[method](...args, txParams);
  const receipt = await tx.wait(1);
  return receipt;
}

/*
 * callDappContractMethod - calls the dapp contract method
 * @param {string} method - the method to call
 * @param {string} contract - the address of the contract
 * @param {boolean} useRollback - whether to use rollback
 * @returns {object} - the transaction receipt
 * @throws {Error} - if there is an error calling the dapp contract method
 */
async function callDappContractMethod(method, contract, useRollback = false) {
  try {
    const fee = await getFeeFromIcon(useRollback);

    const txObj = new CallTransactionBuilder()
      .from(ICON_WALLET.getAddress())
      .to(contract)
      .stepLimit(IconConverter.toBigNumber(20000000))
      .nid(IconConverter.toBigNumber(NID))
      .nonce(IconConverter.toBigNumber(1))
      .version(IconConverter.toBigNumber(3))
      .timestamp(new Date().getTime() * 1000)
      .method(method)
      .value(fee)
      .build();

    const signedTx = new SignedTransaction(txObj, ICON_WALLET);
    return await ICON_SERVICE.sendTransaction(signedTx).execute();
  } catch (e) {
    console.log(e);
    throw new Error('Error calling contract method');
  }
}

/*
 * voteYesFromIcon - calls the voteYes method of the dapp contract
 * @param {string} contract - the address of the contract
 * @param {boolean} useRollback - whether to use rollback
 * @returns {object} - the transaction receipt
 * @throws {Error} - if there is an error voting yes
 */
async function voteYesFromIcon(contract, useRollback = false) {
  try {
    return await callDappContractMethod('voteYes', contract, useRollback);
  } catch (e) {
    console.log(e);
    throw new Error('Error voting yes');
  }
}

/*
 * voteNoFromIcon - calls the voteNo method of the dapp contract
 * @param {string} contract - the address of the contract
 * @param {boolean} useRollback - whether to use rollback
 * @returns {object} - the transaction receipt
 * @throws {Error} - if there is an error voting no
 */
async function voteNoFromIcon(contract, useRollback = false) {
  try {
    return await callDappContractMethod('voteNo', contract, useRollback);
  } catch (e) {
    console.log(e);
    throw new Error('Error voting no');
  }
}

/*
 * getFeeFromIcon - calls the getFee method of the xcall contract
 * @param {boolean} useRollback - whether to use rollback
 * @returns {object} - the transaction receipt
 * @throws {Error} - if there is an error getting the fee
 */
async function getFeeFromIcon(useRollback = false) {
  try {
    const params = {
      _net: NETWORK_LABEL_SEPOLIA,
      _rollback: useRollback ? '0x1' : '0x0',
    };

    const txObj = new CallBuilder()
      .to(XCALL_PRIMARY)
      .method('getFee')
      .params(params)
      .build();

    return await ICON_SERVICE.call(txObj).execute();
  } catch (e) {
    console.log('error getting fee', e);
    throw new Error('Error getting fee');
  }
}

/*
 * strToHex - converts a string to hex
 * @param {string} str - the string to convert
 * @returns {string} - the hex string
 * @throws {Error} - if there is an error converting the string
 */
function strToHex(str) {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += '' + str.charCodeAt(i).toString(16);
  }
  return '0x' + hex;
}

/*
 * strToHexPadded - converts a string to hex and pads it
 * @param {string} str - the string to convert
 * @returns {string} - the hex string
 * @throws {Error} - if there is an error converting the string
 */
function strToHexPadded(str) {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += '' + str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return '0x' + hex;
}

export function sendRequest(event) {
  return axios.post(process.env.API_URL, event);
}
