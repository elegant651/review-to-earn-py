# Smart Contracts

Campaign management contracts for Review-to-Earn PYUSD rewards.

## Contracts

### CampaignFactory.sol
Factory contract for creating and managing campaigns. Deploys individual Campaign contracts.

**Key Functions:**
- `createCampaign()` - Create new campaign with parameters
- `getAllCampaigns()` - Get all deployed campaigns
- `getBrandCampaigns(address)` - Get campaigns by brand

### Campaign.sol
Individual campaign contract that holds escrowed PYUSD budget and manages payouts.

**Key Functions:**
- `depositBudget(uint256)` - Brand deposits PYUSD budget
- `payReward(address, uint256)` - Pay reward to reviewer (called by backend)
- `withdrawRemainder()` - Withdraw remaining budget after campaign ends
- `endCampaign()` - End campaign early (emergency)
- `getCampaignInfo()` - Get campaign details

## Compilation

Using Solidity 0.8.20+. Compile with your preferred tool:

```bash
# Using Hardhat
npx hardhat compile

# Using Foundry
forge build

# Using solc directly
solc --optimize --bin --abi contracts/*.sol -o artifacts/
```

## Deployment

### Prerequisites

1. Set up environment variables in `apps/backend/.env`:
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
REWARDER_PRIVATE_KEY=0x...
PYUSD_CONTRACT_ADDRESS=0x... # PYUSD on Sepolia
```

2. Install dependencies:
```bash
npm install ethers dotenv
```

### Deploy to Sepolia

```bash
cd contracts
npx ts-node scripts/deploy-factory.ts
```

This will:
1. Deploy CampaignFactory contract
2. Save deployment info to `deployments/sepolia.json`
3. Output factory address for backend configuration

### Update Backend

Add to `apps/backend/.env`:
```env
CAMPAIGN_FACTORY_ADDRESS=0x... # From deployment output
```

## Contract Architecture

```
CampaignFactory (Singleton)
├── Creates Campaign instances
├── Tracks all campaigns
└── Manages brand → campaigns mapping

Campaign (Multiple instances)
├── Holds escrowed PYUSD budget
├── Manages reward payouts
├── Enforces campaign rules
└── Refunds unused budget
```

## Security Features

- ✅ Immutable campaign parameters
- ✅ Escrowed budget (pre-deposit required)
- ✅ Time-based campaign lifecycle
- ✅ Max participants cap
- ✅ Per-review payout limits
- ✅ Brand-only withdrawal
- ✅ Transparent on-chain rules (rulesHash)

## Integration

### Brand Flow
1. Approve PYUSD to Campaign contract
2. Call `depositBudget()` to fund campaign
3. Backend calls `payReward()` when users submit reviews
4. Call `withdrawRemainder()` after campaign ends

### User Flow
1. Submit review via extension
2. Backend validates review
3. Backend calls `Campaign.payReward()`
4. User receives PYUSD automatically

## Testing

```bash
# Unit tests (if using Hardhat)
npx hardhat test

# Integration tests
npm run test:integration
```

## Verification

Verify on Etherscan:
```bash
npx hardhat verify --network sepolia <FACTORY_ADDRESS> <PYUSD_ADDRESS>
```

## Gas Estimates

- Deploy CampaignFactory: ~1.5M gas
- Create Campaign: ~2M gas
- Deposit Budget: ~50k gas
- Pay Reward: ~80k gas
- Withdraw Remainder: ~50k gas
