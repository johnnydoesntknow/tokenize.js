// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IOPNAssetRegistry {
    function getAssetCreator(uint256 _assetId) external view returns (address);
    function isAssetActive(uint256 _assetId) external view returns (bool);
    function getAssetSupplyInfo(uint256 _assetId) external view returns (uint256,uint256,uint256,uint256);
}

interface IOPNPositionNFT {
    function getUserPositions(address _user, uint256 _assetId) external view returns (uint256[] memory);
    function positions(uint256) external view returns (uint256,uint256,address,uint256,uint256,uint256,uint256,uint256,uint256);
}

contract OPNGovernance is AccessControl, ReentrancyGuard {
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    enum ProposalStatus { Active, Executed, Cancelled, Rejected }
    
    struct Proposal {
        uint256 proposalId;
        uint256 assetId;
        address proposer;
        string title;
        string description;
        string ipfsHash;
        uint256 estimatedCost;
        uint256 votingDeadline;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 totalVoted;
        ProposalStatus status;
        uint256 createdAt;
    }
    
    IOPNPositionNFT public positionNFT;
    IOPNAssetRegistry public assetRegistry;
    
    uint256 private _proposalIdCounter;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => uint256[]) public assetProposals; // assetId => proposalIds
    mapping(uint256 => mapping(address => bool)) public hasVoted; // proposalId => voter => hasVoted
    mapping(uint256 => mapping(address => bool)) public voteChoice; // proposalId => voter => support
    
    uint256 public constant MIN_VOTING_PERIOD = 1 days;
    uint256 public constant MAX_VOTING_PERIOD = 30 days;
    uint256 public constant APPROVAL_THRESHOLD = 5100; // 51% in basis points
    
    event ProposalCreated(uint256 indexed proposalId, uint256 indexed assetId, address indexed proposer, string title, uint256 votingDeadline);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event ProposalRejected(uint256 indexed proposalId);
    
    constructor(address _positionNFT, address _assetRegistry) {
        require(_positionNFT != address(0), "Invalid position NFT");
        require(_assetRegistry != address(0), "Invalid registry");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        positionNFT = IOPNPositionNFT(_positionNFT);
        assetRegistry = IOPNAssetRegistry(_assetRegistry);
    }
    
    // =========================================================================
    // PROPOSAL FUNCTIONS - CLEAN, NO COMMAS!
    // =========================================================================
    
    function createProposal(
        uint256 _assetId,
        string calldata _title,
        string calldata _description,
        string calldata _ipfsHash,
        uint256 _estimatedCost,
        uint256 _votingPeriodDays
    ) external returns (uint256) {
        // Get asset info - clean, no commas!
        address creator = assetRegistry.getAssetCreator(_assetId);
        bool isActive = assetRegistry.isAssetActive(_assetId);
        
        require(isActive, "Asset not active");
        require(msg.sender == creator, "Only creator");
        require(bytes(_title).length > 0, "Title required");
        require(_votingPeriodDays > 0 && _votingPeriodDays <= 30, "Invalid period");
        
        uint256 votingPeriod = _votingPeriodDays * 1 days;
        require(votingPeriod >= MIN_VOTING_PERIOD && votingPeriod <= MAX_VOTING_PERIOD, "Period out of range");
        
        uint256 proposalId = _proposalIdCounter++;
        
        proposals[proposalId] = Proposal({
            proposalId: proposalId,
            assetId: _assetId,
            proposer: msg.sender,
            title: _title,
            description: _description,
            ipfsHash: _ipfsHash,
            estimatedCost: _estimatedCost,
            votingDeadline: block.timestamp + votingPeriod,
            yesVotes: 0,
            noVotes: 0,
            totalVoted: 0,
            status: ProposalStatus.Active,
            createdAt: block.timestamp
        });
        
        assetProposals[_assetId].push(proposalId);
        
        emit ProposalCreated(proposalId, _assetId, msg.sender, _title, block.timestamp + votingPeriod);
        return proposalId;
    }
    
    function vote(uint256 _proposalId, bool _support) external nonReentrant {
        Proposal storage p = proposals[_proposalId];
        require(p.status == ProposalStatus.Active, "Not active");
        require(block.timestamp <= p.votingDeadline, "Voting ended");
        require(!hasVoted[_proposalId][msg.sender], "Already voted");
        
        // Calculate voting weight - clean, no commas!
        uint256 votingWeight = getUserVotingPower(msg.sender, p.assetId);
        require(votingWeight > 0, "No voting power");
        
        hasVoted[_proposalId][msg.sender] = true;
        voteChoice[_proposalId][msg.sender] = _support;
        
        if (_support) {
            p.yesVotes += votingWeight;
        } else {
            p.noVotes += votingWeight;
        }
        
        p.totalVoted += votingWeight;
        
        emit VoteCast(_proposalId, msg.sender, _support, votingWeight);
    }
    
    function getUserVotingPower(address _user, uint256 _assetId) public view returns (uint256) {
        uint256[] memory userPositions = positionNFT.getUserPositions(_user, _assetId);
        
        if (userPositions.length == 0) {
            return 0;
        }
        
        // Get supply info - clean, no commas!
        (uint256 totalSupply, uint256 soldTokens, , uint256 soldWeight) = 
            assetRegistry.getAssetSupplyInfo(_assetId);
        
        // Use sold supply as denominator for fair voting
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < userPositions.length; i++) {
            // Get position amount cleanly - position struct field 4
            (, , , uint256 amount, , , , , ) = positionNFT.positions(userPositions[i]);
            
            // Calculate voting power as percentage (in basis points)
            if (soldTokens > 0) {
                // Fixed model: weight = (userTokens / soldTokens) * 10000
                totalWeight += (amount * 10000) / (soldTokens > 0 ? soldTokens : totalSupply);
            } else if (soldWeight > 0) {
                // Weighted model: amount is already in basis points
                totalWeight += amount;
            } else {
                // Fallback: use total supply
                totalWeight += (amount * 10000) / totalSupply;
            }
        }
        
        return totalWeight;
    }
    
    function executeProposal(uint256 _proposalId) external nonReentrant {
        Proposal storage p = proposals[_proposalId];
        
        // Get asset creator - clean, no commas!
        address creator = assetRegistry.getAssetCreator(p.assetId);
        
        require(
            msg.sender == creator || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(p.status == ProposalStatus.Active, "Not active");
        require(block.timestamp > p.votingDeadline, "Voting not ended");
        
        if (p.yesVotes > p.noVotes && p.yesVotes >= APPROVAL_THRESHOLD) {
            p.status = ProposalStatus.Executed;
            emit ProposalExecuted(_proposalId);
        } else {
            p.status = ProposalStatus.Rejected;
            emit ProposalRejected(_proposalId);
        }
    }
    
    function cancelProposal(uint256 _proposalId) external {
        Proposal storage p = proposals[_proposalId];
        
        // Get asset creator - clean, no commas!
        address creator = assetRegistry.getAssetCreator(p.assetId);
        
        require(
            msg.sender == creator || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(p.status == ProposalStatus.Active, "Not active");
        
        p.status = ProposalStatus.Cancelled;
        emit ProposalCancelled(_proposalId);
    }
    
    // View functions
    function getProposalVotes(uint256 _proposalId) 
        external view returns (
            uint256 yesVotes,
            uint256 noVotes,
            uint256 totalVoted,
            uint256 yesPercentage,
            uint256 noPercentage
        ) 
    {
        Proposal storage p = proposals[_proposalId];
        yesVotes = p.yesVotes;
        noVotes = p.noVotes;
        totalVoted = p.totalVoted;
        
        if (totalVoted > 0) {
            yesPercentage = (yesVotes * 10000) / totalVoted;
            noPercentage = (noVotes * 10000) / totalVoted;
        }
    }
    
    function getAssetProposals(uint256 _assetId) external view returns (uint256[] memory) {
        return assetProposals[_assetId];
    }
    
    function hasUserVoted(uint256 _proposalId, address _user) 
        external view returns (bool voted, bool support) 
    {
        voted = hasVoted[_proposalId][_user];
        support = voteChoice[_proposalId][_user];
    }
}