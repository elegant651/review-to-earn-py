export type ReviewScore = {
  quality: number;
  spam: number;
  sentiment: number;
  explanation: string;
};

export type RewardRequest = {
  address: string;
  reviewHash: string;
  score: ReviewScore;
};
