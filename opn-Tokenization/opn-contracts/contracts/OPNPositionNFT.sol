// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IOPNAssetRegistry {
    enum PurchaseModel { FIXED, WEIGHTED }
    
    function getAssetModel(uint256 _assetId) external view returns (PurchaseModel);
    function getAssetSupplyInfo(uint256 _assetId) external view returns (uint256,uint256,uint256,uint256);
    function getAssetRewards(uint256 _assetId) external view returns (uint256,uint256);
}

/**
 * @title OPNPositionNFT - FINAL VERSION with 18-DECIMAL PRECISION
 * @notice ERC721 NFT representing ownership positions with auto-merge
 * @dev ✅ UPGRADED: Supports wei-unit precision for weighted assets
 *      ✅ INCLUDES: Auto-merge, split with purchase price fix, rewards
 */
contract OPNPositionNFT is ERC721Enumerable, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    struct Position {
        uint256 positionId;
        uint256 assetId;
        address owner;
        uint256 amount; // ✅ UPGRADED: tokens for FIXED, wei-units for WEIGHTED
        uint256 purchasePrice; // ✅ FIXED: actual purchase price (not averaged)
        uint256 purchaseTimestamp;
        uint256 ethRewardsClaimed;
        uint256 usdcRewardsClaimed;
        uint256 lastClaimTimestamp;
    }
    
    IOPNAssetRegistry public assetRegistry;
    IERC20 public usdcToken;
    
    uint256 private _positionIdCounter;
    mapping(uint256 => Position) public positions;
    mapping(address => mapping(uint256 => uint256[])) private userAssetPositions;
    
    event PositionMinted(uint256 indexed positionId, uint256 indexed assetId, address indexed owner, uint256 amount, uint256 purchasePrice);
    event PositionSplit(uint256 indexed originalPositionId, uint256 indexed newPositionId, uint256 originalAmount, uint256 splitAmount);
    event PositionMerged(uint256 indexed keepPositionId, uint256 indexed burnPositionId, uint256 newTotalAmount);
    event RewardsClaimed(uint256 indexed positionId, address indexed owner, uint256 ethAmount, uint256 usdcAmount);
    
    constructor(address _assetRegistry, address _usdcToken) 
        ERC721("OPN Position NFT", "OPNPOS") 
    {
        require(_assetRegistry != address(0), "Invalid registry address");
        require(_usdcToken != address(0), "Invalid USDC address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        assetRegistry = IOPNAssetRegistry(_assetRegistry);
        usdcToken = IERC20(_usdcToken);
    }
    
    /**
     * @notice Mint position with auto-merge
     * @dev ✅ FEATURE: Auto-merges into existing position if user has one
     */
    function mintPosition(
        uint256 _assetId,
        address _owner,
        uint256 _amount,
        uint256 _purchasePrice
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(_owner != address(0), "Invalid owner");
        require(_amount > 0, "Invalid amount");
        
        // Check if user already has a position for this asset (auto-merge)
        uint256[] storage userPositions = userAssetPositions[_owner][_assetId];
        
        if (userPositions.length > 0) {
            // User has existing position - merge into it
            uint256 existingPositionId = userPositions[0];
            Position storage existingPos = positions[existingPositionId];
            
            // Calculate weighted average purchase price
            uint256 totalValue = (existingPos.amount * existingPos.purchasePrice) + (_amount * _purchasePrice);
            uint256 newTotalAmount = existingPos.amount + _amount;
            existingPos.purchasePrice = totalValue / newTotalAmount;
            existingPos.amount = newTotalAmount;
            
            emit PositionMerged(existingPositionId, 0, newTotalAmount);
            return existingPositionId;
        } else {
            // First position for this asset - mint new
            uint256 positionId = _positionIdCounter++;
            
            _safeMint(_owner, positionId);
            
            positions[positionId] = Position({
                positionId: positionId,
                assetId: _assetId,
                owner: _owner,
                amount: _amount,
                purchasePrice: _purchasePrice,
                purchaseTimestamp: block.timestamp,
                ethRewardsClaimed: 0,
                usdcRewardsClaimed: 0,
                lastClaimTimestamp: 0
            });
            
            userPositions.push(positionId);
            
            emit PositionMinted(positionId, _assetId, _owner, _amount, _purchasePrice);
            return positionId;
        }
    }
    
    /**
     * @notice Split position for secondary market
     * @dev ✅ FIXED: Uses buyer's actual purchase price via _newPurchasePrice parameter
     */
    function splitPosition(uint256 _positionId, uint256 _amountToSplit, address _recipient, uint256 _newPurchasePrice) 
        external onlyRole(MINTER_ROLE) returns (uint256) 
    {
        require(ownerOf(_positionId) != address(0), "Position not found");
        require(_recipient != address(0), "Invalid recipient");
        
        Position storage originalPos = positions[_positionId];
        require(_amountToSplit > 0 && _amountToSplit < originalPos.amount, "Invalid split amount");
        
        // Create new position with split amount
        uint256 newPositionId = _positionIdCounter++;
        
        _safeMint(_recipient, newPositionId);
        
        positions[newPositionId] = Position({
            positionId: newPositionId,
            assetId: originalPos.assetId,
            owner: _recipient,
            amount: _amountToSplit,
            purchasePrice: _newPurchasePrice, // ✅ FIXED: Uses buyer's actual price
            purchaseTimestamp: block.timestamp,
            ethRewardsClaimed: 0,
            usdcRewardsClaimed: 0,
            lastClaimTimestamp: 0
        });
        
        // Update original position
        originalPos.amount -= _amountToSplit;
        
        // Add to recipient's positions if they don't have one
        userAssetPositions[_recipient][originalPos.assetId].push(newPositionId);
        
        emit PositionSplit(_positionId, newPositionId, originalPos.amount, _amountToSplit);
        return newPositionId;
    }
    
    // =========================================================================
    // REWARD CLAIMING - WITH 18-DECIMAL PRECISION SUPPORT
    // =========================================================================
    
    function claimRewards(uint256 _positionId) external nonReentrant {
        require(ownerOf(_positionId) == msg.sender, "Not owner");
        _claimRewards(_positionId, true);
    }
    
    function _claimRewards(uint256 _positionId, bool _revertOnZero) private {
        Position storage pos = positions[_positionId];
        
        // Get asset info using clean helper functions
        IOPNAssetRegistry.PurchaseModel model = assetRegistry.getAssetModel(pos.assetId);
        (uint256 totalSupply, uint256 soldTokens, , uint256 soldWeight) = 
            assetRegistry.getAssetSupplyInfo(pos.assetId);
        (uint256 ethPool, uint256 usdcPool) = 
            assetRegistry.getAssetRewards(pos.assetId);
        
        uint256 ethReward = 0;
        uint256 usdcReward = 0;
        
        if (model == IOPNAssetRegistry.PurchaseModel.FIXED) {
            // FIXED: Use soldTokens as denominator
            uint256 divisor = soldTokens > 0 ? soldTokens : totalSupply;
            ethReward = (ethPool * pos.amount) / divisor;
            usdcReward = (usdcPool * pos.amount) / divisor;
        } else {
            // WEIGHTED: ✅ UPGRADED: Use soldWeight (in wei-units) as denominator
            uint256 divisor = soldWeight > 0 ? soldWeight : 1e18;
            ethReward = (ethPool * pos.amount) / divisor;
            usdcReward = (usdcPool * pos.amount) / divisor;
        }
        
        // Subtract already claimed
        ethReward = ethReward > pos.ethRewardsClaimed ? ethReward - pos.ethRewardsClaimed : 0;
        usdcReward = usdcReward > pos.usdcRewardsClaimed ? usdcReward - pos.usdcRewardsClaimed : 0;
        
        if (_revertOnZero) {
            require(ethReward > 0 || usdcReward > 0, "No rewards available");
        }
        
        if (ethReward > 0 || usdcReward > 0) {
            pos.lastClaimTimestamp = block.timestamp;
            
            // Check actual balance before transfer
            if (ethReward > 0) {
                uint256 availableETH = address(this).balance;
                uint256 actualETH = ethReward > availableETH ? availableETH : ethReward;
                if (actualETH > 0) {
                    pos.ethRewardsClaimed += actualETH;
                    payable(pos.owner).transfer(actualETH);
                }
            }
            
            // Check actual balance and use SafeERC20
            if (usdcReward > 0) {
                uint256 availableUSDC = usdcToken.balanceOf(address(this));
                uint256 actualUSDC = usdcReward > availableUSDC ? availableUSDC : usdcReward;
                if (actualUSDC > 0) {
                    pos.usdcRewardsClaimed += actualUSDC;
                    usdcToken.safeTransfer(pos.owner, actualUSDC);
                }
            }
            
            emit RewardsClaimed(_positionId, pos.owner, ethReward, usdcReward);
        }
    }
    
    function calculatePendingRewards(uint256 _positionId) 
        external view returns (uint256 ethReward, uint256 usdcReward) 
    {
        Position storage pos = positions[_positionId];
        
        // Get asset info using clean helper functions
        IOPNAssetRegistry.PurchaseModel model = assetRegistry.getAssetModel(pos.assetId);
        (uint256 totalSupply, uint256 soldTokens, , uint256 soldWeight) = 
            assetRegistry.getAssetSupplyInfo(pos.assetId);
        (uint256 ethPool, uint256 usdcPool) = 
            assetRegistry.getAssetRewards(pos.assetId);
        
        if (model == IOPNAssetRegistry.PurchaseModel.FIXED) {
            uint256 divisor = soldTokens > 0 ? soldTokens : totalSupply;
            ethReward = (ethPool * pos.amount) / divisor;
            usdcReward = (usdcPool * pos.amount) / divisor;
        } else {
            // ✅ UPGRADED: wei-unit precision
            uint256 divisor = soldWeight > 0 ? soldWeight : 1e18;
            ethReward = (ethPool * pos.amount) / divisor;
            usdcReward = (usdcPool * pos.amount) / divisor;
        }
        
        ethReward = ethReward > pos.ethRewardsClaimed ? ethReward - pos.ethRewardsClaimed : 0;
        usdcReward = usdcReward > pos.usdcRewardsClaimed ? usdcReward - pos.usdcRewardsClaimed : 0;
    }
    
    // View functions
    function getUserPositions(address _user, uint256 _assetId) 
        external view returns (uint256[] memory) 
    {
        return userAssetPositions[_user][_assetId];
    }
    
    function getUserPositionCount(address _user, uint256 _assetId) 
        external view returns (uint256) 
    {
        return userAssetPositions[_user][_assetId].length;
    }
    
    function getPositionDetails(uint256 _positionId) 
        external view returns (Position memory) 
    {
        return positions[_positionId];
    }
    
    // Override transfer to update owner in position struct
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override(ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
        
        if (from != address(0) && to != address(0)) {
            positions[firstTokenId].owner = to;
        }
    }
    
    function supportsInterface(bytes4 interfaceId)
        public view virtual override(ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    receive() external payable {}
}