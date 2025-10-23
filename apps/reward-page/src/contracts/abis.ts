// Smart Contract ABIs for frontend interaction

export const FACTORY_ABI = [
  "function createCampaign(uint256 startTime, uint256 endTime, uint256 maxPayoutPerReview, uint256 maxParticipants, bytes32 rulesHash) returns (address)",
  "function getAllCampaigns() view returns (address[])",
  "function getBrandCampaigns(address brand) view returns (address[])",
  "event CampaignCreated(address indexed campaign, address indexed brand, uint256 startTime, uint256 endTime, uint256 maxPayoutPerReview, uint256 maxParticipants, bytes32 rulesHash)"
] as const;

export const CAMPAIGN_ABI = [
  "function depositBudget(uint256 amount)",
  "function getCampaignInfo() view returns (address brand, uint256 totalBudget, uint256 remainingBudget, uint256 totalPaidOut, uint256 participantCount, uint256 maxParticipants, uint256 startTime, uint256 endTime, bool isActive)",
  "function brand() view returns (address)",
  "function pyusdToken() view returns (address)"
] as const;

export const ERC20_ABI = [
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
] as const;
