<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>

# xCall API

I decided to get familiar with websockets in [Nest.js](https://github.com/nestjs/nest), realtime app to listen your DApp

## Features
*In this version this API support only two network such as **ICON** (Berlin) - **Ethereum** (Sepolia)*
- Get your DApp transactions
- Join a Room to listen your realtime transactions by dapp address


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
## this key using for verify the request from the indexer app
KEY=YOUR_KEY
```

## Running the app

# Development
```bash
$ yarn start
```

