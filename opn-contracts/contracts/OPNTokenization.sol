// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title OPNTokenization
 * @dev Tokenization contract where only admins can create assets
 * @notice No KYC required for users to buy/sell
 */
contract OPNTokenization is ERC1155, AccessControl, ReentrancyGuard, Pausable, IERC1155Receiver {
    uint256 private _tokenIdCounter;

    // Admin role for creating assets
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Platform fee (basis points - 250 = 2.5%)
    uint256 public platformFee = 250;
    address public feeRecipient;

    // Structs
    struct AssetDetails {
        uint256 tokenId;
        address creator;
        string assetType;
        string assetName;
        string assetDescription;
        string assetImageUrl;
        uint256 totalSupply;
        uint256 availableSupply;
        uint256 pricePerFraction;
        uint256 minPurchaseAmount;
        uint256 maxPurchaseAmount;
        bool isActive;
        uint256 totalRevenue;
        uint256 totalInvestors;
        uint256 createdAt;
    }

    // Mappings
    mapping(uint256 => AssetDetails) public assetDetails;
    mapping(address => uint256[]) public userTokens;
    mapping(uint256 => mapping(address => uint256)) public userPurchases;
    mapping(uint256 => address[]) public assetHolders;
    
    // Active assets list
    uint256[] public activeAssetIds;

    // Events
    event AssetCreated(
        uint256 indexed tokenId,
        address indexed creator,
        string assetName,
        uint256 totalSupply,
        uint256 pricePerFraction
    );

    event FractionsPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 amount,
        uint256 totalCost
    );

    event AssetDeactivated(uint256 indexed tokenId);
    event PlatformFeeUpdated(uint256 newFee);

    constructor(
        string memory _uri,
        address _feeRecipient
    ) ERC1155(_uri) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Add your admin wallet
        _grantRole(ADMIN_ROLE, 0xD715011858545620E23ac58dB8c9c1bE212A41E5);
        
        feeRecipient = _feeRecipient;
    }

    // ============ Admin Functions (Create Assets) ============

    /**
     * @dev Create a new tokenized asset (Admin only)
     * @notice Only admins can create assets, no KYC or approval needed
     */
    function createAsset(
        string memory _assetType,
        string memory _assetName,
        string memory _assetDescription,
        string memory _assetImageUrl,
        uint256 _totalSupply,
        uint256 _pricePerFraction,
        uint256 _minPurchaseAmount,
        uint256 _maxPurchaseAmount
    ) external onlyRole(ADMIN_ROLE) whenNotPaused returns (uint256) {
        require(_totalSupply > 0, "Total supply must be greater than 0");
        require(_pricePerFraction > 0, "Price must be greater than 0");
        require(bytes(_assetName).length > 0, "Asset name cannot be empty");
        require(_minPurchaseAmount <= _totalSupply, "Min purchase too high");
        require(_maxPurchaseAmount == 0 || _maxPurchaseAmount <= _totalSupply, "Max purchase too high");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        // Create asset details
        assetDetails[tokenId] = AssetDetails({
            tokenId: tokenId,
            creator: msg.sender,
            assetType: _assetType,
            assetName: _assetName,
            assetDescription: _assetDescription,
            assetImageUrl: _assetImageUrl,
            totalSupply: _totalSupply,
            availableSupply: _totalSupply,
            pricePerFraction: _pricePerFraction,
            minPurchaseAmount: _minPurchaseAmount,
            maxPurchaseAmount: _maxPurchaseAmount,
            isActive: true,
            totalRevenue: 0,
            totalInvestors: 0,
            createdAt: block.timestamp
        });

        // Add to active assets
        activeAssetIds.push(tokenId);

        // Mint all tokens to the contract
        _mint(address(this), tokenId, _totalSupply, "");

        emit AssetCreated(
            tokenId,
            msg.sender,
            _assetName,
            _totalSupply,
            _pricePerFraction
        );

        return tokenId;
    }

    // ============ Public Functions (Buy/Sell) ============

    /**
     * @dev Purchase fractions of an asset
     * @notice No KYC required for purchasing
     */
    function purchaseFractions(uint256 _tokenId, uint256 _amount) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        AssetDetails storage asset = assetDetails[_tokenId];
        require(asset.isActive, "Asset not active");
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= asset.availableSupply, "Insufficient tokens available");
        
        // Check purchase limits
        require(_amount >= asset.minPurchaseAmount, "Below minimum purchase");
        if (asset.maxPurchaseAmount > 0) {
            uint256 currentHolding = balanceOf(msg.sender, _tokenId);
            require(currentHolding + _amount <= asset.maxPurchaseAmount, "Exceeds maximum allowed");
        }

        uint256 totalCost = asset.pricePerFraction * _amount;
        uint256 fee = (totalCost * platformFee) / 10000;
        uint256 totalWithFee = totalCost + fee;
        
        require(msg.value >= totalWithFee, "Insufficient payment");

        // Update state
        asset.availableSupply -= _amount;
        asset.totalRevenue += totalCost;
        
        // Track new investor
        if (balanceOf(msg.sender, _tokenId) == 0) {
            asset.totalInvestors++;
            assetHolders[_tokenId].push(msg.sender);
            userTokens[msg.sender].push(_tokenId);
        }
        
        userPurchases[_tokenId][msg.sender] += _amount;

        // Transfer tokens to buyer
        _safeTransferFrom(address(this), msg.sender, _tokenId, _amount, "");

        // Transfer payments
        if (fee > 0) {
            (bool feeSuccess, ) = feeRecipient.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }

        (bool creatorSuccess, ) = asset.creator.call{value: totalCost}("");
        require(creatorSuccess, "Creator payment failed");

        // Refund excess
        if (msg.value > totalWithFee) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - totalWithFee}("");
            require(refundSuccess, "Refund failed");
        }

        emit FractionsPurchased(_tokenId, msg.sender, _amount, totalWithFee);
    }

    // ============ Admin Management Functions ============

    /**
     * @dev Update platform fee (Admin only)
     */
    function updatePlatformFee(uint256 _newFee) external onlyRole(ADMIN_ROLE) {
        require(_newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = _newFee;
        emit PlatformFeeUpdated(_newFee);
    }

    /**
     * @dev Update fee recipient (Admin only)
     */
    function updateFeeRecipient(address _newRecipient) external onlyRole(ADMIN_ROLE) {
        require(_newRecipient != address(0), "Invalid address");
        feeRecipient = _newRecipient;
    }

    /**
     * @dev Deactivate an asset (Admin only)
     */
    function deactivateAsset(uint256 _tokenId) external onlyRole(ADMIN_ROLE) {
        assetDetails[_tokenId].isActive = false;
        emit AssetDeactivated(_tokenId);
    }

    /**
     * @dev Edit asset details (Admin only)
     */
    function editAsset(
        uint256 _tokenId,
        string memory _assetName,
        string memory _assetDescription,
        string memory _assetImageUrl,
        uint256 _pricePerFraction
    ) external onlyRole(ADMIN_ROLE) {
        AssetDetails storage asset = assetDetails[_tokenId];
        require(asset.tokenId == _tokenId, "Asset doesn't exist");
        
        asset.assetName = _assetName;
        asset.assetDescription = _assetDescription;
        asset.assetImageUrl = _assetImageUrl;
        asset.pricePerFraction = _pricePerFraction;
    }

    /**
     * @dev Pause/unpause contract (Admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ============ View Functions ============

    /**
     * @dev Get all active assets with pagination
     */
    function getActiveAssets(uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory assetIds, bool hasMore) 
    {
        uint256 totalActive = activeAssetIds.length;
        
        if (offset >= totalActive) {
            return (new uint256[](0), false);
        }
        
        uint256 end = offset + limit;
        if (end > totalActive) {
            end = totalActive;
        }
        
        uint256 length = end - offset;
        assetIds = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            assetIds[i] = activeAssetIds[offset + i];
        }
        
        hasMore = end < totalActive;
    }

    /**
     * @dev Get user's tokens
     */
    function getUserTokens(address _user) external view returns (uint256[] memory) {
        return userTokens[_user];
    }

    /**
     * @dev Get user's shares for an asset
     */
    function getUserShares(address _user, uint256 _tokenId) external view returns (uint256) {
        return balanceOf(_user, _tokenId);
    }

    /**
     * @dev Get asset holders
     */
    function getAssetHolders(uint256 _tokenId) external view returns (address[] memory) {
        return assetHolders[_tokenId];
    }

    /**
     * @dev Calculate purchase cost with fees
     */
    function calculatePurchaseCost(uint256 _tokenId, uint256 _amount) 
        external 
        view 
        returns (uint256 assetCost, uint256 fee, uint256 totalCost) 
    {
        AssetDetails storage asset = assetDetails[_tokenId];
        assetCost = asset.pricePerFraction * _amount;
        fee = (assetCost * platformFee) / 10000;
        totalCost = assetCost + fee;
    }

    /**
     * @dev Check if address is admin
     */
    function isAdmin(address account) external view returns (bool) {
        return hasRole(ADMIN_ROLE, account);
    }

    // ============ ERC1155 Receiver Functions (REQUIRED!) ============
    
    /**
     * @dev Handles the receipt of a single ERC1155 token type.
     */
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    /**
     * @dev Handles the receipt of a multiple ERC1155 token types.
     */
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    // ============ Required Overrides ============

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC1155Receiver).interfaceId || 
               super.supportsInterface(interfaceId);
    }
}