import { useState } from 'react';
import { useNotification } from '@blockscout/app-sdk';
import { useMetaMask } from '../hooks/useMetaMask';
import { useCampaignContract } from '../hooks/useCampaignContract';
import { CampaignList } from '../components/campaign/CampaignList';
import { BLOCKSCOUT_CHAIN_ID } from '../config';
import './CampaignsPage.css';

export function CampaignsPage() {
  const { isInstalled, address, isConnecting, connect } = useMetaMask();
  const { createCampaign, loading: contractLoading } = useCampaignContract();
  const { openTxToast } = useNotification();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [creationStatus, setCreationStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    maxPayoutPerReview: '',
    maxParticipants: '',
    initialBudget: '',
    rulesDescription: ''
  });

  const handleConnect = async () => {
    await connect();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      setCreationStatus('Please connect your wallet first');
      return;
    }

    setCreatingCampaign(true);
    setCreationStatus('Preparing campaign...');

    try {
      // Convert dates to timestamps
      const startTime = Math.floor(new Date(formData.startDate).getTime() / 1000);
      const endTime = Math.floor(new Date(formData.endDate).getTime() / 1000);

      // Hash rules (simple for now, should use IPFS in production)
      const encoder = new TextEncoder();
      const data = encoder.encode(formData.rulesDescription);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const rulesHash = `0x${hashHex.slice(0, 64)}`;

      setCreationStatus('Creating campaign on blockchain...');

      // Call smart contract via MetaMask
      const result = await createCampaign({
        startTime,
        endTime,
        maxPayoutPerReview: formData.maxPayoutPerReview,
        maxParticipants: parseInt(formData.maxParticipants),
        rulesHash,
        initialBudget: formData.initialBudget
      });

      console.log('Campaign created:', result);

      // Show Blockscout notification
      if (result.txHash) {
        openTxToast(BLOCKSCOUT_CHAIN_ID, result.txHash).catch(console.error);
      }

      setCreationStatus(`Campaign created successfully! Address: ${result.campaignAddress}`);

      // Reset form after delay
      setTimeout(() => {
        setShowCreateForm(false);
        setCreationStatus(null);
        setFormData({
          startDate: '',
          endDate: '',
          maxPayoutPerReview: '',
          maxParticipants: '',
          initialBudget: '',
          rulesDescription: ''
        });
      }, 3000);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      setCreationStatus(`Failed: ${error.message || 'Unknown error'}`);
    } finally {
      setCreatingCampaign(false);
    }
  };

  if (!address) {
    return (
      <div className="campaigns-page">
        <div className="connect-prompt">
          <h1>Campaign Management</h1>
          <p>Connect your wallet to create and manage campaigns</p>
          <button
            className="btn btn-primary"
            onClick={handleConnect}
            disabled={!isInstalled || isConnecting}
          >
            {isConnecting ? 'Connecting...' : !isInstalled ? 'MetaMask Not Found' : 'Connect MetaMask'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="campaigns-page">
      <div className="campaigns-header">
        <div>
          <h1>Campaign Management</h1>
          <p className="wallet-info">Connected: {address.slice(0, 6)}...{address.slice(-4)}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ Create Campaign'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-campaign-form">
          <h2>Create New Campaign</h2>
          <form onSubmit={handleCreateCampaign}>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="datetime-local"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="datetime-local"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Max Payout Per Review (PYUSD)</label>
                <input
                  type="number"
                  name="maxPayoutPerReview"
                  value={formData.maxPayoutPerReview}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0.01"
                  placeholder="0.10"
                  required
                />
              </div>
              <div className="form-group">
                <label>Max Participants</label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="1000"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Initial Budget (PYUSD)</label>
              <input
                type="number"
                name="initialBudget"
                value={formData.initialBudget}
                onChange={handleInputChange}
                step="0.01"
                min="0.01"
                placeholder="100.00"
                required
              />
              <small>You'll need to approve this amount before creating the campaign</small>
            </div>

            <div className="form-group">
              <label>Campaign Rules & Description</label>
              <textarea
                name="rulesDescription"
                value={formData.rulesDescription}
                onChange={handleInputChange}
                rows={4}
                placeholder="Describe your campaign rules, eligibility criteria, and reward conditions..."
                required
              />
            </div>

            {creationStatus && (
              <div className={`status-message ${creatingCampaign ? 'status-info' : creationStatus.includes('Failed') ? 'status-error' : 'status-success'}`}>
                {creationStatus}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
                disabled={creatingCampaign}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creatingCampaign}
              >
                {creatingCampaign ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      )}

      <CampaignList brandAddress={address} />
    </div>
  );
}
