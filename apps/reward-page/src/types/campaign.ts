export interface Campaign {
  address: string;
  brand: string;
  totalBudget: string;
  remainingBudget: string;
  totalPaidOut: string;
  participantCount: number;
  maxParticipants: number;
  maxPayoutPerReview: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  rulesHash: string;
}

export interface CreateCampaignParams {
  startTime: number;
  endTime: number;
  maxPayoutPerReview: string;
  maxParticipants: number;
  rulesHash: string;
  initialBudget: string;
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudgetLocked: string;
  totalPaidOut: string;
}
