export interface ReviewScore {
  quality: number;
  spam: number;
  sentiment: number;
  explanation: string;
}

export interface RewardParams {
  review: string;
  score: ReviewScore;
  campaignAddress?: string; // Optional: if from campaign
}

export interface RewardResponse {
  ok: boolean;
  txHash?: string;
  error?: string;
  status?: number;
  campaignAddress?: string;
  userAddress?: string;
  reviewHash?: string;
}

export interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}
