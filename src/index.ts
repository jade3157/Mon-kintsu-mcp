/**
 * Monad MCP Tutorial
 *
 * This file demonstrates how to create a Model Context Protocol (MCP) server
 * that interacts with the Monad blockchain testnet to check MON balances,
 * stake MON, and request unstaking via a smart contract.
 */

// Import necessary dependencies
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createPublicClient, createWalletClient, formatEther, http, parseEther, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Define the Monad testnet chain
const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.RPC_URL || "https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: process.env.EXPLORER_URL || "https://explorer.testnet.monad.xyz",
    },
  },
  testnet: true,
});

// Constants from the original script
const STAKE_ADDRESS = "0x07AabD925866E8353407E67C1D157836f7Ad923e";
const STAKE_ABI = [
  {
    type: "function",
    name: "stake",
    inputs: [],
    outputs: [{ name: "newShares", type: "uint128", internalType: "uint128" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "requestUnlock",
    inputs: [{ name: "shares", type: "uint128", internalType: "uint128" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// Define input schemas for type safety
const getMonBalanceSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});
const stakeMonSchema = z.object({
  amount: z.number().positive().min(0.01, "Amount must be at least 0.01 MON"),
});

// Create a public client to interact with the Monad testnet
const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(process.env.RPC_URL),
});

/**
 * Main function to start the MCP server
 * Uses stdio for communication with LLM clients
 */
async function main() {
  // Validate environment variables
  if (!process.env.PRIVATE_KEY || !process.env.RPC_URL) {
    console.error("Error: Missing required environment variables PRIVATE_KEY or RPC_URL");
    process.exit(1);
  }

  // Validate PRIVATE_KEY format
  const privateKey = process.env.PRIVATE_KEY.startsWith("0x")
    ? process.env.PRIVATE_KEY
    : `0x${process.env.PRIVATE_KEY}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    console.error("Error: PRIVATE_KEY must be a 64-character hexadecimal string prefixed with '0x'");
    process.exit(1);
  }

  // Initialize wallet client
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(process.env.RPC_URL),
  });

  // Initialize the MCP server
  const server = new McpServer({
    name: "monad-staking-mcp",
    version: "1.0.0",
    capabilities: {
      tools: [
        {
          name: "get_mon_balance",
          description: "Get the MON balance for a given wallet address",
          inputSchema: getMonBalanceSchema,
          async execute({ address }: z.infer<typeof getMonBalanceSchema>) {
            try {
              const balance = await publicClient.getBalance({ address: address as `0x${string}` });
              return {
                balance: formatEther(balance),
                unit: "MON",
              };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              throw new Error(`Failed to fetch balance: ${errorMessage}`);
            }
          },
        },
        {
          name: "stake_mon",
          description: "Stake a specified amount of MON to the Kintsu staking contract",
          inputSchema: stakeMonSchema,
          async execute({ amount }: z.infer<typeof stakeMonSchema>) {
            try {
              const amountWei = parseEther(amount.toString());
              const txHash = await walletClient.writeContract({
                address: STAKE_ADDRESS as `0x${string}`,
                abi: STAKE_ABI,
                functionName: "stake",
                value: amountWei,
              });
              const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
              return {
                status: receipt.status === "success" ? "success" : "failed",
                transactionHash: txHash,
                amountStaked: amount,
              };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              throw new Error(`Failed to stake MON: ${errorMessage}`);
            }
          },
        },
        {
          name: "request_unstake",
          description: "Request unstaking of all staked MON from the Kintsu staking contract",
          inputSchema: z.object({}),
          async execute() {
            try {
              // Check staked balance
              const balance = await publicClient.readContract({
                address: STAKE_ADDRESS as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "balanceOf",
                args: [account.address],
              }) as bigint;

              if (balance === 0n) {
                return { status: "failed", error: "No staked tokens to unstake" };
              }

              // Request unstaking
              const txHash = await walletClient.writeContract({
                address: STAKE_ADDRESS as `0x${string}`,
                abi: STAKE_ABI,
                functionName: "requestUnlock",
                args: [balance],
              });
              const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
              return {
                status: receipt.status === "success" ? "success" : "failed",
                transactionHash: txHash,
                amount: formatEther(balance),
              };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              throw new Error(`Failed to request unstake: ${errorMessage}`);
            }
          },
        },
      ],
    },
  });

  // Create a transport layer using standard input/output
  const transport = new StdioServerTransport();

  // Connect the server to the transport
  server.connect(transport);

  console.error("Monad testnet MCP Server running on stdio");
}

// Start the server and handle any fatal errors
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});