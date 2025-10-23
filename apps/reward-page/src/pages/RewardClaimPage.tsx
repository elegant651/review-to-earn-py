import { useState, useEffect } from 'react';
import { useNotification, useTransactionPopup } from '@blockscout/app-sdk';
import { useMetaMask } from '../hooks/useMetaMask';
import { RewardParams, RewardResponse } from '../types';
import { BACKEND_URL, REWARD_AMOUNT, BLOCKSCOUT_CHAIN_ID, BLOCKSCOUT_TX_BASE_URL } from '../config';

type StatusType = 'info' | 'success' | 'error';

export function RewardClaimPage() {
  const { isInstalled, address, isConnecting, error: walletError, connect, signMessage } = useMetaMask();
  const [rewardParams, setRewardParams] = useState<RewardParams | null>(null);
  const [status, setStatus] = useState<{ message: string; type: StatusType } | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { openTxToast } = useNotification();
  const { openPopup } = useTransactionPopup();

  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus({ message: 'Invalid or missing token. Please try again.', type: 'error' });
      return;
    }

    // Fetch reward data from backend using token
    const fetchRewardData = async () => {
      try {
        setStatus({ message: 'Loading reward data...', type: 'info' });
        const response = await fetch(`${BACKEND_URL}/token/${token}`);

        if (!response.ok) {
          if (response.status === 404) {
            setStatus({ message: 'Token not found. Please try again.', type: 'error' });
          } else if (response.status === 410) {
            setStatus({ message: 'Token has expired. Please try again.', type: 'error' });
          } else {
            setStatus({ message: 'Failed to load reward data.', type: 'error' });
          }
          return;
        }

        const data = await response.json();

        if (data.ok && data.review && data.score) {
          // Store full score object and optional campaign address
          setRewardParams({
            review: data.review,
            score: data.score,
            campaignAddress: data.campaignAddress // Optional
          });
          setStatus(null);
        } else {
          setStatus({ message: 'Invalid reward data received.', type: 'error' });
        }
      } catch (error) {
        console.error('Error fetching reward data:', error);
        setStatus({ message: 'Failed to load reward data. Please try again.', type: 'error' });
      }
    };

    fetchRewardData();
  }, []);

  useEffect(() => {
    if (walletError) {
      setStatus({ message: walletError, type: 'error' });
    }
  }, [walletError]);

  useEffect(() => {
    if (!txHash) {
      return;
    }

    openTxToast(BLOCKSCOUT_CHAIN_ID, txHash).catch((err) => {
      console.error('Unable to open Blockscout toast:', err);
    });
  }, [txHash, openTxToast]);

  const handleConnect = async () => {
    const connectedAddress = await connect();
    if (connectedAddress) {
      setStatus({ message: 'Wallet connected! Click below to sign and claim your reward.', type: 'success' });
    }
  };

  const handleClaim = async () => {
    if (!address || !rewardParams) {
      setStatus({ message: 'Missing wallet or reward parameters.', type: 'error' });
      return;
    }

    try {
      setIsClaiming(true);
      setStatus({ message: 'Processing reward claim...', type: 'info' });

      // Calculate overall score for display
      const overallScore = Math.round(
        (rewardParams.score.quality + (100 - rewardParams.score.spam) + rewardParams.score.sentiment) / 3
      );

      // Choose endpoint based on whether this is a campaign reward
      const endpoint = rewardParams.campaignAddress ? '/payReward' : '/reward';
      console.log('rewardParams', rewardParams)
      let requestBody: any;

      if (rewardParams.campaignAddress) {
        console.log('Campaign-based reward');
        // Campaign-based reward
        requestBody = {
          campaignAddress: rewardParams.campaignAddress,
          userAddress: address,
          review: rewardParams.review,
          score: rewardParams.score
        };
      } else {
        // Direct reward (legacy)
        setStatus({ message: 'Requesting signature...', type: 'info' });
        const message = `Sign this message to verify your wallet ownership and claim your PYUSD reward.\n\nAddress: ${address}\nScore: ${overallScore}\nTimestamp: ${Date.now()}`;
        const signature = await signMessage(message);

        requestBody = {
          address,
          signature,
          review: rewardParams.review,
          score: rewardParams.score
        };
      }

      setStatus({ message: 'Sending reward request...', type: 'info' });

      // Send reward request to backend
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data: RewardResponse = await response.json();

      if (response.ok && data.txHash) {
        setTxHash(data.txHash);
        const successMsg = rewardParams.campaignAddress
          ? '🎉 Campaign reward sent successfully!'
          : '🎉 Reward sent successfully!';
        setStatus({ message: successMsg, type: 'success' });
      } else {
        // Parse error messages
        let errorMsg = data.error || 'Unknown error';
        if (errorMsg === 'insufficient_campaign_budget') {
          errorMsg = 'Campaign has insufficient budget';
        } else if (errorMsg === 'user_already_claimed') {
          errorMsg = 'You have already claimed from this campaign';
        } else if (errorMsg === 'campaign_full') {
          errorMsg = 'Campaign has reached maximum participants';
        } else if (errorMsg === 'campaign_not_active') {
          errorMsg = 'Campaign is not currently active';
        } else if (errorMsg === 'low_quality') {
          errorMsg = 'Review quality score is too low';
        } else if (errorMsg === 'high_spam') {
          errorMsg = 'Review flagged as potential spam';
        }
        setStatus({ message: `Reward failed: ${errorMsg}`, type: 'error' });
      }
    } catch (err: any) {
      console.error('Claim error:', err);
      setStatus({ message: err.message || 'Failed to claim reward', type: 'error' });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleViewHistory = () => {
    openPopup({
      chainId: BLOCKSCOUT_CHAIN_ID,
      address: address || undefined
    });
  };

  if (!rewardParams) {
    return (
      <div className="container">
        <h1>Loading...</h1>
        {status && (
          <div className={`status-message status-${status.type}`}>
            {status.message}
          </div>
        )}
      </div>
    );
  }

  // Calculate overall score for display
  const overallScore = Math.round(
    (rewardParams.score.quality + (100 - rewardParams.score.spam) + rewardParams.score.sentiment) / 3
  );

  return (
    <div className="container">
      <h1>🎉 Claim Your Reward</h1>
      <p className="subtitle">
        {rewardParams.campaignAddress
          ? 'Connect your wallet to claim your campaign reward'
          : 'Connect your wallet to receive PYUSD for your helpful review'}
      </p>

      <div className="info-card">
        <div className="info-row">
          <span className="info-label">Review Score</span>
          <span className="score-badge">{overallScore}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Reward Amount</span>
          <span className="info-value">{rewardParams.campaignAddress ? 'Based on score' : REWARD_AMOUNT}</span>
        </div>
        {rewardParams.campaignAddress && (
          <div className="info-row">
            <span className="info-label">Campaign</span>
            <span className="info-value" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
              {rewardParams.campaignAddress.slice(0, 10)}...{rewardParams.campaignAddress.slice(-8)}
            </span>
          </div>
        )}
      </div>

      {status && (
        <div className={`status-message status-${status.type}`}>
          {status.message}
        </div>
      )}

      {address && (
        <div className="wallet-section">
          <div className="info-label">Connected Wallet</div>
          <div className="wallet-address">{address}</div>
          <div className="wallet-actions">
            <button className="btn btn-secondary" onClick={handleViewHistory}>
              View Wallet History
            </button>
          </div>
        </div>
      )}

      {!address ? (
        <button
          className="btn btn-primary"
          onClick={handleConnect}
          disabled={!isInstalled || isConnecting}
        >
          {isConnecting ? (
            <>
              <span className="loading-spinner"></span>
              Connecting...
            </>
          ) : !isInstalled ? (
            'MetaMask Not Found'
          ) : (
            'Connect MetaMask'
          )}
        </button>
      ) : txHash ? (
        <>
          <button className="btn btn-primary" disabled>
            ✓ Reward Claimed!
          </button>
          <a
            href={`${BLOCKSCOUT_TX_BASE_URL}${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            View on Blockscout
          </a>
        </>
      ) : (
        <button
          className="btn btn-primary"
          onClick={handleClaim}
          disabled={isClaiming}
        >
          {isClaiming ? (
            <>
              <span className="loading-spinner"></span>
              Processing...
            </>
          ) : (
            'Sign & Claim Reward'
          )}
        </button>
      )}

      {!txHash && (
        <button className="btn btn-secondary" onClick={() => window.history.back()}>
          Go Back
        </button>
      )}
    </div>
  );
}

