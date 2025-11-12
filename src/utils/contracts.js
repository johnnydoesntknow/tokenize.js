// src/utils/contracts.js
import { ethers } from 'ethers';

// Tokenization Contract ABI
export const TOKENIZATION_ABI = [
  // Constructor
  "constructor(string _uri, address _feeRecipient)",
  
  // Admin functions
  "function createAsset(string _assetType, string _assetName, string _assetDescription, string _assetImageUrl, uint256 _totalSupply, uint256 _pricePerFraction, uint256 _minPurchaseAmount, uint256 _maxPurchaseAmount) returns (uint256)",
  "function deactivateAsset(uint256 _tokenId)",
  "function editAsset(uint256 _tokenId, string _assetName, string _assetDescription, string _assetImageUrl, uint256 _pricePerFraction)",
  "function updatePlatformFee(uint256 _newFee)",
  "function updateFeeRecipient(address _newRecipient)",
  "function pause()",
  "function unpause()",
  
  // Public functions
  "function purchaseFractions(uint256 _tokenId, uint256 _amount) payable",
  
  // View functions
  "function assetDetails(uint256) view returns (uint256 tokenId, address creator, string assetType, string assetName, string assetDescription, string assetImageUrl, uint256 totalSupply, uint256 availableSupply, uint256 pricePerFraction, uint256 minPurchaseAmount, uint256 maxPurchaseAmount, bool isActive, uint256 totalRevenue, uint256 totalInvestors, uint256 createdAt)",
  "function getActiveAssets(uint256 offset, uint256 limit) view returns (uint256[] assetIds, bool hasMore)",
  "function getUserTokens(address _user) view returns (uint256[])",
  "function getUserShares(address _user, uint256 _tokenId) view returns (uint256)",
  "function getAssetHolders(uint256 _tokenId) view returns (address[])",
  "function calculatePurchaseCost(uint256 _tokenId, uint256 _amount) view returns (uint256 assetCost, uint256 fee, uint256 totalCost)",
  "function isAdmin(address account) view returns (bool)",
  "function platformFee() view returns (uint256)",
  "function feeRecipient() view returns (address)",
  
  // Events
  "event AssetCreated(uint256 indexed tokenId, address indexed creator, string assetName, uint256 totalSupply, uint256 pricePerFraction)",
  "event FractionsPurchased(uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 totalCost)",
  "event AssetDeactivated(uint256 indexed tokenId)",
  "event PlatformFeeUpdated(uint256 newFee)"
];

// For backwards compatibility, also export as Tokenization_ABI
export const Tokenization_ABI = TOKENIZATION_ABI;

// Dummy KYC ABI for compatibility
export const KYC_ABI = [];

// Contract addresses
export const CONTRACTS = {
  opn: {
    tokenization: import.meta.env.VITE_TOKENIZATION_CONTRACT || '0x3F4554c525F072FDb99d3affF3C71a764F482c93',
    fractionalization: import.meta.env.VITE_TOKENIZATION_CONTRACT || '0x3F4554c525F072FDb99d3affF3C71a764F482c93', // Alias
    kyc: '0x0000000000000000000000000000000000000000' // Dummy address
  }
};

// Helper function to get contract
export const getContract = (contractName, signer) => {
  const address = CONTRACTS.opn[contractName];
  const abi = contractName === 'tokenization' ? TOKENIZATION_ABI : [];
  return new ethers.Contract(address, abi, signer);
};

export const getNetworkName = (chainId) => {
  switch (chainId) {
    case 1: return 'mainnet';
    case 137: return 'polygon';
    case 42161: return 'arbitrum';
    case 984: return 'opn';
    default: return 'opn';
  }
};

export const estimateGas = async (contract, method, args, value = '0') => {
  try {
    const gasEstimate = await contract.estimateGas[method](...args, { value });
    return gasEstimate.mul(110).div(100); // Add 10% buffer
  } catch (error) {
    console.error('Gas estimation failed:', error);
    throw error;
  }
};

export const formatBalance = (balance, decimals = 18) => {
  return ethers.utils.formatUnits(balance, decimals);
};

export const parseAmount = (amount, decimals = 18) => {
  return ethers.utils.parseUnits(amount.toString(), decimals);
};

// Constants
export const PRICE_PRECISION = ethers.utils.parseEther('1'); // 1e18
export const BASIS_POINTS = 10000;
export const MAX_PLATFORM_FEE = 1000; // 10%

// Enums
export const ShareType = {
  WeightedShares: 0,
  EqualShares: 1
};

export const RequestStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
  Cancelled: 3
};