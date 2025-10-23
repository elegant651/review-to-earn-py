# Campaign PayReward Integration

Complete integration of campaign-based rewards using the `/payReward` endpoint.

## 🎯 Overview

The system now supports **two reward flows**:

1. **Direct Rewards** (Legacy) - Backend pays from its own wallet
2. **Campaign Rewards** (New) - Backend pays from escrowed campaign budget

## 🔄 Complete Flow

### **Campaign-Based Reward Flow**

```
1. Extension detects review
2. Extension scores review (Prompt API)
3. Extension sends to backend: POST /token/store
   {
     token: "uuid",
     review: "text",
     score: { quality, spam, sentiment, explanation },
     campaignAddress: "0x..." // Optional
   }

4. Extension opens reward page: ?token=uuid

5. Reward page fetches: GET /token/:token
   Returns: { review, score, campaignAddress }

6. User connects MetaMask

7. Reward page calls: POST /payReward
   {
     campaignAddress: "0x...",
     userAddress: "0x...",
     review: "text",
     score: { quality, spam, sentiment, explanation }
   }

8. Backend calls: Campaign.payReward(userAddress, overallScore)

9. Smart contract:
   - Calculates reward: (maxPayout * score) / 100
   - Transfers PYUSD from campaign budget
   - Updates campaign stats

10. User receives PYUSD
```

## 📁 Updated Files

### **Backend** (`apps/backend/src/index.ts`)

#### **Token Storage Interface**
```typescript
interface TokenData {
  review: string;
  score: ReviewScore;
  campaignAddress?: string; // NEW: Optional campaign address
  timestamp: number;
  expiresAt: number;
}
```

#### **POST `/token/store`**
Now accepts optional `campaignAddress`:
```typescript
app.post("/token/store", async (req, res) => {
  const { token, review, score, campaignAddress } = req.body;
  // Stores campaign address if provided
});
```

#### **GET `/token/:token`**
Returns campaign address if available:
```typescript
res.json({ 
  ok: true, 
  review: data.review, 
  score: data.score,
  campaignAddress: data.campaignAddress // Optional
});
```

#### **POST `/payReward`** (NEW)
Pays reward from campaign budget:
```typescript
app.post("/payReward", async (req, res) => {
  const { campaignAddress, userAddress, review, score } = req.body;
  
  // Validates campaign exists
  // Verifies backend wallet is campaign brand
  // Calculates overall score
  // Calls Campaign.payReward(user, score)
  
  res.json({ ok: true, txHash, campaignAddress, userAddress, score });
});
```

**Error Handling:**
- `insufficient_campaign_budget` - Campaign out of funds
- `user_already_claimed` - User already participated
- `campaign_full` - Max participants reached
- `campaign_not_active` - Campaign ended/not started
- `low_quality` / `high_spam` - Review quality checks

### **Frontend** (`apps/reward-page/src/`)

#### **Updated Types** (`types/index.ts`)
```typescript
export interface ReviewScore {
  quality: number;
  spam: number;
  sentiment: number;
  explanation: string;
}

export interface RewardParams {
  review: string;
  score: ReviewScore; // Changed from number to object
  campaignAddress?: string; // NEW: Optional
}

export interface RewardResponse {
  ok: boolean;
  txHash?: string;
  error?: string;
  campaignAddress?: string; // NEW
  userAddress?: string; // NEW
  reviewHash?: string; // NEW
}
```

#### **RewardClaimPage** (`pages/RewardClaimPage.tsx`)

**Fetches Campaign Address:**
```typescript
const data = await response.json();
setRewardParams({ 
  review: data.review, 
  score: data.score, // Full score object
  campaignAddress: data.campaignAddress // Optional
});
```

**Smart Endpoint Selection:**
```typescript
const endpoint = rewardParams.campaignAddress ? '/payReward' : '/reward';
```

**Campaign-Specific Request:**
```typescript
if (rewardParams.campaignAddress) {
  requestBody = {
    campaignAddress: rewardParams.campaignAddress,
    userAddress: address,
    review: rewardParams.review,
    score: rewardParams.score
  };
} else {
  // Legacy direct reward (requires signature)
}
```

**Enhanced UI:**
- Shows campaign address if present
- Displays "Based on score" for campaign rewards
- Different success messages
- User-friendly error messages

### **Extension** (`apps/extension/src/content/content.ts`)

Can optionally include campaign address when storing token:
```typescript
await fetch(`${BACKEND_URL}/token/store`, {
  method: 'POST',
  body: JSON.stringify({
    token,
    review: element.value,
    score: activeReview.latestScore,
    campaignAddress: "0x..." // Optional: specify campaign
  })
});
```

## 🔐 Security Features

1. **Campaign Verification** - Backend verifies campaign exists in factory
2. **Authorization Check** - Backend wallet must be campaign brand
3. **Quality Thresholds** - Same quality/spam checks as direct rewards
4. **One Claim Per User** - Smart contract prevents double claims
5. **Budget Enforcement** - Smart contract checks sufficient funds
6. **Time Validation** - Smart contract enforces start/end times

## 📊 Reward Calculation

```typescript
// Overall score (0-100)
overallScore = (quality + (100 - spam) + sentiment) / 3

// Smart contract calculates actual reward
rewardAmount = (maxPayoutPerReview * overallScore) / 100
```

**Example:**
- Max payout: 1 PYUSD
- Quality: 85, Spam: 10, Sentiment: 90
- Overall: (85 + 90 + 90) / 3 = 88
- Reward: (1 * 88) / 100 = 0.88 PYUSD

## 🧪 Testing

### **Test Campaign Reward**

1. **Deploy contracts**:
```bash
cd contracts
npx ts-node scripts/deploy-factory.ts
```

2. **Create campaign** via UI at `/campaigns`

3. **Update extension** to include campaign address:
```typescript
campaignAddress: "0x..." // Your campaign address
```

4. **Submit review** on product page

5. **Claim reward** - Should use `/payReward` endpoint

6. **Verify on Blockscout**:
   - Check campaign balance decreased
   - Check user received PYUSD
   - Check campaign participant count increased

### **Test Direct Reward (Legacy)**

1. **Don't include** `campaignAddress` in token storage

2. **Submit review** on product page

3. **Claim reward** - Should use `/reward` endpoint (requires signature)

4. **Verify** backend wallet sent PYUSD

## 🎨 UI Differences

### **Campaign Reward**
- Subtitle: "Connect your wallet to claim your campaign reward"
- Reward Amount: "Based on score"
- Shows campaign address
- Success: "🎉 Campaign reward sent successfully!"
- No signature required

### **Direct Reward**
- Subtitle: "Connect your wallet to receive PYUSD for your helpful review"
- Reward Amount: "0.01 PYUSD" (fixed)
- No campaign info
- Success: "🎉 Reward sent successfully!"
- Requires MetaMask signature

## 🚀 Deployment Checklist

- [x] Backend `/payReward` endpoint implemented
- [x] Token storage supports campaign address
- [x] Frontend types updated
- [x] RewardClaimPage supports both flows
- [x] Error messages user-friendly
- [x] Smart contract ABIs included
- [ ] Deploy CampaignFactory to Sepolia
- [ ] Update backend `.env` with `CAMPAIGN_FACTORY_ADDRESS`
- [ ] Test campaign creation
- [ ] Test campaign reward claim
- [ ] Test direct reward claim (backward compatibility)

## 📝 Environment Variables

Add to `apps/backend/.env`:
```env
CAMPAIGN_FACTORY_ADDRESS=0x... # Deployed factory address
```

## 🔗 Related Documentation

- [Campaign Implementation](./CAMPAIGN_IMPLEMENTATION.md)
- [Smart Contracts](./contracts/README.md)
- [Backend API](./apps/backend/README.md)

## 💡 Key Advantages

1. **Backward Compatible** - Direct rewards still work
2. **Flexible** - Extension can choose campaign or direct
3. **Transparent** - All campaign transactions on-chain
4. **Budget Safe** - Pre-funded campaigns prevent overspending
5. **User Friendly** - No signature needed for campaign rewards
6. **Error Resilient** - Comprehensive error handling

## 🎯 Next Steps

1. Deploy CampaignFactory to Sepolia
2. Create test campaign via UI
3. Test end-to-end campaign reward flow
4. Add campaign selection UI in extension
5. Add campaign analytics dashboard
6. Implement campaign discovery/browsing
