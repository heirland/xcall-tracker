<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>

# xCall Indexer

This module is using to crawl data from blockchain and index the transaction of the DApps using xCall's methods/events

## Features

- Crawling data from blockchain
- Indexing transaction event to centralize database
- Sending the events to API
## Installation

```bash
$ yarn install
```

## Example of .env file
```bash
JWT_ACCESS_SECRET=ACCESS_SECRET
JWT_REFRESH_SECRET=REFRESH_SECRET
JWT_ACCESS_EXPIRE=60m
JWT_REFRESH_EXPIRE=30d
DB_NAME=xcall-tracker
DB_HOST=YOUR_HOST
DB_PORT=5432
DB_USERNAME=USERNAME
DB_PASS=PASSWORD
PK_BERLIN= YOUR_WALLET_PRIVATE_KEY
PK_SEPOLIA= YOUR_WALLET_PRIVATE_KEY
ICON_RPC_URL=https://berlin.net.solidwallet.io/api/v3
## -1 start from the block height retrieval from database, 0 start from latest block height retrieval from blockchain, > 0 start from the block that you set
ICON_BLOCK_HEIGHT=-1

ICON_NETWORK_ID=0x7
## this key using for verify the request from the indexer app
KEY=YOUR_KEY
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/ffbf8ebe228f4758ae82e175640275e0
SEPOLIA_BLOCK_HEIGHT=-1
SEPOLIA_NETWORK_ID=0xaa36a7
## only filter the events of icon and sepolia
FILTER=true
## the url of API project
API_URL=http://localhost:3500/event

```

## Running the app

```bash
# start docker containers
$ docker-compose up

# development
$ yarn run start
```

