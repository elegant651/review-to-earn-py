import { Contract, JsonRpcProvider, Wallet } from "ethers";

const ERC20_ABI = ["function transfer(address to, uint256 value) returns (bool)"];

export type TransferConfig = {
  rpcUrl: string;
  privateKey: string;
  tokenAddress: string;
  to: string;
  amountWei: bigint;
};

export async function sendPyusdReward(config: TransferConfig): Promise<string> {
  const provider = new JsonRpcProvider(config.rpcUrl);
  const wallet = new Wallet(config.privateKey, provider);
  const erc20 = new Contract(config.tokenAddress, ERC20_ABI, wallet);

  const tx = await erc20.transfer(config.to, config.amountWei);
  const receipt = await tx.wait();

  if (!receipt?.hash) {
    throw new Error("transfer_failed");
  }

  return receipt.hash;
}
