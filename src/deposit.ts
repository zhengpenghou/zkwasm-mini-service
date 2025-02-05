import { ZKWasmAppRpc, PlayerConvention } from "zkwasm-minirollup-rpc";
import { ethers, EventLog } from "ethers";
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
  private provider: ethers.WebSocketProvider;
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
    this.rpc = new ZKWasmAppRpc(config.zkwasmRpcUrl || "http://localhost:3000");
    
    // 将 HTTP URL 转换为 WebSocket URL
    const wsUrl = config.rpcProvider.replace('http', 'ws');
    this.provider = new ethers.WebSocketProvider(wsUrl);
    
    const DEPOSIT = 9n;
    const WITHDRAW = 8n;
    this.admin = new PlayerConvention(config.serverAdminKey, this.rpc, DEPOSIT, WITHDRAW);
    this.proxyContract = new ethers.Contract(config.settlementContractAddress, abiData.abi, this.provider);
  }

  private createCommand(nonce: bigint, command: bigint, params: Array<bigint>): BigUint64Array {
    const cmd = (nonce << 16n) + (BigInt(params.length + 1) << 8n) + command;
    let buf = [cmd];
    buf = buf.concat(params);
    const barray = new BigUint64Array(buf);
    return barray;
  }

  private async createPlayer(player: PlayerConvention) {
    try {
      const CREATE_PLAYER = 1n;
      let result = await this.rpc.sendTransaction(
        this.createCommand(0n, CREATE_PLAYER, []),
        player.processingKey
      );
      return result;
    } catch(e) {
      if(e instanceof Error) {
        console.log(e.message);
      }
      console.log("createPlayer error at processing key:", player.processingKey);
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

    const setupEventListener = async () => {
      try {
        const contractAddress = await this.proxyContract.getAddress();
        const topicFilter = {
          address: contractAddress,
          topics: [this.proxyContract.interface.getEvent('TopUp')?.topicHash ?? ethers.id('TopUp(address,address,uint256,uint256,uint256)')]
        };
        
        this.provider.on('block', async (blockNumber) => {
          try {
            const events = await this.proxyContract.queryFilter(this.proxyContract.filters.TopUp(), blockNumber, blockNumber);
            for (const event of events) {
              console.log(`New TopUp event detected in block ${blockNumber}: ${event.transactionHash}`);
              await this.processTopUpEvent(event as EventLog);
            }
          } catch (error) {
            console.error(`Error processing block ${blockNumber}:`, error);
          }
        });

        console.log('Block listener setup successfully');
      } catch (error) {
        console.error('Error setting up block listener:', error);
        setTimeout(setupEventListener, 5000);
      }
    };

    // Initial setup
    await setupEventListener();
  }
}