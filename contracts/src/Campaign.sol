// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC20.sol";

/**
 * @title Campaign
 * @notice Individual campaign contract that holds PYUSD budget and manages payouts
 * @dev Created by CampaignFactory, manages escrowed budget for review rewards
 */
contract Campaign {
    // Campaign parameters
    address public immutable brand;
    address public immutable pyusdToken;
    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable maxPayoutPerReview;
    uint256 public immutable maxParticipants;
    bytes32 public immutable rulesHash;
    
    // Campaign state
    uint256 public totalBudget;
    uint256 public remainingBudget;
    uint256 public totalPaidOut;
    uint256 public participantCount;
    bool public isActive;
    
    // Tracking
    mapping(address => uint256) public userRewards;
    mapping(address => bool) public hasParticipated;
    
    // Events
    event BudgetDeposited(uint256 amount, uint256 newTotal);
    event RewardPaid(address indexed user, uint256 amount, uint256 score);
    event BudgetWithdrawn(address indexed brand, uint256 amount);
    event CampaignEnded();
    
    // Errors
    error Unauthorized();
    error CampaignNotActive();
    error CampaignNotEnded();
    error InsufficientBudget();
    error MaxParticipantsReached();
    error AlreadyParticipated();
    error InvalidAmount();
    error TransferFailed();
    
    modifier onlyBrand() {
        if (msg.sender != brand) revert Unauthorized();
        _;
    }
    
    modifier whenActive() {
        if (!isActive) revert CampaignNotActive();
        if (block.timestamp < startTime || block.timestamp > endTime) revert CampaignNotActive();
        _;
    }
    
    constructor(
        address _brand,
        address _pyusdToken,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _maxPayoutPerReview,
        uint256 _maxParticipants,
        bytes32 _rulesHash
    ) {
        require(_brand != address(0), "Invalid brand address");
        require(_pyusdToken != address(0), "Invalid token address");
        require(_startTime < _endTime, "Invalid time range");
        require(_maxPayoutPerReview > 0, "Invalid max payout");
        
        brand = _brand;
        pyusdToken = _pyusdToken;
        startTime = _startTime;
        endTime = _endTime;
        maxPayoutPerReview = _maxPayoutPerReview;
        maxParticipants = _maxParticipants;
        rulesHash = _rulesHash;
        isActive = true;
    }
    
    /**
     * @notice Deposit PYUSD budget into campaign
     * @param amount Amount of PYUSD to deposit
     */
    function depositBudget(uint256 amount) external onlyBrand {
        if (amount == 0) revert InvalidAmount();
        
        IERC20 token = IERC20(pyusdToken);
        uint256 balanceBefore = token.balanceOf(address(this));
        
        // Transfer tokens from brand to this contract
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        uint256 balanceAfter = token.balanceOf(address(this));
        uint256 actualAmount = balanceAfter - balanceBefore;
        
        totalBudget += actualAmount;
        remainingBudget += actualAmount;
        
        emit BudgetDeposited(actualAmount, totalBudget);
    }
    
    /**
     * @notice Pay reward to user for their review
     * @param user Address of the reviewer
     * @param score Review quality score (0-100)
     * @dev Called by authorized backend/oracle
     */
    function payReward(address user, uint256 score) external onlyBrand whenActive {
        if (hasParticipated[user]) revert AlreadyParticipated();
        if (participantCount >= maxParticipants) revert MaxParticipantsReached();
        
        // Calculate reward based on score (simple linear: score/100 * maxPayout)
        uint256 rewardAmount = (maxPayoutPerReview * score) / 100;
        
        if (rewardAmount > remainingBudget) revert InsufficientBudget();
        if (rewardAmount == 0) revert InvalidAmount();
        
        // Update state
        hasParticipated[user] = true;
        participantCount++;
        userRewards[user] = rewardAmount;
        remainingBudget -= rewardAmount;
        totalPaidOut += rewardAmount;
        
        // Transfer reward
        IERC20 token = IERC20(pyusdToken);
        require(token.transfer(user, rewardAmount), "Transfer failed");
        
        emit RewardPaid(user, rewardAmount, score);
    }
    
    /**
     * @notice Withdraw remaining budget after campaign ends
     */
    function withdrawRemainder() external onlyBrand {
        if (block.timestamp <= endTime) revert CampaignNotEnded();
        
        uint256 amount = remainingBudget;
        if (amount == 0) revert InvalidAmount();
        
        remainingBudget = 0;
        isActive = false;
        
        IERC20 token = IERC20(pyusdToken);
        require(token.transfer(brand, amount), "Transfer failed");
        
        emit BudgetWithdrawn(brand, amount);
        emit CampaignEnded();
    }
    
    /**
     * @notice End campaign early (emergency)
     */
    function endCampaign() external onlyBrand {
        isActive = false;
        emit CampaignEnded();
    }
    
    /**
     * @notice Get campaign info
     */
    function getCampaignInfo() external view returns (
        address _brand,
        uint256 _totalBudget,
        uint256 _remainingBudget,
        uint256 _totalPaidOut,
        uint256 _participantCount,
        uint256 _maxParticipants,
        uint256 _startTime,
        uint256 _endTime,
        bool _isActive
    ) {
        return (
            brand,
            totalBudget,
            remainingBudget,
            totalPaidOut,
            participantCount,
            maxParticipants,
            startTime,
            endTime,
            isActive
        );
    }
}
