// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title KYCRegistry
 * @dev Manages KYC verification status for users
 */
contract KYCRegistry is AccessControl, Pausable {
    // Roles
    bytes32 public constant KYC_VERIFIER_ROLE = keccak256("KYC_VERIFIER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Structs
    struct KYCData {
        bool isVerified;
        uint256 verificationDate;
        uint256 expiryDate;
        string documentHash; // IPFS hash of encrypted KYC documents
        address verifiedBy;
    }

    // Mappings
    mapping(address => KYCData) public kycData;
    mapping(address => bool) public blacklist;

    // Events
    event KYCVerified(
        address indexed user,
        address indexed verifier,
        uint256 expiryDate,
        string documentHash
    );
    event KYCRevoked(address indexed user, address indexed revoker, string reason);
    event KYCUpdated(address indexed user, uint256 newExpiryDate);
    event UserBlacklisted(address indexed user, string reason);
    event UserWhitelisted(address indexed user);

    // Default KYC validity period (365 days)
    uint256 public constant DEFAULT_VALIDITY_PERIOD = 365 days;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(KYC_VERIFIER_ROLE, msg.sender);
    }

    /**
     * @dev Verify a user's KYC
     */
    function verifyKYC(
        address _user,
        string memory _documentHash,
        uint256 _validityPeriod
    ) external onlyRole(KYC_VERIFIER_ROLE) whenNotPaused {
        require(!blacklist[_user], "User is blacklisted");
        require(_user != address(0), "Invalid address");
        require(bytes(_documentHash).length > 0, "Document hash required");

        uint256 expiryDate = block.timestamp + 
            (_validityPeriod > 0 ? _validityPeriod : DEFAULT_VALIDITY_PERIOD);

        kycData[_user] = KYCData({
            isVerified: true,
            verificationDate: block.timestamp,
            expiryDate: expiryDate,
            documentHash: _documentHash,
            verifiedBy: msg.sender
        });

        emit KYCVerified(_user, msg.sender, expiryDate, _documentHash);
    }

    /**
     * @dev Batch verify multiple users
     */
    function batchVerifyKYC(
        address[] memory _users,
        string[] memory _documentHashes,
        uint256 _validityPeriod
    ) external onlyRole(KYC_VERIFIER_ROLE) whenNotPaused {
        require(_users.length == _documentHashes.length, "Array length mismatch");
        
        for (uint256 i = 0; i < _users.length; i++) {
            if (!blacklist[_users[i]] && _users[i] != address(0)) {
                uint256 expiryDate = block.timestamp + 
                    (_validityPeriod > 0 ? _validityPeriod : DEFAULT_VALIDITY_PERIOD);

                kycData[_users[i]] = KYCData({
                    isVerified: true,
                    verificationDate: block.timestamp,
                    expiryDate: expiryDate,
                    documentHash: _documentHashes[i],
                    verifiedBy: msg.sender
                });

                emit KYCVerified(_users[i], msg.sender, expiryDate, _documentHashes[i]);
            }
        }
    }

    /**
     * @dev Revoke a user's KYC verification
     */
    function revokeKYC(address _user, string memory _reason) 
        external 
        onlyRole(KYC_VERIFIER_ROLE) 
    {
        require(kycData[_user].isVerified, "User not verified");

        kycData[_user].isVerified = false;
        emit KYCRevoked(_user, msg.sender, _reason);
    }

    /**
     * @dev Update KYC expiry date
     */
    function updateKYCExpiry(address _user, uint256 _newExpiryDate) 
        external 
        onlyRole(KYC_VERIFIER_ROLE) 
    {
        require(kycData[_user].isVerified, "User not verified");
        require(_newExpiryDate > block.timestamp, "Expiry date must be in future");

        kycData[_user].expiryDate = _newExpiryDate;
        emit KYCUpdated(_user, _newExpiryDate);
    }

    /**
     * @dev Add user to blacklist
     */
    function addToBlacklist(address _user, string memory _reason) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(!blacklist[_user], "Already blacklisted");
        
        blacklist[_user] = true;
        if (kycData[_user].isVerified) {
            kycData[_user].isVerified = false;
        }
        
        emit UserBlacklisted(_user, _reason);
    }

    /**
     * @dev Remove user from blacklist
     */
    function removeFromBlacklist(address _user) external onlyRole(ADMIN_ROLE) {
        require(blacklist[_user], "Not blacklisted");
        
        blacklist[_user] = false;
        emit UserWhitelisted(_user);
    }

    /**
     * @dev Check if a user is verified and not expired
     */
    function isVerified(address _user) external view returns (bool) {
        if (blacklist[_user]) return false;
        
        KYCData memory data = kycData[_user];
        return data.isVerified && data.expiryDate > block.timestamp;
    }

    /**
     * @dev Get user's KYC data
     */
    function getUserKYCData(address _user) external view returns (
        bool verified,
        uint256 verificationDate,
        uint256 expiryDate,
        string memory documentHash,
        address verifiedBy,
        bool isBlacklisted
    ) {
        KYCData memory data = kycData[_user];
        return (
            data.isVerified && data.expiryDate > block.timestamp,
            data.verificationDate,
            data.expiryDate,
            data.documentHash,
            data.verifiedBy,
            blacklist[_user]
        );
    }

    /**
     * @dev Check if KYC is expired
     */
    function isKYCExpired(address _user) external view returns (bool) {
        return kycData[_user].expiryDate <= block.timestamp;
    }

    /**
     * @dev Pause/unpause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}