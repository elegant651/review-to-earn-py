// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Campaign.sol";

/**
 * @title CampaignFactory
 * @notice Factory contract for creating and managing review reward campaigns
 * @dev Deploys individual Campaign contracts with escrowed PYUSD budgets
 */
contract CampaignFactory {
    // State
    address public immutable pyusdToken;
    address[] public allCampaigns;
    mapping(address => address[]) public brandCampaigns;
    mapping(address => bool) public isCampaign;
    
    // Events
    event CampaignCreated(
        address indexed campaign,
        address indexed brand,
        uint256 startTime,
        uint256 endTime,
        uint256 maxPayoutPerReview,
        uint256 maxParticipants,
        bytes32 rulesHash
    );
    
    // Errors
    error InvalidParameters();
    
    constructor(address _pyusdToken) {
        require(_pyusdToken != address(0), "Invalid token address");
        pyusdToken = _pyusdToken;
    }
    
    /**
     * @notice Create a new campaign
     * @param startTime Campaign start timestamp
     * @param endTime Campaign end timestamp
     * @param maxPayoutPerReview Maximum PYUSD payout per review
     * @param maxParticipants Maximum number of participants
     * @param rulesHash Hash of campaign rules (IPFS hash or similar)
     * @return campaign Address of the created campaign contract
     */
    function createCampaign(
        uint256 startTime,
        uint256 endTime,
        uint256 maxPayoutPerReview,
        uint256 maxParticipants,
        bytes32 rulesHash
    ) external returns (address campaign) {
        if (startTime >= endTime) revert InvalidParameters();
        if (maxPayoutPerReview == 0) revert InvalidParameters();
        if (maxParticipants == 0) revert InvalidParameters();
        
        // Deploy new campaign contract
        Campaign newCampaign = new Campaign(
            msg.sender,
            pyusdToken,
            startTime,
            endTime,
            maxPayoutPerReview,
            maxParticipants,
            rulesHash
        );
        
        campaign = address(newCampaign);
        
        // Track campaign
        allCampaigns.push(campaign);
        brandCampaigns[msg.sender].push(campaign);
        isCampaign[campaign] = true;
        
        emit CampaignCreated(
            campaign,
            msg.sender,
            startTime,
            endTime,
            maxPayoutPerReview,
            maxParticipants,
            rulesHash
        );
        
        return campaign;
    }
    
    /**
     * @notice Get all campaigns
     */
    function getAllCampaigns() external view returns (address[] memory) {
        return allCampaigns;
    }
    
    /**
     * @notice Get campaigns by brand
     */
    function getBrandCampaigns(address brand) external view returns (address[] memory) {
        return brandCampaigns[brand];
    }
    
    /**
     * @notice Get total number of campaigns
     */
    function getCampaignCount() external view returns (uint256) {
        return allCampaigns.length;
    }
    
    /**
     * @notice Check if address is a campaign
     */
    function isValidCampaign(address campaign) external view returns (bool) {
        return isCampaign[campaign];
    }
}
