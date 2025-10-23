import "dotenv/config";
import cors from "cors";
import express from "express";
import { Contract, Interface, JsonRpcProvider, Wallet, isAddress } from "ethers";
import { z } from "zod";
import { sendPyusdReward } from "./pyusd";

const PORT = Number(process.env.PORT ?? 8787);

// In-memory token storage (use Redis in production)
interface TokenData {
  review: string;
  score: {
    quality: number;
    spam: number;
    sentiment: number;
    explanation: string;
  };
  campaignAddress?: string; // Optional: for campaign-based rewards
  timestamp: number;
  expiresAt: number;
}

const tokenStore = new Map<string, TokenData>();

// Clean up expired tokens every minute
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (data.expiresAt < now) {
      tokenStore.delete(token);
      console.log(`Deleted expired token: ${token}`);
    }
  }
}, 60000);

export const rewardPayloadSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "invalid_address"),
  reviewHash: z.string().min(6),
  score: z.object({
    quality: z.number().min(0).max(100),
    spam: z.number().min(0).max(100),
    sentiment: z.number().min(0).max(100),
    explanation: z.string().max(500)
  })
});

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const FACTORY_ABI = [
  "function getAllCampaigns() view returns (address[])",
  "function getBrandCampaigns(address brand) view returns (address[])",
  "function createCampaign(uint256,uint256,uint256,uint256,bytes32) returns (address)",
  "event CampaignCreated(address indexed campaign,address indexed brand,uint256 startTime,uint256 endTime,uint256 maxPayoutPerReview,uint256 maxParticipants,bytes32 rulesHash)"
];

const CAMPAIGN_ABI = [
  "function getCampaignInfo() view returns (address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool)",
  "function rulesHash() view returns (bytes32)",
  "function depositBudget(uint256 amount)",
  "function payReward(address user, uint256 score)",
  "function pyusdToken() view returns (address)",
  "function maxPayoutPerReview() view returns (uint256)",
  "function maxParticipants() view returns (uint256)",
  "function startTime() view returns (uint256)",
  "function endTime() view returns (uint256)",
  "function brand() view returns (address)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const RPC_URL = requiredEnv("SEPOLIA_RPC_URL");
const FACTORY_ADDRESS = requiredEnv("CAMPAIGN_FACTORY_ADDRESS");
const PYUSD_TOKEN_ADDRESS = requiredEnv("PYUSD_CONTRACT_ADDRESS");
const FACTORY_INTERFACE = new Interface(FACTORY_ABI);

const sharedProvider = new JsonRpcProvider(RPC_URL);

app.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Store reward data with token (called by extension)
app.post("/token/store", async (req, res) => {
  const { token, review, score, campaignAddress } = req.body;

  if (!token || !review || !score) {
    return res.status(400).json({ error: "missing_fields" });
  }

  // Store token with 10 minute expiration
  tokenStore.set(token, {
    review,
    score,
    campaignAddress, // Optional
    timestamp: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  const campaignInfo = campaignAddress ? ` for campaign ${campaignAddress}` : '';
  console.log(`Stored token: ${token}${campaignInfo}, expires in 10 minutes`);
  res.json({ ok: true });
});

// Exchange token for reward data (called by reward page)
app.get("/token/:token", async (req, res) => {
  const { token } = req.params;

  const data = tokenStore.get(token);

  if (!data) {
    console.log(`Token not found: ${token}`);
    return res.status(404).json({ error: "token_not_found" });
  }

  if (data.expiresAt < Date.now()) {
    tokenStore.delete(token);
    console.log(`Token expired: ${token}`);
    return res.status(410).json({ error: "token_expired" });
  }

  console.log(`Token retrieved: ${token}`);
  // Return data but don't delete token yet (user might refresh)
  res.json({
    ok: true,
    review: data.review,
    score: data.score,
    campaignAddress: data.campaignAddress // Optional
  });
});

app.post("/reward", async (req, res) => {
  // const parseResult = rewardPayloadSchema.safeParse(req.body);
  const parseResult = req.body
  console.log('parseResult', parseResult)

  // if (!parseResult.success) {
  //   return res.status(400).json({ error: "invalid_request", details: parseResult.error.flatten() });
  // }

  const { score, address, reviewHash } = parseResult;
  if (score.quality < Number(process.env.QUALITY_THRESHOLD ?? 70)) {
    return res.status(403).json({ error: "low_quality" });
  }
  if (score.spam > Number(process.env.SPAM_THRESHOLD ?? 30)) {
    return res.status(403).json({ error: "high_spam" });
  }


  try {
    const txHash = await sendPyusdReward({
      rpcUrl: requiredEnv("SEPOLIA_RPC_URL"),
      privateKey: requiredEnv("REWARDER_PRIVATE_KEY"),
      tokenAddress: requiredEnv("PYUSD_CONTRACT_ADDRESS"),
      to: address,
      amountWei: BigInt(process.env.REWARD_AMOUNT_WEI ?? "1000000")
    });
    console.log('txHash', txHash)
    res.json({ ok: true, reviewHash, txHash });
  } catch (error) {
    console.error("reward_failed", error);
    res.status(500).json({ error: "reward_failed" });
  }
});

// Pay reward from campaign budget
app.post("/payReward", async (req, res) => {
  const schema = z.object({
    campaignAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "invalid_campaign_address"),
    userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "invalid_user_address"),
    review: z.string().min(10),
    score: z.object({
      quality: z.number().min(0).max(100),
      spam: z.number().min(0).max(100),
      sentiment: z.number().min(0).max(100),
      explanation: z.string().max(500)
    })
  });

  const parse = schema.safeParse(req.body);

  if (!parse.success) {
    return res.status(400).json({ error: "invalid_request", details: parse.error.flatten() });
  }

  const { campaignAddress, userAddress, review, score } = parse.data;

  // Validate review quality
  if (score.quality < Number(process.env.QUALITY_THRESHOLD ?? 70)) {
    return res.status(403).json({ error: "low_quality", score: score.quality });
  }
  if (score.spam > Number(process.env.SPAM_THRESHOLD ?? 30)) {
    return res.status(403).json({ error: "high_spam", score: score.spam });
  }

  try {
    const wallet = new Wallet(requiredEnv("REWARDER_PRIVATE_KEY"), sharedProvider);
    const campaign = new Contract(campaignAddress, CAMPAIGN_ABI, wallet);

    // Verify campaign exists and is valid
    const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, sharedProvider);
    const allCampaigns: string[] = await factory.getAllCampaigns();

    if (!allCampaigns.map(c => c.toLowerCase()).includes(campaignAddress.toLowerCase())) {
      return res.status(404).json({ error: "campaign_not_found" });
    }

    // Verify wallet is the brand (authorized to pay rewards)
    const brandAddress = await campaign.brand();
    if (wallet.address.toLowerCase() !== brandAddress.toLowerCase()) {
      return res.status(403).json({ error: "unauthorized_not_brand" });
    }

    // Calculate overall score (0-100)
    const overallScore = Math.round(
      (score.quality + (100 - score.spam) + score.sentiment) / 3
    );

    // Call Campaign.payReward(user, score)
    const tx = await campaign.payReward(userAddress, BigInt(overallScore));
    const receipt = await tx.wait();

    console.log(`Reward paid from campaign ${campaignAddress} to ${userAddress}, score: ${overallScore}`);

    res.json({
      ok: true,
      txHash: receipt.hash,
      campaignAddress,
      userAddress,
      score: overallScore,
      reviewHash: receipt.hash.slice(0, 10)
    });
  } catch (error: any) {
    console.error("pay_reward_failed", error);

    // Parse common contract errors
    if (error.message?.includes("InsufficientBudget")) {
      return res.status(400).json({ error: "insufficient_campaign_budget" });
    }
    if (error.message?.includes("AlreadyParticipated")) {
      return res.status(400).json({ error: "user_already_claimed" });
    }
    if (error.message?.includes("MaxParticipantsReached")) {
      return res.status(400).json({ error: "campaign_full" });
    }
    if (error.message?.includes("CampaignNotActive")) {
      return res.status(400).json({ error: "campaign_not_active" });
    }

    res.status(500).json({ error: "pay_reward_failed", message: error.message });
  }
});

// Campaign management endpoints
app.get("/api/campaigns", async (req, res) => {
  try {
    const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, sharedProvider);
    const addresses: string[] = await factory.getAllCampaigns();

    const campaigns = await Promise.all(
      addresses.map((address) => loadCampaignDetails(address, sharedProvider))
    );

    res.json({ campaigns });
  } catch (error) {
    console.error("campaign_list_failed", error);
    res.status(500).json({ error: "campaign_list_failed" });
  }
});

app.get("/api/campaigns/brand/:address", async (req, res) => {
  const { address } = req.params;

  if (!isAddress(address)) {
    return res.status(400).json({ error: "invalid_address" });
  }

  try {
    const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, sharedProvider);
    const addresses: string[] = await factory.getBrandCampaigns(address);

    const campaigns = await Promise.all(
      addresses.map((campaign) => loadCampaignDetails(campaign, sharedProvider))
    );

    res.json({ campaigns });
  } catch (error) {
    console.error("campaign_brand_failed", error);
    res.status(500).json({ error: "campaign_brand_failed" });
  }
});

// Store campaign metadata (called after frontend creates campaign)
app.post("/api/campaigns/register", async (req, res) => {
  const schema = z.object({
    campaignAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "invalid_address"),
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "invalid_tx_hash"),
    brandAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "invalid_address")
  });

  const parse = schema.safeParse(req.body);

  if (!parse.success) {
    return res.status(400).json({ error: "invalid_request", details: parse.error.flatten() });
  }

  try {
    // Verify campaign exists in factory
    const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, sharedProvider);
    const allCampaigns: string[] = await factory.getAllCampaigns();
    
    if (!allCampaigns.map(c => c.toLowerCase()).includes(parse.data.campaignAddress.toLowerCase())) {
      return res.status(404).json({ error: "campaign_not_found" });
    }

    // Optionally store metadata in database here
    console.log(`Campaign registered: ${parse.data.campaignAddress} by ${parse.data.brandAddress}`);

    res.json({ ok: true, campaignAddress: parse.data.campaignAddress });
  } catch (error) {
    console.error("campaign_register_failed", error);
    res.status(500).json({ error: "campaign_register_failed" });
  }
});

// Get contract addresses for frontend
app.get("/api/contracts", (req, res) => {
  res.json({
    factoryAddress: FACTORY_ADDRESS,
    pyusdAddress: PYUSD_TOKEN_ADDRESS,
    chainId: "11155111" // Sepolia
  });
});

async function loadCampaignDetails(address: string, provider: JsonRpcProvider) {
  const campaign = new Contract(address, CAMPAIGN_ABI, provider);

  const [info, rulesHash, maxPayoutPerReview, pyusdToken] = await Promise.all([
    campaign.getCampaignInfo(),
    campaign.rulesHash(),
    campaign.maxPayoutPerReview(),
    campaign.pyusdToken()
  ]);

  return {
    address,
    brand: info[0] as string,
    totalBudget: (info[1] as bigint).toString(),
    remainingBudget: (info[2] as bigint).toString(),
    totalPaidOut: (info[3] as bigint).toString(),
    participantCount: Number(info[4]),
    maxParticipants: Number(info[5]),
    startTime: Number(info[6]),
    endTime: Number(info[7]),
    isActive: Boolean(info[8]),
    maxPayoutPerReview: (maxPayoutPerReview as bigint).toString(),
    rulesHash: rulesHash as string,
    pyusdToken: pyusdToken as string
  };
}

app.listen(PORT, () => {
  console.log(`R2E backend listening on http://localhost:${PORT}`);
});

function toBigInt(value: string | number | bigint): bigint {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    return BigInt(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error("empty_numeric_string");
    }
    return BigInt(trimmed);
  }
  throw new Error("invalid_numeric_value");
}

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env var: ${key}`);
  }
  return value;
}
