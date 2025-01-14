/**
 * Configuration interface for both Deposit and Settlement services
 */
export interface Config {
  /** RPC provider URL for Ethereum network */
  rpcProvider: string;
  /** Admin key for the server */
  serverAdminKey: string;
  /** Settlement contract address */
  settlementContractAddress: string;
  /** MongoDB URI */
  mongoUri: string;
  /** Optional zkWasm RPC URL */
  zkwasmRpcUrl?: string;
  /** Private key for the settler (only required for Settlement service) */
  settlerPrivateKey?: string;
  /** Chain ID */
  chainId?: number;
}

/**
 * Deposit service class that handles L1 to L2 token deposits
 */
export { Deposit } from './deposit';

/**
 * Settlement service class that handles L2 to L1 token settlements
 */
export { Settlement } from './settle';

// Example usage:
/*
const config: Config = {
  rpcProvider: "https://your-rpc-url",
  serverAdminKey: "your-admin-key",
  settlementContractAddress: "0x...",
  mongoUri: "mongodb://...",
  zkwasmRpcUrl: "https://your-zkwasm-rpc", // optional
  settlerPrivateKey: "your-settler-private-key", // required for Settlement service
  chainId: 16,
};

// Start deposit service
const deposit = new Deposit(config);
await deposit.serve();

// Start settlement service
const settlement = new Settlement(config);
await settlement.serve();
*/
