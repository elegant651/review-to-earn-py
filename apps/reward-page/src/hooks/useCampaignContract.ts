import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { FACTORY_ABI, CAMPAIGN_ABI, ERC20_ABI } from '../contracts/abis';
import { BACKEND_URL } from '../config';

interface ContractAddresses {
  factoryAddress: string;
  pyusdAddress: string;
  chainId: string;
}

export function useCampaignContract() {
  const [contracts, setContracts] = useState<ContractAddresses | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch contract addresses from backend
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/contracts`)
      .then(res => res.json())
      .then(data => setContracts(data))
      .catch(err => console.error('Failed to fetch contracts:', err));
  }, []);

  const createCampaign = async (params: {
    startTime: number;
    endTime: number;
    maxPayoutPerReview: string; // in PYUSD (e.g., "0.10")
    maxParticipants: number;
    rulesHash: string;
    initialBudget: string; // in PYUSD (e.g., "100.00")
  }) => {
    if (!contracts) throw new Error('Contracts not loaded');
    if (!window.ethereum) throw new Error('MetaMask not found');

    setLoading(true);
    setError(null);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Convert PYUSD amounts to wei (6 decimals)
      const maxPayoutWei = parseUnits(params.maxPayoutPerReview, 6);
      const initialBudgetWei = parseUnits(params.initialBudget, 6);

      // 1. Create campaign via factory
      const factory = new Contract(contracts.factoryAddress, FACTORY_ABI, signer);
      
      console.log('Creating campaign...');
      const createTx = await factory.createCampaign(
        BigInt(params.startTime),
        BigInt(params.endTime),
        maxPayoutWei,
        BigInt(params.maxParticipants),
        params.rulesHash
      );

      console.log('Waiting for transaction...', createTx.hash);
      const receipt = await createTx.wait();
      console.log('Campaign created!', receipt);

      // Parse event to get campaign address
      const iface = factory.interface;
      const createdEvent = receipt.logs
        .map((log: any) => {
          try {
            return iface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((event: any) => event?.name === 'CampaignCreated');

      if (!createdEvent) {
        throw new Error('Campaign creation event not found');
      }

      const campaignAddress = createdEvent.args.campaign;
      console.log('Campaign address:', campaignAddress);

      // 2. If initial budget > 0, approve and deposit
      if (initialBudgetWei > 0n) {
        const pyusd = new Contract(contracts.pyusdAddress, ERC20_ABI, signer);
        
        // Check current allowance
        const currentAllowance = await pyusd.allowance(userAddress, campaignAddress);
        
        if (currentAllowance < initialBudgetWei) {
          console.log('Approving PYUSD...');
          const approveTx = await pyusd.approve(campaignAddress, initialBudgetWei);
          await approveTx.wait();
          console.log('PYUSD approved');
        }

        // Deposit budget
        const campaign = new Contract(campaignAddress, CAMPAIGN_ABI, signer);
        console.log('Depositing budget...');
        const depositTx = await campaign.depositBudget(initialBudgetWei);
        await depositTx.wait();
        console.log('Budget deposited');
      }

      // 3. Register campaign with backend (optional)
      try {
        await fetch(`${BACKEND_URL}/api/campaigns/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignAddress,
            txHash: receipt.hash,
            brandAddress: userAddress
          })
        });
      } catch (err) {
        console.warn('Failed to register campaign with backend:', err);
      }

      setLoading(false);
      return { campaignAddress, txHash: receipt.hash };
    } catch (err: any) {
      console.error('Campaign creation failed:', err);
      setError(err.message || 'Failed to create campaign');
      setLoading(false);
      throw err;
    }
  };

  return {
    contracts,
    createCampaign,
    loading,
    error
  };
}
