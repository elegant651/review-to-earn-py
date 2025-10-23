# Frontend Campaign Creation with MetaMask

Campaign creation is now fully controlled by the user's MetaMask wallet, with Blockscout integration for transaction tracking.

## 🎯 Architecture Change

### **Before** (Backend-Controlled)
```
User fills form → Backend creates campaign → Backend approves PYUSD → Backend deposits budget
❌ User has no control
❌ Requires backend wallet to be brand
❌ No transparency
```

### **After** (Frontend-Controlled)
```
User fills form → MetaMask creates campaign → MetaMask approves PYUSD → MetaMask deposits budget
✅ User has full control
✅ User's wallet is the brand
✅ Full transparency via Blockscout
```

## 📁 New Files

### **Contract ABIs** (`apps/reward-page/src/contracts/abis.ts`)
```typescript
export const FACTORY_ABI = [
  "function createCampaign(...) returns (address)",
  "event CampaignCreated(...)"
];

export const CAMPAIGN_ABI = [
  "function depositBudget(uint256 amount)"
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];
```

### **Campaign Contract Hook** (`apps/reward-page/src/hooks/useCampaignContract.ts`)

**Features:**
- Fetches contract addresses from backend
- Creates campaign via MetaMask
- Handles PYUSD approval
- Deposits initial budget
- Registers campaign with backend (optional)
- Returns campaign address and tx hash

**Usage:**
```typescript
const { createCampaign, loading, error } = useCampaignContract();

const result = await createCampaign({
  startTime: 1234567890,
  endTime: 1234567890,
  maxPayoutPerReview: "0.10", // PYUSD
  maxParticipants: 1000,
  rulesHash: "0x...",
  initialBudget: "100.00" // PYUSD
});

// Returns: { campaignAddress, txHash }
```

## 🔄 Complete Flow

### **1. User Fills Form**
- Start/End dates
- Max payout per review (PYUSD)
- Max participants
- Initial budget (PYUSD)
- Campaign rules description

### **2. Frontend Hashes Rules**
```typescript
const encoder = new TextEncoder();
const data = encoder.encode(formData.rulesDescription);
const hashBuffer = await crypto.subtle.digest('SHA-256', data);
const rulesHash = `0x${hashHex.slice(0, 64)}`;
```

### **3. MetaMask Creates Campaign**
```typescript
const factory = new Contract(factoryAddress, FACTORY_ABI, signer);
const tx = await factory.createCampaign(
  startTime,
  endTime,
  maxPayoutWei,
  maxParticipants,
  rulesHash
);
const receipt = await tx.wait();
```

### **4. Parse Campaign Address from Event**
```typescript
const createdEvent = receipt.logs
  .find(event => event.name === 'CampaignCreated');
const campaignAddress = createdEvent.args.campaign;
```

### **5. Approve PYUSD (if budget > 0)**
```typescript
const pyusd = new Contract(pyusdAddress, ERC20_ABI, signer);
await pyusd.approve(campaignAddress, initialBudgetWei);
```

### **6. Deposit Budget**
```typescript
const campaign = new Contract(campaignAddress, CAMPAIGN_ABI, signer);
await campaign.depositBudget(initialBudgetWei);
```

### **7. Show Blockscout Notification**
```typescript
openTxToast(BLOCKSCOUT_CHAIN_ID, txHash);
```

### **8. Register with Backend (Optional)**
```typescript
await fetch('/api/campaigns/register', {
  method: 'POST',
  body: JSON.stringify({
    campaignAddress,
    txHash,
    brandAddress: userAddress
  })
});
```

## 🔧 Backend Changes

### **Removed**
- ❌ `POST /api/campaigns/create` - No longer creates campaigns

### **Added**
- ✅ `POST /api/campaigns/register` - Stores campaign metadata after creation
- ✅ `GET /api/contracts` - Returns contract addresses for frontend

### **POST `/api/campaigns/register`**
```typescript
{
  campaignAddress: "0x...",
  txHash: "0x...",
  brandAddress: "0x..."
}
```

**Purpose:**
- Verify campaign exists in factory
- Store metadata in database (optional)
- Track campaigns for analytics

### **GET `/api/contracts`**
```typescript
{
  factoryAddress: "0x...",
  pyusdAddress: "0x...",
  chainId: "11155111"
}
```

**Purpose:**
- Frontend fetches contract addresses
- No hardcoding in frontend
- Easy to update contracts

## 🎨 UI Updates

### **CampaignsPage**

**Status Messages:**
- "Preparing campaign..."
- "Creating campaign on blockchain..."
- "Campaign created successfully! Address: 0x..."
- "Failed: [error message]"

**Button States:**
- Disabled while creating
- Shows "Creating..." during transaction
- Auto-resets form on success

**Blockscout Integration:**
- Transaction toast notification
- Click to view on Blockscout
- Real-time transaction status

## 🔐 Security Benefits

1. **User Control** - Brand wallet controls campaign
2. **No Backend Keys** - Backend doesn't need private keys for campaigns
3. **Transparent** - All transactions visible on Blockscout
4. **Auditable** - Users can verify all actions
5. **Non-Custodial** - Backend never holds user funds

## 📊 Transaction Flow

```
┌─────────────┐
│   User      │
│  (Brand)    │
└──────┬──────┘
       │
       │ 1. Fill form
       ▼
┌─────────────────┐
│  CampaignsPage  │
│   (Frontend)    │
└──────┬──────────┘
       │
       │ 2. Hash rules
       │ 3. Call createCampaign()
       ▼
┌─────────────────┐
│   MetaMask      │
│  (User Wallet)  │
└──────┬──────────┘
       │
       │ 4. Sign & send tx
       ▼
┌─────────────────┐
│ CampaignFactory │
│  (Smart Contract)│
└──────┬──────────┘
       │
       │ 5. Deploy Campaign
       │ 6. Emit event
       ▼
┌─────────────────┐
│   Campaign      │
│  (Smart Contract)│
└──────┬──────────┘
       │
       │ 7. Approve PYUSD
       │ 8. Deposit budget
       ▼
┌─────────────────┐
│   Blockscout    │
│  (Explorer)     │
└─────────────────┘
```

## 🧪 Testing Steps

1. **Connect MetaMask** to Sepolia testnet

2. **Get Test Tokens:**
   - Sepolia ETH from faucet
   - Test PYUSD (or deploy mock token)

3. **Create Campaign:**
   - Fill form with test data
   - Approve MetaMask transactions:
     - Create campaign
     - Approve PYUSD
     - Deposit budget

4. **Verify on Blockscout:**
   - Check campaign creation tx
   - Check PYUSD approval tx
   - Check budget deposit tx
   - Verify campaign contract state

5. **Check Campaign List:**
   - Should appear in campaigns list
   - Should show correct budget
   - Should show brand as your address

## 🚀 Deployment Checklist

- [x] Contract ABIs added to frontend
- [x] `useCampaignContract` hook created
- [x] CampaignsPage updated to use MetaMask
- [x] Backend endpoints updated
- [x] Blockscout integration added
- [x] Status messages implemented
- [x] Error handling added
- [ ] Deploy CampaignFactory to Sepolia
- [ ] Update backend `.env` with factory address
- [ ] Test end-to-end on testnet
- [ ] Verify all transactions on Blockscout

## 📝 Environment Variables

**Backend** (`apps/backend/.env`):
```env
CAMPAIGN_FACTORY_ADDRESS=0x... # Deployed factory
PYUSD_CONTRACT_ADDRESS=0x...   # PYUSD on Sepolia
SEPOLIA_RPC_URL=https://...
```

**Frontend** - No env vars needed! Fetches from backend.

## 💡 Key Advantages

1. **Decentralized** - No backend control over campaigns
2. **Transparent** - All actions on-chain
3. **User-Friendly** - Blockscout notifications
4. **Secure** - User controls their funds
5. **Flexible** - Easy to add more features
6. **Auditable** - Anyone can verify transactions

## 🔗 Blockscout Features Used

1. **Transaction Toast** - `openTxToast(chainId, txHash)`
   - Shows transaction status
   - Click to view on Blockscout
   - Auto-updates when confirmed

2. **Transaction Popup** - `openPopup({ chainId, address })`
   - View wallet history
   - See all transactions
   - Filter by type

## 🎯 Next Steps

1. Deploy contracts to Sepolia
2. Test campaign creation with real MetaMask
3. Verify Blockscout integration works
4. Add campaign management features:
   - Deposit more budget
   - Withdraw remaining funds
   - End campaign early
5. Add campaign analytics dashboard
6. Implement campaign discovery/browsing

## 📚 Related Documentation

- [Campaign Implementation](./CAMPAIGN_IMPLEMENTATION.md)
- [PayReward Integration](./PAYREWARD_INTEGRATION.md)
- [Smart Contracts](./contracts/README.md)
