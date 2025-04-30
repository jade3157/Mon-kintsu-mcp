# MONAD KINTSU MCP

This project is a Model Context Protocol (MCP) server for interacting with the Kintsu staking contract on the Monad testnet. It allows users to:
- Check MON balances for a given wallet address.
- Stake MON to the Kintsu staking contract.
- Request unstaking of staked MON.

The server is built with TypeScript, Node.js, and the `viem` library for blockchain interactions.
## Prerequisites

- **Node.js**: Version 20.19.0 or later. Use [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions:
  ```bash
  nvm install 20
  nvm use 20
  ```
- **npm**: Included with Node.js.
- **Git**: To clone the repository.
- **Monad Testnet Access**: A valid RPC URL and a private key for a Monad testnet wallet with MON tokens.

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/jade3157/Mon-kuru-mcp.git
   cd monad-mcp-staking
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```
 ## Configuration

1. **Create a `.env` File**:
   Create a file named `.env` in the project root with the following content:
   ```env
   PRIVATE_KEY=0xYour64CharacterHexPrivateKey
   RPC_URL=https://your-monad-testnet-rpc-url
   EXPLORER_URL=https://explorer.testnet.monad.xyz
   ```
   - `PRIVATE_KEY`: A 64-character hexadecimal private key for a Monad testnet wallet (with or without `0x` prefix).
   - `RPC_URL`: A valid Monad testnet RPC URL (contact the Monad team for public endpoints).
   - `EXPLORER_URL`: The Monad testnet explorer URL (optional, defaults to `https://explorer.testnet.monad.xyz`).

   **Important**: Do not share or commit the `.env` file, as it contains sensitive information. The `.gitignore` file prevents accidental commits.

2. **Verify `.env`**:
   Check the `.env` file for correct formatting (no extra spaces or quotes):
   ```bash
   cat .env
   ```
 ## Building the Project

Compile the TypeScript code to JavaScript:


This generates a `build/` directory containing the compiled `index.js` file.

## Running the Server

Start the MCP server:


The server will output:


The server supports the following tools via stdio:
- `get_mon_balance`: Retrieves the MON balance for a specified wallet address.
- `stake_mon`: Stakes a specified amount of MON to the Kintsu staking contract.
- `request_unstake`: Requests unstaking of all staked MON.

Use an MCP-compatible client to interact with these tools.

## Troubleshooting

- **Build Errors**:
  - Check for TypeScript errors: `npx tsc --noEmit`.
  - Reinstall dependencies: `npm install`.

- **Runtime Errors**:
  - **Missing `PRIVATE_KEY` or `RPC_URL`**:
    - Verify `.env` contents: `cat .env`.
    - Ensure `PRIVATE_KEY` is a 64-character hex string and `RPC_URL` is valid.
  - **Invalid `PRIVATE_KEY`**:
    - Generate a new test key:
      ```bash
      node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
      ```
  - **Network Issues**:
    - Confirm `RPC_URL` is accessible. Contact the Monad team for a public testnet RPC URL.

- **Dependency Issues**:
  - Remove and reinstall dependencies:
    ```bash
    rm -rf node_modules package-lock.json
    npm install
    ```

