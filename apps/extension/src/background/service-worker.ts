import { hashReview } from "./utils";
import type { ReviewScore, RewardRequest } from "@/types/score";

const QUALITY_THRESHOLD = 70;
const SPAM_THRESHOLD = 30;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void handleMessage(message).then(sendResponse);
  return true;
});

async function handleMessage(message: any): Promise<Record<string, unknown>> {
  console.log('handleMessage', message)
  if (message?.type === "SCORE_REVIEW") {
    const score = await scoreReviewText(message.payload?.text ?? "");
    await chrome.storage.session.set({ latestScore: score });
    return { ok: true, score };
  }

  if (message?.type === "REQUEST_REWARD") {
    const payload = message.payload as {
      address: string;
      review: string;
      score: ReviewScore;
    };
    const rewardPayload: RewardRequest = {
      address: payload.address,
      reviewHash: hashReview(payload.review),
      score: payload.score
    };

    if (!isEligible(rewardPayload.score)) {
      return { ok: false, error: "not_eligible" };
    }

    try {
      const backendUrl = await getBackendUrl();
      const response = await fetch(`${backendUrl}/reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rewardPayload)
      });
      console.log('response', response)
      if (!response.ok) {
        let errorBody: unknown = { error: "unknown_error" };
        try {
          errorBody = await response.json();
        } catch {
          // Ignore JSON parse errors; use default error body.
        }
        return { ok: false, status: response.status, error: errorBody };
      }
      const data = await response.json();
      await chrome.storage.session.set({ latestReward: data.txHash });
      console.log('data', data)
      return { ok: true, txHash: data.txHash };
    } catch (error) {
      console.log('error', error)
      return { ok: false, error: (error as Error).message };
    }
  }

  if (message?.type === "GET_STATUS") {
    const { latestScore, latestReward } = await chrome.storage.session.get([
      "latestScore",
      "latestReward"
    ]);
    return { ok: true, latestScore, latestReward };
  }

  return { ok: false, error: "unknown_message_type" };
}

async function scoreReviewText(text: string): Promise<ReviewScore> {
  if (!text) {
    return {
      quality: 0,
      spam: 100,
      sentiment: 50,
      explanation: "Empty review"
    };
  }

  // TODO: Placeholder scoring until Prompt API is wired.
  const lengthBonus = Math.min(100, text.length / 4);
  const spamPenalty = Math.min(100, 100 - text.split(" ").length);
  const sentiment = estimateSentiment(text);

  return {
    quality: Math.min(100, Math.round(40 + lengthBonus * 0.6)),
    spam: Math.max(0, Math.round(spamPenalty)),
    sentiment,
    explanation: "Deterministic heuristic score; replace with Prompt API call."
  };
}

function estimateSentiment(text: string): number {
  const positiveWords = ["great", "excellent", "love", "perfect", "amazing"];
  const negativeWords = ["bad", "poor", "hate", "terrible", "awful"];

  const lowerText = text.toLowerCase();
  let score = 50;
  for (const word of positiveWords) {
    if (lowerText.includes(word)) {
      score += 8;
    }
  }
  for (const word of negativeWords) {
    if (lowerText.includes(word)) {
      score -= 8;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function isEligible(score: ReviewScore): boolean {
  return score.quality >= QUALITY_THRESHOLD && score.spam <= SPAM_THRESHOLD;
}

async function getBackendUrl(): Promise<string> {
  const { backendUrl } = await chrome.storage.sync.get("backendUrl");
  return backendUrl || "http://localhost:8787";
}
