import { useState, useEffect } from 'react';
import { Campaign } from '../../types/campaign';
import { BACKEND_URL, BLOCKSCOUT_ADDRESS_BASE_URL } from '../../config';
import './CampaignList.css';

interface CampaignListProps {
  brandAddress?: string;
}

export function CampaignList({ brandAddress }: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, [brandAddress]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        brandAddress
          ? `${BACKEND_URL}/api/campaigns/brand/${brandAddress}`
          : `${BACKEND_URL}/api/campaigns`
      );

      if (!response.ok) throw new Error('Failed to fetch campaigns');

      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPYUSD = (amount: string) => {
    return `${(parseFloat(amount) / 1e6).toFixed(2)} PYUSD`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getStatus = (campaign: Campaign) => {
    const now = Date.now() / 1000;
    if (!campaign.isActive) return 'Ended';
    if (now < campaign.startTime) return 'Upcoming';
    if (now > campaign.endTime) return 'Expired';
    return 'Active';
  };

  if (loading) {
    return <div className="campaign-list-loading">Loading campaigns...</div>;
  }

  if (error) {
    return <div className="campaign-list-error">Error: {error}</div>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="campaign-list-empty">
        <p>No campaigns found</p>
        <button className="btn btn-primary">Create Campaign</button>
      </div>
    );
  }

  return (
    <div className="campaign-list">
      <h2>Campaigns</h2>
      <div className="campaigns-grid">
        {campaigns.map((campaign) => (
          <div key={campaign.address} className="campaign-card">
            <div className="campaign-header">
              <span className={`campaign-status status-${getStatus(campaign).toLowerCase()}`}>
                {getStatus(campaign)}
              </span>
              <span className="campaign-address">{campaign.address.slice(0, 10)}...</span>
            </div>

            <div className="campaign-stats">
              <div className="stat">
                <span className="stat-label">Total Budget</span>
                <span className="stat-value">{formatPYUSD(campaign.totalBudget)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Remaining</span>
                <span className="stat-value">{formatPYUSD(campaign.remainingBudget)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Paid Out</span>
                <span className="stat-value">{formatPYUSD(campaign.totalPaidOut)}</span>
              </div>
            </div>

            <div className="campaign-info">
              <div className="info-row">
                <span>Participants</span>
                <span>{campaign.participantCount} / {campaign.maxParticipants}</span>
              </div>
              <div className="info-row">
                <span>Max Payout</span>
                <span>{formatPYUSD(campaign.maxPayoutPerReview)}</span>
              </div>
              <div className="info-row">
                <span>Duration</span>
                <span>{formatDate(campaign.startTime)} - {formatDate(campaign.endTime)}</span>
              </div>
            </div>

            <div className="campaign-actions">
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => window.open(`${BLOCKSCOUT_ADDRESS_BASE_URL}${campaign.address}`, '_blank')}
              >
                View on Blockscout
              </button>
              {campaign.isActive && (
                <button className="btn btn-primary btn-sm">Manage</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
