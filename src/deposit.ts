import { ZKWasmAppRpc, PlayerConvention } from "zkwasm-minirollup-rpc";
import { ethers, EventLog } from "ethers";
import { BigNumber } from '@ethersproject/bignumber';
import abiData from './utils/Proxy.json' assert { type: 'json' };
import mongoose from 'mongoose';

// Mongoose Schema and Model for saving tx hashes and state
const txSchema = new mongoose.Schema({
  txHash: { type: String, required: true, unique: true },
  state: { type: String, enum: ['pending', 'in-progress', 'completed', 'failed'], default: 'pending' },
  timestamp: { type: Date, default: Date.now },
  l1token: { type: String, required: true },
  address: { type: String, required: true },
  pid_1: { type: BigInt, required: true },
  pid_2: { type: BigInt, required: true },
  amount: { type: BigInt, required: true },
});

const TxHash = mongoose.model('TxHash', txSchema);

export class Deposit {
  private rpc: ZKWasmAppRpc;
  private admin: PlayerConvention;
  private provider: ethers.JsonRpcProvider;
  private proxyContract: ethers.Contract;
  private config: {
    rpcProvider: string;
    serverAdminKey: string;
    settlementContractAddress: string;
    mongoUri: string;
    zkwasmRpcUrl?: string;
  };

  constructor(config: {
    rpcProvider: string;
    serverAdminKey: string;
    settlementContractAddress: string;
    mongoUri: string;
    zkwasmRpcUrl?: string;
  }) {
    this.config = config;
    this.rpc = new ZKWasmAppRpc(config.zkwasmRpcUrl || "https://disco.0xrobot.cx:8085");
    this.provider = new ethers.JsonRpcProvider(config.rpcProvider);
    
    const DEPOSIT = 9n;
    const WITHDRAW = 8n;
    this.admin = new PlayerConvention(config.serverAdminKey, this.rpc, DEPOSIT, WITHDRAW);
    this.proxyContract = new ethers.Contract(config.settlementContractAddress, abiData.abi, this.provider);
  }

  private createCommand(nonce: bigint, command: bigint, feature: bigint) {
    return (nonce << 16n) + (feature << 8n) + command;
  }

  private async createPlayer(player: PlayerConvention) {
    try {
      const CREATE_PLAYER = 1n;
      const state = await this.rpc.sendTransaction(
        new BigUint64Array([this.createCommand(0n, CREATE_PLAYER, 0n), 0n, 0n, 0n]),
        player.processingKey
      );
      return state;
    } catch(e) {
      if(e instanceof Error) {
        console.log(e.message);
      }
      console.log("create Player error");
    }
  }

  private async findTxByHash(txHash: string) {
    return await TxHash.findOne({ txHash });
  }

  private async updateTxState(txHash: string, state: string) {
    try {
      await TxHash.updateOne({ txHash }, { state });
      console.log(`Transaction state updated to: ${state} for txHash: ${txHash}`);
    } catch (error) {
      console.error(`Failed to update tx state for txHash ${txHash}: ${(error as Error).message}`);
    }
  }

  private async processTopUpEvent(event: EventLog) {
    try {
      const eventLog = event as EventLog;
      const [l1token, address, pid_1, pid_2, amount] = eventLog.args;

      console.log(`TopUp event received: pid_1=${pid_1.toString()}, pid_2=${pid_2.toString()}, amount=${amount.toString()} wei`);

      let tokenindex: bigint = -1n;
      const tokens = await this.proxyContract.allTokens();
      for (let i = 0; i < tokens.length; i++) {
        if (l1token === tokens[i].token_uid) {
          tokenindex = BigInt(i);
          break;
        }
      }
      
      if (tokenindex === -1n) {
        console.log('Skip: token not found in contract:', l1token);
        return;
      }

      let tx = await this.findTxByHash(event.transactionHash);
      
      if (!tx) {
        console.log(`Transaction hash not found: ${event.transactionHash}`);
        tx = new TxHash({
          txHash: event.transactionHash,
          state: 'pending',
          l1token,
          address,
          pid_1,
          pid_2,
          amount,
        });
        await tx.save();
        console.log(`Transaction hash and details saved: ${event.transactionHash}`);
      } else {
        console.log(`TxHash ${event.transactionHash} already exists in the DB with state: ${tx.state}`);
      }

      if (tx && tx.state === 'pending') {
        try {
          await this.updateTxState(event.transactionHash, 'in-progress');
          console.log('Transaction state updated to "in-progress".');

          let amountInEther = amount / BigInt(10 ** 18);
          console.log("Deposited amount (in ether): ", amountInEther);
          if (amountInEther < 1n) {
            console.error(`--------------Skip: Amount must be at least 1 Titan (in ether instead of wei) ${event.transactionHash}\n`);
          } else {
            await this.admin.deposit(pid_1, pid_2, tokenindex, amountInEther);
            console.log(`------------------Deposit successful! ${event.transactionHash}\n`);
          }

          await this.updateTxState(event.transactionHash, 'completed');
        } catch (error) {
          console.error('Error during deposit:', error);
          await this.updateTxState(event.transactionHash, 'failed');
        }
      } else if (tx.state === 'in-progress'){
        while(1) {
          console.log("in-progress, something wrong happen, should manuel check retry or skip tx");
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else {
        if (tx.state != 'completed') {
          while(1) {
            console.log("shouldn't arrive here");
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (error) {
      console.error('Error processing TopUp event:', error);
    }
  }

  async serve() {
    const dbName = `${this.config.settlementContractAddress}_deposit`;
    
    // Connect to MongoDB
    await mongoose.connect(this.config.mongoUri, {
      dbName,
    });
    console.log('Deposit service started - MongoDB connected');

    // Initialize admin
    console.log("Installing admin...");
    await this.createPlayer(this.admin);

    // Get all past TopUp events
    try {
      const filter = this.proxyContract.filters.TopUp();
      const events = await this.proxyContract.queryFilter(filter, 0, 'latest');
      console.log(`Found ${events.length} TopUp events.`);

      for (const event of events) {
        const eventLog = event as EventLog;
        await this.processTopUpEvent(eventLog);
      }
    } catch (error) {
      console.error('Error retrieving TopUp events:', error);
    }

    // Listen for new TopUp events
    this.proxyContract.on('TopUp', async (l1token: string, address: string, pid_1: BigNumber, pid_2: BigNumber, amount: BigNumber, event: any) => {
      console.log(`New TopUp event detected: ${event.log.transactionHash}`);
      await this.processTopUpEvent(event.log);
    });
  }
}