import "dotenv/config";
import cors from "cors";
import express from "express";
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

app.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Store reward data with token (called by extension)
app.post("/token/store", async (req, res) => {
  const { token, review, score } = req.body;

  if (!token || !review || !score) {
    return res.status(400).json({ error: "missing_fields" });
  }

  // Store token with 10 minute expiration
  tokenStore.set(token, {
    review,
    score,
    timestamp: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  console.log(`Stored token: ${token}, expires in 10 minutes`);
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
  res.json({ ok: true, review: data.review, score: data.score });
});

app.post("/reward", async (req, res) => {
  //0xBB9C411B530408ad4D3afB99f84FcbBd9E490662

  // const parseResult = rewardPayloadSchema.safeParse(req.body);
  const parseResult = req.body
  console.log('parseResult', parseResult)

  // if (!parseResult.success) {
  //   return res.status(400).json({ error: "invalid_request", details: parseResult.error.flatten() });
  // }

  const { score, address, reviewHash } = parseResult;
  // if (score.quality < Number(process.env.QUALITY_THRESHOLD ?? 70)) {
  //   return res.status(403).json({ error: "low_quality" });
  // }
  // if (score.spam > Number(process.env.SPAM_THRESHOLD ?? 30)) {
  //   return res.status(403).json({ error: "high_spam" });
  // }


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

app.listen(PORT, () => {
  console.log(`R2E backend listening on http://localhost:${PORT}`);
});

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env var: ${key}`);
  }
  return value;
}
