// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IKYCRegistry {
    function isVerified(address user) external view returns (bool);
}

/**
 * @title OPNFractionalization
 * @dev Main contract for fractionalizing real-world assets into ERC1155 tokens
 */
contract OPNFractionalization is ERC1155, AccessControl, ReentrancyGuard, Pausable, IERC1155Receiver {
    // Replace Counters with simple uint256 variables
    uint256 private _requestIdCounter;
    uint256 private _tokenIdCounter;

    // Roles
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // KYC Registry contract
    IKYCRegistry public kycRegistry;

    // Platform fee (basis points - 250 = 2.5%)
    uint256 public platformFee = 250;
    address public feeRecipient;

    // Enums
    enum RequestStatus { Pending, Approved, Rejected }

    // Structs
    struct FractionalizationRequest {
        uint256 requestId;
        address proposer;
        string assetType;
        string assetName;
        string assetDescription;
        string assetImageUrl;
        uint256 totalFractions;
        uint256 pricePerFraction;
        bool requiresPurchaserKYC;
        RequestStatus status;
        uint256 tokenId; // Set when approved
        uint256 timestamp;
    }

    struct AssetDetails {
        uint256 tokenId;
        uint256 requestId;
        address creator;
        uint256 totalSupply;
        uint256 availableSupply;
        uint256 pricePerFraction;
        bool requiresPurchaserKYC;
        bool isActive;
        uint256 totalRevenue;
    }

    // Mappings
    mapping(uint256 => FractionalizationRequest) public requests;
    mapping(uint256 => AssetDetails) public assetDetails;
    mapping(address => uint256[]) public userRequests;
    mapping(address => uint256[]) public userTokens;
    mapping(uint256 => mapping(address => uint256)) public userPurchases;

    // Events
    event RequestCreated(
        uint256 indexed requestId,
        address indexed proposer,
        string assetName,
        uint256 totalFractions,
        uint256 pricePerFraction
    );

    event RequestApproved(
        uint256 indexed requestId,
        uint256 indexed tokenId,
        address indexed approver
    );

    event RequestRejected(
        uint256 indexed requestId,
        address indexed rejector,
        string reason
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
        address _kycRegistry,
        address _feeRecipient
    ) ERC1155(_uri) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender);
        
        kycRegistry = IKYCRegistry(_kycRegistry);
        feeRecipient = _feeRecipient;
    }

    // ============ Request Management ============

    /**
     * @dev Create a new fractionalization request
     */
    function createFractionalizationRequest(
        string memory _assetType,
        string memory _assetName,
        string memory _assetDescription,
        string memory _assetImageUrl,
        uint256 _totalFractions,
        uint256 _pricePerFraction,
        bool _requiresPurchaserKYC
    ) external whenNotPaused {
        require(kycRegistry.isVerified(msg.sender), "Proposer must be KYC verified");
        require(_totalFractions > 0, "Total fractions must be greater than 0");
        require(_pricePerFraction > 0, "Price per fraction must be greater than 0");
        require(bytes(_assetName).length > 0, "Asset name cannot be empty");

        uint256 requestId = _requestIdCounter;
        _requestIdCounter++;

        requests[requestId] = FractionalizationRequest({
            requestId: requestId,
            proposer: msg.sender,
            assetType: _assetType,
            assetName: _assetName,
            assetDescription: _assetDescription,
            assetImageUrl: _assetImageUrl,
            totalFractions: _totalFractions,
            pricePerFraction: _pricePerFraction,
            requiresPurchaserKYC: _requiresPurchaserKYC,
            status: RequestStatus.Pending,
            tokenId: 0,
            timestamp: block.timestamp
        });

        userRequests[msg.sender].push(requestId);

        emit RequestCreated(
            requestId,
            msg.sender,
            _assetName,
            _totalFractions,
            _pricePerFraction
        );
    }

    /**
     * @dev Approve a fractionalization request (Compliance Officer only)
     */
    function approveRequest(uint256 _requestId) 
        external 
        onlyRole(COMPLIANCE_ROLE) 
        whenNotPaused 
    {
        FractionalizationRequest storage request = requests[_requestId];
        require(request.status == RequestStatus.Pending, "Request not pending");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        request.status = RequestStatus.Approved;
        request.tokenId = tokenId;

        // Create asset details
        assetDetails[tokenId] = AssetDetails({
            tokenId: tokenId,
            requestId: _requestId,
            creator: request.proposer,
            totalSupply: request.totalFractions,
            availableSupply: request.totalFractions,
            pricePerFraction: request.pricePerFraction,
            requiresPurchaserKYC: request.requiresPurchaserKYC,
            isActive: true,
            totalRevenue: 0
        });

        // Mint all fractions to the contract
        _mint(address(this), tokenId, request.totalFractions, "");

        emit RequestApproved(_requestId, tokenId, msg.sender);
    }

    /**
     * @dev Reject a fractionalization request (Compliance Officer only)
     */
    function rejectRequest(uint256 _requestId, string memory _reason) 
        external 
        onlyRole(COMPLIANCE_ROLE) 
    {
        FractionalizationRequest storage request = requests[_requestId];
        require(request.status == RequestStatus.Pending, "Request not pending");

        request.status = RequestStatus.Rejected;

        emit RequestRejected(_requestId, msg.sender, _reason);
    }

    // ============ Marketplace Functions ============

    /**
     * @dev Purchase fractions of an asset
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
        require(_amount <= asset.availableSupply, "Insufficient fractions available");

        // Check KYC if required
        if (asset.requiresPurchaserKYC) {
            require(kycRegistry.isVerified(msg.sender), "Purchaser must be KYC verified");
        }

        uint256 totalCost = asset.pricePerFraction * _amount;
        require(msg.value >= totalCost, "Insufficient payment");

        // Calculate fees
        uint256 fee = (totalCost * platformFee) / 10000;
        uint256 creatorPayment = totalCost - fee;

        // Update state
        asset.availableSupply -= _amount;
        asset.totalRevenue += totalCost;
        userPurchases[_tokenId][msg.sender] += _amount;

        // Transfer fractions to buyer
        _safeTransferFrom(address(this), msg.sender, _tokenId, _amount, "");

        // Transfer payments
        if (fee > 0) {
            (bool feeSuccess, ) = feeRecipient.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }

        (bool creatorSuccess, ) = asset.creator.call{value: creatorPayment}("");
        require(creatorSuccess, "Creator payment failed");

        // Refund excess payment
        if (msg.value > totalCost) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - totalCost}("");
            require(refundSuccess, "Refund failed");
        }

        // Add to user's tokens if first purchase
        if (userPurchases[_tokenId][msg.sender] == _amount) {
            userTokens[msg.sender].push(_tokenId);
        }

        emit FractionsPurchased(_tokenId, msg.sender, _amount, totalCost);
    }

    // ============ Admin Functions ============

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
     * @dev Update KYC registry (Admin only)
     */
    function updateKYCRegistry(address _newRegistry) external onlyRole(ADMIN_ROLE) {
        require(_newRegistry != address(0), "Invalid address");
        kycRegistry = IKYCRegistry(_newRegistry);
    }

    /**
     * @dev Deactivate an asset (Admin only)
     */
    function deactivateAsset(uint256 _tokenId) external onlyRole(ADMIN_ROLE) {
        assetDetails[_tokenId].isActive = false;
        emit AssetDeactivated(_tokenId);
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
     * @dev Get all pending requests
     */
    function getPendingRequests() external view returns (uint256[] memory) {
        uint256 totalRequests = _requestIdCounter;
        uint256[] memory pendingRequests = new uint256[](totalRequests);
        uint256 count = 0;

        for (uint256 i = 0; i < totalRequests; i++) {
            if (requests[i].status == RequestStatus.Pending) {
                pendingRequests[count] = i;
                count++;
            }
        }

        // Resize array to actual count
        assembly {
            mstore(pendingRequests, count)
        }

        return pendingRequests;
    }

    /**
     * @dev Get all active assets
     */
    function getActiveAssets() external view returns (uint256[] memory) {
        uint256 totalTokens = _tokenIdCounter;
        uint256[] memory activeAssets = new uint256[](totalTokens);
        uint256 count = 0;

        for (uint256 i = 0; i < totalTokens; i++) {
            if (assetDetails[i].isActive) {
                activeAssets[count] = i;
                count++;
            }
        }

        // Resize array to actual count
        assembly {
            mstore(activeAssets, count)
        }

        return activeAssets;
    }

    /**
     * @dev Get user's requests
     */
    function getUserRequests(address _user) external view returns (uint256[] memory) {
        return userRequests[_user];
    }

    /**
     * @dev Get user's tokens
     */
    function getUserTokens(address _user) external view returns (uint256[] memory) {
        return userTokens[_user];
    }

    /**
     * @dev Get user's balance for a specific token
     */
    function getUserBalance(address _user, uint256 _tokenId) external view returns (uint256) {
        return balanceOf(_user, _tokenId);
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

    // ============ ERC1155 Receiver Functions ============
    
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
}