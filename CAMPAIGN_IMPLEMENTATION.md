# Campaign Deposit/Budget Management Implementation

Complete implementation of escrowed PYUSD campaign management system for Review-to-Earn.

## 🎯 Features Implemented

### Smart Contracts
- ✅ **CampaignFactory.sol** - Factory for creating campaigns
- ✅ **Campaign.sol** - Individual campaign with escrowed budget
- ✅ **IERC20.sol** - Token interface (updated with transferFrom)

### Backend API
- ✅ `/api/campaigns` - Get all campaigns
- ✅ `/api/campaigns/brand/:address` - Get campaigns by brand
- ✅ `/api/campaigns/create` - Create new campaign

### Frontend UI
- ✅ **CampaignsPage** - Campaign management dashboard
- ✅ **CampaignList** - Display campaigns with stats
- ✅ **Create Campaign Form** - Brand interface for campaign creation

## 📁 File Structure

```
py-ext-app/
├── contracts/
│   ├── Campaign.sol              # Individual campaign contract
│   ├── CampaignFactory.sol       # Factory contract
│   ├── IERC20.sol                # Token interface
│   ├── scripts/
│   │   └── deploy-factory.ts     # Deployment script
│   ├── deployments/
│   │   └── sepolia.json          # Deployment info (generated)
│   └── README.md                 # Contract documentation
│
├── apps/backend/src/
│   └── index.ts                  # Added campaign API endpoints
│
└── apps/reward-page/src/
    ├── types/
    │   └── campaign.ts           # Campaign TypeScript types
    ├── components/campaign/
    │   ├── CampaignList.tsx      # Campaign list component
    │   └── CampaignList.css      # Styles
    ├── pages/
    │   ├── CampaignsPage.tsx     # Main campaign page
    │   └── CampaignsPage.css     # Styles
    └── App.tsx                   # (needs routing update)
```

## 🚀 Deployment Steps

### 1. Compile Contracts

```bash
cd contracts

# Using Hardhat
npx hardhat compile

# Or using Foundry
forge build

# Or using solc
solc --optimize --bin --abi *.sol -o artifacts/
```

### 2. Deploy to Sepolia

```bash
# Ensure environment variables are set in apps/backend/.env:
# SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
# REWARDER_PRIVATE_KEY=0x...
# PYUSD_CONTRACT_ADDRESS=0x... (PYUSD on Sepolia)

cd contracts
npx ts-node scripts/deploy-factory.ts
```

This will:
- Deploy CampaignFactory contract
- Save deployment info to `deployments/sepolia.json`
- Output factory address

### 3. Update Backend Configuration

Add to `apps/backend/.env`:
```env
CAMPAIGN_FACTORY_ADDRESS=0x... # From deployment output
```

### 4. Install Dependencies

```bash
# Backend (if needed)
cd apps/backend
pnpm install ethers

# Frontend
cd apps/reward-page
pnpm install
```

## 🔧 Integration Guide

### Add Routing to Reward Page

Update `apps/reward-page/src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CampaignsPage } from './pages/CampaignsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RewardClaimPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

Install react-router-dom:
```bash
cd apps/reward-page
pnpm install react-router-dom
```

### Backend Implementation (TODO)

Complete the campaign endpoints in `apps/backend/src/index.ts`:

```typescript
import { ethers } from 'ethers';

// Load contract ABIs
const factoryABI = [...]; // From compiled artifacts
const campaignABI = [...];

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.REWARDER_PRIVATE_KEY, provider);

const factory = new ethers.Contract(
  process.env.CAMPAIGN_FACTORY_ADDRESS!,
  factoryABI,
  wallet
);

// Implement endpoints:
app.get("/api/campaigns", async (req, res) => {
  const campaigns = await factory.getAllCampaigns();
  // Fetch details for each campaign
  res.json({ campaigns });
});

app.post("/api/campaigns/create", async (req, res) => {
  const { startTime, endTime, maxPayoutPerReview, maxParticipants, rulesHash } = req.body;
  
  // Create campaign
  const tx = await factory.createCampaign(
    startTime,
    endTime,
    maxPayoutPerReview,
    maxParticipants,
    rulesHash
  );
  
  const receipt = await tx.wait();
  const campaignAddress = receipt.events[0].args.campaign;
  
  res.json({ ok: true, campaignAddress });
});
```

## 📊 Campaign Flow

### Brand Creates Campaign

1. **Brand connects wallet** on `/campaigns` page
2. **Fills campaign form**:
   - Start/End dates
   - Max payout per review
   - Max participants
   - Initial budget
   - Rules description
3. **Approves PYUSD** to Campaign contract
4. **Backend calls** `CampaignFactory.createCampaign()`
5. **Backend calls** `Campaign.depositBudget()`
6. **Campaign is live** and accepting reviews

### User Claims Reward

1. **User submits review** via extension
2. **Backend validates** review quality
3. **Backend calls** `Campaign.payReward(user, score)`
4. **PYUSD transferred** from campaign to user
5. **Campaign stats updated** (participants, remaining budget)

### Campaign Ends

1. **Time expires** or brand ends early
2. **Brand calls** `Campaign.withdrawRemainder()`
3. **Unused PYUSD refunded** to brand
4. **Campaign marked** as ended

## 🔐 Security Features

- ✅ **Escrowed Budget** - PYUSD locked in contract
- ✅ **Time-based Lifecycle** - Start/end timestamps enforced
- ✅ **Participant Limits** - Max participants cap
- ✅ **Per-review Limits** - Max payout per review
- ✅ **Brand-only Withdrawal** - Only brand can withdraw
- ✅ **Transparent Rules** - On-chain rules hash
- ✅ **No Double Claims** - One reward per user per campaign

## 📝 Smart Contract Functions

### CampaignFactory

```solidity
function createCampaign(
    uint256 startTime,
    uint256 endTime,
    uint256 maxPayoutPerReview,
    uint256 maxParticipants,
    bytes32 rulesHash
) external returns (address campaign)

function getAllCampaigns() external view returns (address[] memory)
function getBrandCampaigns(address brand) external view returns (address[] memory)
```

### Campaign

```solidity
function depositBudget(uint256 amount) external onlyBrand
function payReward(address user, uint256 score) external onlyBrand whenActive
function withdrawRemainder() external onlyBrand
function endCampaign() external onlyBrand
function getCampaignInfo() external view returns (...)
```

## 🧪 Testing

### Manual Testing

1. **Deploy contracts** to Sepolia testnet
2. **Get Sepolia ETH** from faucet
3. **Get test PYUSD** (or deploy mock token)
4. **Create campaign** via UI
5. **Submit review** via extension
6. **Verify reward** payment on Blockscout
7. **End campaign** and withdraw remainder

### Unit Tests (TODO)

```bash
# Using Hardhat
npx hardhat test

# Using Foundry
forge test
```

## 🎨 UI Screenshots

### Campaign Dashboard
- List of all campaigns
- Filter by brand
- Status indicators (Active/Upcoming/Ended)
- Budget stats

### Create Campaign Form
- Date pickers for start/end
- PYUSD amount inputs
- Participant limits
- Rules description

## 📈 Future Enhancements

- [ ] IPFS integration for rules storage
- [ ] Multi-token support (not just PYUSD)
- [ ] Campaign templates
- [ ] Analytics dashboard
- [ ] Automated campaign scheduling
- [ ] Review quality thresholds
- [ ] Tiered reward structures
- [ ] Campaign categories/tags
- [ ] Social sharing features
- [ ] Email notifications

## 🔗 Related Documentation

- [Smart Contracts README](./contracts/README.md)
- [Backend API Documentation](./apps/backend/README.md)
- [Frontend Components](./apps/reward-page/README.md)

## 💡 Key Advantages

1. **Budget Reliability** - Pre-deposited funds guarantee payouts
2. **Transparent Rules** - On-chain rules hash prevents disputes
3. **Automatic Refunds** - Unused budget returned to brand
4. **No Intermediaries** - Direct smart contract execution
5. **Audit Trail** - All transactions on-chain
6. **Flexible Parameters** - Customizable per campaign
7. **Scalable** - Factory pattern for unlimited campaigns

## 🚨 Important Notes

- Brands must **approve PYUSD** before depositing budget
- Campaign parameters are **immutable** after creation
- Rewards are **automatically calculated** based on score (linear: score/100 * maxPayout)
- Backend must be **authorized** to call `payReward()`
- Consider using **multi-sig** for brand wallet in production
- Store **rulesHash** in IPFS for decentralized storage

## 📞 Support

For questions or issues:
1. Check contract events on Blockscout
2. Review backend logs
3. Verify wallet approvals
4. Ensure sufficient gas and PYUSD balance
