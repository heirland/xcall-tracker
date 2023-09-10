import evmAbi from '../evm-indexer/evm-xcall-abi.json';
const evmEventMap = new Map();
const evmFunctionMap = new Map();

// Build a map of [event hash, event]
export function getEventInfoFromAbi(web3, contractAbi) {
  const events = contractAbi.filter((e) => e.type === 'event');
  const result = [];

  for (const event of events) {
    const info = {
      hash: web3.eth.abi.encodeEventSignature(event),
      event,
    };

    result.push(info);
  }
  return result;
}

export function findEventByName(eventName, eventMap, eventLogs) {
  const eventDef = eventMap.get(eventName);

  if (eventDef) {
    for (const event of eventLogs) {
      if (eventDef.hash === event.topics[0]) {
        return event;
      }
    }
  }
}

export function decodeEventLog(web3, eventMap, eventName, eventData) {
  const eventDef = eventMap.get(eventName);
  return web3.eth.abi.decodeLog(
    eventDef.event.inputs,
    eventData.data,
    eventData.topics.slice(1),
  );
}

export function getEVMMethodMap() {
  if (evmFunctionMap.size === 0) {
    const methods = evmAbi.filter((e) => e.type === 'function');

    for (const method of methods) {
      evmFunctionMap.set(method.name, method);
    }
  }
  return evmFunctionMap;
}

export function getEVMEventMap(web3) {
  if (evmEventMap.size === 0) {
    const events = getEventInfoFromAbi(web3, evmAbi);

    for (const event of events) {
      evmEventMap.set(event.event.name, event);
    }
  }

  return evmEventMap;
}
