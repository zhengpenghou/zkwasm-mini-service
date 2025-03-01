# zkWasm Mini Service

A TypeScript service for handling L1 to L2 (zkWasm App) token deposits and L2 (zkWasm App) to L1 token settlements using zkWasm technology. This service provides two main components:

- **Deposit Service**: Monitors and processes L1 to L2 token deposits
- **Settlement Service**: Handles L2 to L1 token settlements with proof verification

## Features

- Real-time monitoring of blockchain events
- Automatic deposit processing
- Settlement verification with proof validation
- MongoDB integration for transaction tracking
- TypeScript support with full type safety
- Configurable for different environments

## Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Ethereum RPC endpoint
- zkWasm RPC endpoint

## Installation

1. Clone the repository:
```bash
git clone https://github.com/DelphinusLab/zkwasm-mini-service
cd zkwasm-mini-service
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Required
RPC_PROVIDER=https://your-ethereum-rpc
SERVER_ADMIN_KEY=your-admin-key
SETTLEMENT_CONTRACT_ADDRESS=0x...
MONGO_URI=mongodb://localhost:27017
ZKWASM_RPC_URL=https://your-zkwasm-rpc
SETTLER_PRIVATE_ACCOUNT=your-settler-private-key  # Required for Settlement service
CHAIN_ID=your-chain-id
```

## Usage

You can use the services either programmatically or via command line. 

**For Usage for multiple applications, you can duplicate the `deposit_service.ts` and `settle_service.ts`, and modify the config, and then run them separately.**

### Programmatic Usage

```typescript
import { Config, Deposit, Settlement } from 'zkwasm-mini-service';

const config: Config = {
  rpcProvider: "https://your-rpc-url",
  serverAdminKey: "your-admin-key",
  settlementContractAddress: "0x...",
  mongoUri: "mongodb://...",
  zkwasmRpcUrl: "https://your-zkwasm-rpc", // optional
  settlerPrivateKey: "your-settler-private-key", // required for Settlement service
  chainId: 1, // optional
};

// Start deposit service
const deposit = new Deposit(config);
await deposit.serve();

// Start settlement service
const settlement = new Settlement(config);
await settlement.serve();
```

### Command Line Usage

Start the deposit service:
```bash
npm run deposit
```

Start the settlement service:
```bash
npm run settle
```

## Service Details

### Deposit Service

The deposit service monitors the blockchain for TopUp events and processes them:

- Validates token deposits
- Creates and manages players
- Tracks transaction states in MongoDB
- Handles deposit confirmations

### Settlement Service

The settlement service handles L2 to L1 token settlements:

- Monitors for settlement opportunities
- Verifies proofs
- Processes withdrawals
- Updates settlement status
- Handles both manual and automatic proof submissions

## Database Schema

### Transaction Schema
```typescript
{
  txHash: string;        // Unique transaction hash
  state: string;         // pending/in-progress/completed/failed
  timestamp: Date;       // Transaction timestamp
  l1token: string;       // L1 token address
  address: string;       // User address
  pid_1: BigInt;        // Player ID 1
  pid_2: BigInt;        // Player ID 2
  amount: BigInt;       // Transaction amount
}
```

### Bundle Schema
```typescript
{
  merkleRoot: string;    // Unique merkle root
  taskId: string;        // Associated task ID
  withdrawArray: [{      // Withdrawal information
    address: string;     // Withdrawal address
    amount: BigInt;      // Withdrawal amount
  }];
  settleStatus: string;  // waiting/failed/done
  settleTxHash: string;  // Settlement transaction hash
}
```

## Error Handling

The service includes comprehensive error handling:

- Transaction state tracking
- Automatic retries for failed operations
- Manual review triggers for critical errors
- Detailed error logging

## Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## DevOps 

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.


