// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IOPNAssetRegistry {
    enum PurchaseModel { FIXED, WEIGHTED }
    
    function getAssetCreator(uint256 _assetId) external view returns (address);
    function getAssetModel(uint256 _assetId) external view returns (PurchaseModel);
    function isAssetActive(uint256 _assetId) external view returns (bool);
    function getAssetSupplyInfo(uint256 _assetId) external view returns (uint256,uint256,uint256,uint256);
    function getAssetLimits(uint256 _assetId) external view returns (uint256,uint256,uint256);
    function getAvailableSupply(uint256 _assetId) external view returns (uint256);
    function calculatePurchaseCost(uint256 _assetId, uint256 _amount) external view returns (uint256);
    function recordSale(uint256 _assetId, uint256 _tokensOrWeight, uint256 _revenue) external;
}

interface IOPNPositionNFT {
    function mintPosition(uint256 _assetId, address _owner, uint256 _amount, uint256 _purchasePrice) external returns (uint256);
    function getUserPositionCount(address _user, uint256 _assetId) external view returns (uint256);
    function getUserPositions(address _user, uint256 _assetId) external view returns (uint256[] memory);
    function positions(uint256) external view returns (uint256,uint256,address,uint256,uint256,uint256,uint256,uint256,uint256);
}

/**
 * @title OPNPrimaryMarket - FINAL VERSION with 18-DECIMAL PRECISION
 * @notice Primary market for purchasing tokenized assets
 * @dev ✅ UPGRADED: purchaseWeighted now accepts wei-units instead of basis points
 */
contract OPNPrimaryMarket is AccessControl, ReentrancyGuard, Pausable {
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    IOPNAssetRegistry public assetRegistry;
    IOPNPositionNFT public positionNFT;
    
    address public feeRecipient;
    uint256 public platformFee = 250; // 2.5%
    
    event FractionsPurchased(
        uint256 indexed assetId,
        address indexed buyer,
        uint256 amount,
        uint256 cost,
        uint256 fee,
        uint256 indexed positionId
    );
    event PlatformFeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address newRecipient);
    
    constructor(
        address _assetRegistry,
        address _positionNFT,
        address _feeRecipient
    ) {
        require(_assetRegistry != address(0), "Invalid registry");
        require(_positionNFT != address(0), "Invalid position NFT");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        assetRegistry = IOPNAssetRegistry(_assetRegistry);
        positionNFT = IOPNPositionNFT(_positionNFT);
        feeRecipient = _feeRecipient;
    }
    
    // =========================================================================
    // PURCHASE FUNCTIONS - CLEAN, NO COMMAS!
    // =========================================================================
    
    function purchaseFixed(uint256 _assetId, uint256 _tokenAmount) 
        external payable nonReentrant whenNotPaused 
    {
        // Get asset info using clean helper functions
        address creator = assetRegistry.getAssetCreator(_assetId);
        IOPNAssetRegistry.PurchaseModel model = assetRegistry.getAssetModel(_assetId);
        bool isActive = assetRegistry.isAssetActive(_assetId);
        
        (uint256 minPurchase, uint256 maxPurchase, uint256 maxPositions) = 
            assetRegistry.getAssetLimits(_assetId);
        
        require(isActive, "Asset not active");
        require(model == IOPNAssetRegistry.PurchaseModel.FIXED, "Not fixed model");
        require(_tokenAmount > 0, "Invalid amount");
        require(_tokenAmount >= minPurchase, "Below minimum");
        
        // Check max purchase limit (total holdings)
        uint256 userPositionCount = positionNFT.getUserPositionCount(msg.sender, _assetId);
        
        if (maxPurchase > 0) {
            uint256 currentHoldings = 0;
            if (userPositionCount > 0) {
                uint256[] memory userPositions = positionNFT.getUserPositions(msg.sender, _assetId);
                if (userPositions.length > 0) {
                    // Get position amount cleanly - position struct field 4
                    (, , , uint256 amount, , , , , ) = positionNFT.positions(userPositions[0]);
                    currentHoldings = amount;
                }
            }
            require(currentHoldings + _tokenAmount <= maxPurchase, "Exceeds maximum");
        }
        
        // Check max positions per user
        if (maxPositions > 0) {
            require(userPositionCount < maxPositions, "Max positions reached");
        }
        
        // Check available supply
        uint256 available = assetRegistry.getAvailableSupply(_assetId);
        require(_tokenAmount <= available, "Insufficient supply");
        
        // Calculate costs
        uint256 cost = assetRegistry.calculatePurchaseCost(_assetId, _tokenAmount);
        uint256 fee = (cost * platformFee) / 10000;
        uint256 totalCost = cost + fee;
        
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Record sale in registry
        assetRegistry.recordSale(_assetId, _tokenAmount, cost);
        
        // Mint position NFT (will auto-merge if user already has position)
        uint256 positionId = positionNFT.mintPosition(_assetId, msg.sender, _tokenAmount, cost);
        
        // Transfer payments
        if (fee > 0) {
            payable(feeRecipient).transfer(fee);
        }
        payable(creator).transfer(cost);
        
        // Refund excess
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit FractionsPurchased(_assetId, msg.sender, _tokenAmount, cost, fee, positionId);
    }
    
    /**
     * @notice Purchase weighted ownership asset
     * @dev ✅ UPGRADED: _weightWeiUnits is in wei-units (1e18 = 100%)
     *      Example: 1e16 = 1%, 1e15 = 0.1%, etc.
     */
    function purchaseWeighted(uint256 _assetId, uint256 _weightWeiUnits) 
        external payable nonReentrant whenNotPaused 
    {
        // Get asset info using clean helper functions
        address creator = assetRegistry.getAssetCreator(_assetId);
        IOPNAssetRegistry.PurchaseModel model = assetRegistry.getAssetModel(_assetId);
        bool isActive = assetRegistry.isAssetActive(_assetId);
        
        (uint256 minPurchase, uint256 maxPurchase, uint256 maxPositions) = 
            assetRegistry.getAssetLimits(_assetId);
        
        require(isActive, "Asset not active");
        require(model == IOPNAssetRegistry.PurchaseModel.WEIGHTED, "Not weighted model");
        require(_weightWeiUnits > 0, "Invalid weight");
        require(_weightWeiUnits >= minPurchase, "Below minimum");
        
        // Check max purchase limit (total holdings)
        uint256 userPositionCount = positionNFT.getUserPositionCount(msg.sender, _assetId);
        
        if (maxPurchase > 0) {
            uint256 currentHoldings = 0;
            if (userPositionCount > 0) {
                uint256[] memory userPositions = positionNFT.getUserPositions(msg.sender, _assetId);
                if (userPositions.length > 0) {
                    // Get position amount cleanly - position struct field 4
                    (, , , uint256 amount, , , , , ) = positionNFT.positions(userPositions[0]);
                    currentHoldings = amount;
                }
            }
            require(currentHoldings + _weightWeiUnits <= maxPurchase, "Exceeds maximum");
        }
        
        // Check max positions per user
        if (maxPositions > 0) {
            require(userPositionCount < maxPositions, "Max positions reached");
        }
        
        // Check available supply
        uint256 available = assetRegistry.getAvailableSupply(_assetId);
        require(_weightWeiUnits <= available, "Insufficient supply");
        
        // Calculate costs
        uint256 cost = assetRegistry.calculatePurchaseCost(_assetId, _weightWeiUnits);
        uint256 fee = (cost * platformFee) / 10000;
        uint256 totalCost = cost + fee;
        
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Record sale in registry
        assetRegistry.recordSale(_assetId, _weightWeiUnits, cost);
        
        // Mint position NFT
        uint256 positionId = positionNFT.mintPosition(_assetId, msg.sender, _weightWeiUnits, cost);
        
        // Transfer payments
        if (fee > 0) {
            payable(feeRecipient).transfer(fee);
        }
        payable(creator).transfer(cost);
        
        // Refund excess
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit FractionsPurchased(_assetId, msg.sender, _weightWeiUnits, cost, fee, positionId);
    }
    
    function calculateTotalCost(uint256 _assetId, uint256 _amount) 
        external view returns (uint256 cost, uint256 fee, uint256 total) 
    {
        cost = assetRegistry.calculatePurchaseCost(_assetId, _amount);
        fee = (cost * platformFee) / 10000;
        total = cost + fee;
    }
    
    // Admin functions
    function updatePlatformFee(uint256 _newFee) external onlyRole(ADMIN_ROLE) {
        require(_newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = _newFee;
        emit PlatformFeeUpdated(_newFee);
    }
    
    function updateFeeRecipient(address _newRecipient) external onlyRole(ADMIN_ROLE) {
        require(_newRecipient != address(0), "Invalid address");
        feeRecipient = _newRecipient;
        emit FeeRecipientUpdated(_newRecipient);
    }
    
    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
    
    receive() external payable {}
}