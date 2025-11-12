// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title OPNTokenization
 * @dev Complete tokenization platform with aggressive stack optimization
 */
contract OPNTokenization is ERC1155, AccessControl, ReentrancyGuard, Pausable, IERC1155Receiver {
    
    uint256 private _assetIdCounter;
    uint256 private _proposalIdCounter;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public platformFee = 250;
    address public feeRecipient;

    // ============ Structs ============

    struct AssetDetails {
        uint256 tokenId;
        address creator;
        string assetType;
        string assetName;
        string assetDescription;
        string mainImageUrl;
        string[] imageUrls;
        string metadataUrl;
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

    struct CreateAssetParams {
        string assetType;
        string assetName;
        string assetDescription;
        string mainImageUrl;
        string[] imageUrls;
        string metadataUrl;
        uint256 totalSupply;
        uint256 pricePerFraction;
        uint256 minPurchaseAmount;
        uint256 maxPurchaseAmount;
    }

    struct Proposal {
        uint256 id;
        uint256 assetId;
        address proposer;
        string ipfsHash;
        uint256 estimatedCost;
        uint256 votingDeadline;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 totalVoted;
        bool executed;
        bool cancelled;
    }

    // ============ Mappings ============

    mapping(uint256 => AssetDetails) public assetDetails;
    mapping(address => uint256[]) public userTokens;
    mapping(uint256 => mapping(address => uint256)) public userPurchases;
    mapping(uint256 => address[]) public assetHolders;
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => uint256[]) public assetProposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public voteChoice;
    
    uint256[] public activeAssetIds;
    
    address[] private adminAddresses;
    mapping(address => bool) private isAdminTracked;

    // ============ Events ============

    event AssetCreated(uint256 indexed tokenId, address indexed creator, string assetName, uint256 totalSupply, uint256 pricePerFraction);
    event FractionsPurchased(uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 totalCost);
    event FractionsSold(uint256 indexed tokenId, address indexed seller, uint256 amount, uint256 totalReceived);
    event ProposalCreated(uint256 indexed proposalId, uint256 indexed assetId, address indexed proposer, string ipfsHash);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event AssetDeactivated(uint256 indexed tokenId);
    event PlatformFeeUpdated(uint256 newFee);
    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);

    // ============ Constructor ============

    constructor(string memory _uri, address _feeRecipient) ERC1155(_uri) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        adminAddresses.push(msg.sender);
        isAdminTracked[msg.sender] = true;
        
        address specificAdmin = 0xD715011858545620E23ac58dB8c9c1bE212A41E5;
        _grantRole(ADMIN_ROLE, specificAdmin);
        
        if (specificAdmin != msg.sender) {
            adminAddresses.push(specificAdmin);
            isAdminTracked[specificAdmin] = true;
        }
        
        feeRecipient = _feeRecipient;
    }

    // ============ Admin Functions ============

    function createAsset(CreateAssetParams calldata params) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenNotPaused 
        returns (uint256) 
    {
        _validateAssetParams(params);
        
        uint256 tokenId = _assetIdCounter++;
        
        _initializeAsset(tokenId, params);
        
        activeAssetIds.push(tokenId);
        _mint(address(this), tokenId, params.totalSupply, "");

        emit AssetCreated(tokenId, msg.sender, params.assetName, params.totalSupply, params.pricePerFraction);
        
        return tokenId;
    }

    function _validateAssetParams(CreateAssetParams calldata params) private pure {
        require(params.totalSupply > 0, "Total supply must be greater than 0");
        require(params.pricePerFraction > 0, "Price must be greater than 0");
        require(bytes(params.assetName).length > 0, "Asset name cannot be empty");
        require(params.imageUrls.length <= 25, "Maximum 25 images allowed");
        require(params.minPurchaseAmount <= params.totalSupply, "Min purchase too high");
        require(params.maxPurchaseAmount == 0 || params.maxPurchaseAmount <= params.totalSupply, "Max purchase too high");
    }

    function _initializeAsset(uint256 tokenId, CreateAssetParams calldata params) private {
        AssetDetails storage asset = assetDetails[tokenId];
        asset.tokenId = tokenId;
        asset.creator = msg.sender;
        asset.assetType = params.assetType;
        asset.assetName = params.assetName;
        asset.assetDescription = params.assetDescription;
        asset.mainImageUrl = params.mainImageUrl;
        asset.imageUrls = params.imageUrls;
        asset.metadataUrl = params.metadataUrl;
        asset.totalSupply = params.totalSupply;
        asset.availableSupply = params.totalSupply;
        asset.pricePerFraction = params.pricePerFraction;
        asset.minPurchaseAmount = params.minPurchaseAmount;
        asset.maxPurchaseAmount = params.maxPurchaseAmount;
        asset.isActive = true;
        asset.createdAt = block.timestamp;
    }

    // ============ Public Functions ============

    function purchaseFractions(uint256 _tokenId, uint256 _amount) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        AssetDetails storage asset = assetDetails[_tokenId];
        
        _validatePurchase(asset, _tokenId, _amount);
        
        (uint256 totalCost, uint256 fee) = _calculateCosts(asset.pricePerFraction, _amount);
        require(msg.value >= totalCost, "Insufficient payment");

        bool isNew = balanceOf(msg.sender, _tokenId) == 0;
        
        _updatePurchaseState(asset, _tokenId, _amount, totalCost, isNew);
        _safeTransferFrom(address(this), msg.sender, _tokenId, _amount, "");
        _handlePayments(asset.creator, totalCost, fee);

        emit FractionsPurchased(_tokenId, msg.sender, _amount, totalCost);
    }

    function _validatePurchase(AssetDetails storage asset, uint256 tokenId, uint256 amount) private view {
        require(asset.isActive, "Asset not active");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= asset.availableSupply, "Insufficient tokens available");
        require(amount >= asset.minPurchaseAmount, "Below minimum purchase");
        
        if (asset.maxPurchaseAmount > 0) {
            require(balanceOf(msg.sender, tokenId) + amount <= asset.maxPurchaseAmount, "Exceeds maximum allowed");
        }
    }

    function _calculateCosts(uint256 pricePerFraction, uint256 amount) private view returns (uint256 totalCost, uint256 fee) {
        uint256 baseCost = pricePerFraction * amount;
        fee = (baseCost * platformFee) / 10000;
        totalCost = baseCost + fee;
    }

    function _updatePurchaseState(AssetDetails storage asset, uint256 tokenId, uint256 amount, uint256 cost, bool isNew) private {
        asset.availableSupply -= amount;
        asset.totalRevenue += cost;
        userPurchases[tokenId][msg.sender] += amount;
        
        if (isNew) {
            asset.totalInvestors++;
            assetHolders[tokenId].push(msg.sender);
            userTokens[msg.sender].push(tokenId);
        }
    }

    function _handlePayments(address creator, uint256 totalCost, uint256 fee) private {
        uint256 creatorAmount = totalCost - fee;
        
        if (fee > 0) {
            (bool feeSuccess, ) = feeRecipient.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }
        
        (bool creatorSuccess, ) = creator.call{value: creatorAmount}("");
        require(creatorSuccess, "Creator payment failed");
        
        if (msg.value > totalCost) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - totalCost}("");
            require(refundSuccess, "Refund failed");
        }
    }

    function sellFractions(uint256 _tokenId, uint256 _amount) external nonReentrant whenNotPaused {
        AssetDetails storage asset = assetDetails[_tokenId];
        require(asset.isActive, "Asset not active");
        require(_amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender, _tokenId) >= _amount, "Insufficient shares to sell");

        uint256 payment = asset.pricePerFraction * _amount;
        require(address(this).balance >= payment, "Contract has insufficient funds");

        asset.availableSupply += _amount;
        userPurchases[_tokenId][msg.sender] -= _amount;

        _safeTransferFrom(msg.sender, address(this), _tokenId, _amount, "");

        if (balanceOf(msg.sender, _tokenId) == 0) {
            asset.totalInvestors--;
        }

        (bool success, ) = msg.sender.call{value: payment}("");
        require(success, "Payment transfer failed");

        emit FractionsSold(_tokenId, msg.sender, _amount, payment);
    }

    // ============ DAO Governance ============

    function createProposal(uint256 _assetId, string memory _ipfsHash, uint256 _estimatedCost, uint256 _votingPeriodDays) 
        external 
        whenNotPaused 
        returns (uint256) 
    {
        AssetDetails storage asset = assetDetails[_assetId];
        require(asset.isActive, "Asset not active");
        require(msg.sender == asset.creator, "Only asset creator can propose");
        require(_votingPeriodDays > 0 && _votingPeriodDays <= 30, "Invalid voting period");

        uint256 proposalId = _proposalIdCounter++;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            assetId: _assetId,
            proposer: msg.sender,
            ipfsHash: _ipfsHash,
            estimatedCost: _estimatedCost,
            votingDeadline: block.timestamp + (_votingPeriodDays * 1 days),
            yesVotes: 0,
            noVotes: 0,
            totalVoted: 0,
            executed: false,
            cancelled: false
        });

        assetProposals[_assetId].push(proposalId);
        emit ProposalCreated(proposalId, _assetId, msg.sender, _ipfsHash);
        
        return proposalId;
    }

    function vote(uint256 _proposalId, bool _support) external whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp <= proposal.votingDeadline, "Voting period ended");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.cancelled, "Proposal cancelled");
        require(!hasVoted[_proposalId][msg.sender], "Already voted");

        uint256 shares = balanceOf(msg.sender, proposal.assetId);
        require(shares > 0, "Must own shares to vote");

        uint256 weight = (shares * 10000) / assetDetails[proposal.assetId].totalSupply;

        hasVoted[_proposalId][msg.sender] = true;
        voteChoice[_proposalId][msg.sender] = _support;

        if (_support) {
            proposal.yesVotes += weight;
        } else {
            proposal.noVotes += weight;
        }
        
        proposal.totalVoted += weight;
        emit VoteCast(_proposalId, msg.sender, _support, weight);
    }

    function executeProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        address creator = assetDetails[proposal.assetId].creator;
        
        require(msg.sender == creator || hasRole(ADMIN_ROLE, msg.sender), "Only creator or admin can execute");
        require(block.timestamp > proposal.votingDeadline, "Voting still active");
        require(!proposal.executed, "Already executed");
        require(!proposal.cancelled, "Proposal cancelled");
        require(proposal.yesVotes > proposal.noVotes, "Proposal rejected");

        proposal.executed = true;
        emit ProposalExecuted(_proposalId);
    }

    function cancelProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        address creator = assetDetails[proposal.assetId].creator;
        
        require(msg.sender == creator || hasRole(ADMIN_ROLE, msg.sender), "Only creator or admin can cancel");
        require(!proposal.executed, "Already executed");
        require(!proposal.cancelled, "Already cancelled");

        proposal.cancelled = true;
        emit ProposalCancelled(_proposalId);
    }

    // ============ Admin Management ============

    function addAdmin(address _newAdmin) external onlyRole(ADMIN_ROLE) {
        require(_newAdmin != address(0), "Invalid address");
        require(!hasRole(ADMIN_ROLE, _newAdmin), "Already an admin");
        
        grantRole(ADMIN_ROLE, _newAdmin);
        
        if (!isAdminTracked[_newAdmin]) {
            adminAddresses.push(_newAdmin);
            isAdminTracked[_newAdmin] = true;
        }
        
        emit AdminAdded(_newAdmin, msg.sender);
    }

    function removeAdmin(address _admin) external onlyRole(ADMIN_ROLE) {
        require(_admin != address(0), "Invalid address");
        require(hasRole(ADMIN_ROLE, _admin), "Not an admin");
        require(_admin != msg.sender, "Cannot remove yourself");
        
        revokeRole(ADMIN_ROLE, _admin);
        
        if (isAdminTracked[_admin]) {
            for (uint256 i = 0; i < adminAddresses.length; i++) {
                if (adminAddresses[i] == _admin) {
                    adminAddresses[i] = adminAddresses[adminAddresses.length - 1];
                    adminAddresses.pop();
                    break;
                }
            }
            isAdminTracked[_admin] = false;
        }
        
        emit AdminRemoved(_admin, msg.sender);
    }

    function getAllAdmins() external view returns (address[] memory) {
        return adminAddresses;
    }

    function getAdminCount() external view returns (uint256) {
        return adminAddresses.length;
    }

    function updatePlatformFee(uint256 _newFee) external onlyRole(ADMIN_ROLE) {
        require(_newFee <= 1000, "Fee too high");
        platformFee = _newFee;
        emit PlatformFeeUpdated(_newFee);
    }

    function updateFeeRecipient(address _newRecipient) external onlyRole(ADMIN_ROLE) {
        require(_newRecipient != address(0), "Invalid address");
        feeRecipient = _newRecipient;
    }

    function deactivateAsset(uint256 _tokenId) external onlyRole(ADMIN_ROLE) {
        assetDetails[_tokenId].isActive = false;
        emit AssetDeactivated(_tokenId);
    }

    function editAsset(uint256 _tokenId, string memory _name, string memory _desc, string memory _img, uint256 _price) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        AssetDetails storage asset = assetDetails[_tokenId];
        require(asset.tokenId == _tokenId, "Asset doesn't exist");
        
        asset.assetName = _name;
        asset.assetDescription = _desc;
        asset.mainImageUrl = _img;
        asset.pricePerFraction = _price;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ============ View Functions ============

    function getActiveAssets(uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory assetIds, bool hasMore) 
    {
        uint256 total = activeAssetIds.length;
        
        if (offset >= total) {
            return (new uint256[](0), false);
        }
        
        uint256 end = offset + limit > total ? total : offset + limit;
        uint256 length = end - offset;
        
        assetIds = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            assetIds[i] = activeAssetIds[offset + i];
        }
        
        hasMore = end < total;
    }

    function getAssetImages(uint256 _tokenId) external view returns (string[] memory) {
        return assetDetails[_tokenId].imageUrls;
    }

    function getUserTokens(address _user) external view returns (uint256[] memory) {
        return userTokens[_user];
    }

    function getUserShares(address _user, uint256 _tokenId) external view returns (uint256) {
        return balanceOf(_user, _tokenId);
    }

    function getAssetHolders(uint256 _tokenId) external view returns (address[] memory) {
        return assetHolders[_tokenId];
    }

    function getAssetProposalCount(uint256 _assetId) external view returns (uint256) {
        return assetProposals[_assetId].length;
    }

    function calculatePurchaseCost(uint256 _tokenId, uint256 _amount) 
        external 
        view 
        returns (uint256 assetCost, uint256 fee, uint256 totalCost) 
    {
        assetCost = assetDetails[_tokenId].pricePerFraction * _amount;
        fee = (assetCost * platformFee) / 10000;
        totalCost = assetCost + fee;
    }

    function isAdmin(address account) external view returns (bool) {
        return hasRole(ADMIN_ROLE, account);
    }

    // ============ ERC1155 Receiver ============
    
    function onERC1155Received(address, address, uint256, uint256, bytes memory) 
        public 
        virtual 
        override 
        returns (bytes4) 
    {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] memory, uint256[] memory, bytes memory) 
        public 
        virtual 
        override 
        returns (bytes4) 
    {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC1155Receiver).interfaceId || super.supportsInterface(interfaceId);
    }

    receive() external payable {}
}
