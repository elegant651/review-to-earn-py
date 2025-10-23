export interface RewardParams {
  review: string;
  score: number;
}

export interface RewardResponse {
  ok: boolean;
  txHash?: string;
  error?: string;
  status?: number;
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
