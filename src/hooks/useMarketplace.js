import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useContract } from './useContract';
import { useWeb3 } from '../contexts/Web3Context';

export const useMarketplace = () => {
const { tokenization, kyc } = useContract();
  const { isConnected, address } = useWeb3();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all active assets with error handling
  const fetchAssets = useCallback(async () => {
    if (!tokenization || !isConnected) {
      setAssets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if contract is deployed
      const code = await tokenization.provider.getCode(tokenization.address);
      if (code === '0x') {
        console.log('tokenization contract not deployed on this network');
        setAssets([]);
        setLoading(false);
        return;
      }

      // Get active assets using the new pagination method
      const result = await tokenization.getActiveAssets(0, 100);
      const assetIds = result[0] || []; // First element is the array of IDs
      
      // If no assets, set empty and return
      if (!assetIds || assetIds.length === 0) {
        setAssets([]);
        setLoading(false);
        return;
      }
      
      // Fetch details for each asset
      // Fetch details for each asset
const assetPromises = assetIds.map(async (assetId) => {
  try {
    const asset = await tokenization.assetDetails(assetId);
    
    return {
      // Core identifiers
      assetId: assetId.toString(),
      tokenId: assetId.toString(),
      
      // Asset info directly from assetDetails
      creator: asset.creator,
      assetType: asset.assetType,
      assetName: asset.assetName,
      assetDescription: asset.assetDescription,
      assetImageUrl: asset.assetImageUrl,
      
      // Share details
      totalShares: asset.totalSupply.toString(),
      availableShares: asset.availableSupply.toString(),
      pricePerShare: ethers.utils.formatEther(asset.pricePerFraction),
      minPurchaseAmount: asset.minPurchaseAmount.toString(),
      maxPurchaseAmount: asset.maxPurchaseAmount.toString(),
      
      // Settings
      isActive: asset.isActive,
      
      // Metrics
      totalRevenue: ethers.utils.formatEther(asset.totalRevenue),
      totalInvestors: asset.totalInvestors.toString(),
      
      // Timestamps
      createdAt: new Date(asset.createdAt.toNumber() * 1000).toISOString()
    };
  } catch (assetErr) {
    console.error(`Error fetching asset ${assetId}:`, assetErr);
    return null;
  }
});

      const fetchedAssets = await Promise.all(assetPromises);
      // Filter out any null results from failed fetches
      const validAssets = fetchedAssets.filter(asset => asset !== null);
      setAssets(validAssets);
    } catch (err) {
      console.error('Error fetching assets:', err);
      // Don't set error for CALL_EXCEPTION as it means contract not deployed
      if (err.code !== 'CALL_EXCEPTION') {
        setError(err.message);
      }
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [tokenization, isConnected]);

  // Rest of your existing methods stay the same...
  // Purchase shares with new contract method
  const purchaseShares = async (assetId, shareAmount) => {
    if (!tokenization) throw new Error('Contract not connected');

    try {
      // Check KYC if available
      if (kyc && address) {
        try {
          const isVerified = await kyc.isVerified(address);
          if (!isVerified) {
            // Try to complete mock KYC if in testnet
            const isTestnet = await kyc.isTestnet();
            if (isTestnet) {
              console.log('Completing mock KYC...');
              const kycTx = await kyc.completeMockKYC();
              await kycTx.wait();
            }
          }
        } catch (kycError) {
          console.log('KYC check skipped:', kycError.message);
        }
      }

      const asset = assets.find(a => a.assetId === assetId.toString());
      if (!asset) throw new Error('Asset not found');

      // Calculate cost using contract method
      const result = await tokenization.calculatePurchaseCost(assetId, shareAmount);
      const totalCost = result.totalCost;
      const maxPrice = ethers.utils.parseEther(asset.pricePerShare);
      
      // Call the new purchaseShares method with max price protection
      const tx = await tokenization.purchaseFractions(
  assetId, 
  shareAmount,
  { value: totalCost }  // No maxPrice parameter in your contract
);

      await tx.wait();
      
      // Refresh assets after purchase
      await fetchAssets();
      
      return tx;
    } catch (err) {
      console.error('Purchase error:', err);
      throw err;
    }
  };

  // Transfer shares to another address
  const transferShares = async (to, assetId, amount) => {
    if (!tokenization) throw new Error('Contract not connected');
    
    try {
      const tx = await tokenization.transferShares(to, assetId, amount);
      await tx.wait();
      await fetchAssets();
      return tx;
    } catch (err) {
      console.error('Transfer error:', err);
      throw err;
    }
  };

  // Get user's shares for a specific asset
  const getUserShares = async (userAddress, assetId) => {
    if (!tokenization || !userAddress) return '0';
    
    try {
      const shares = await tokenization.getUserShares(userAddress, assetId);
      return shares.toString();
    } catch (err) {
      console.error('Error fetching shares:', err);
      return '0';
    }
  };

  // Get user's ownership percentage
  const getUserOwnershipPercentage = async (userAddress, assetId) => {
    if (!tokenization || !userAddress) return { percentage: 0, shares: 0 };
    
    try {
      const result = await tokenization.getUserOwnershipPercentage(userAddress, assetId);
      return {
        percentage: result.percentage.toNumber() / 100, // Convert from basis points
        shares: result.shares.toString()
      };
    } catch (err) {
      console.error('Error fetching ownership:', err);
      return { percentage: 0, shares: 0 };
    }
  };

  // Lock shares for a period
  const lockShares = async (assetId, amount, lockDuration) => {
    if (!tokenization) throw new Error('Contract not connected');
    
    try {
      const tx = await tokenization.lockShares(assetId, amount, lockDuration);
      await tx.wait();
      return tx;
    } catch (err) {
      console.error('Lock error:', err);
      throw err;
    }
  };

  // Unlock shares after lock period
  const unlockShares = async (assetId) => {
    if (!tokenization) throw new Error('Contract not connected');
    
    try {
      const tx = await tokenization.unlockShares(assetId);
      await tx.wait();
      return tx;
    } catch (err) {
      console.error('Unlock error:', err);
      throw err;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Listen for events (only if contract exists)
  // Listen for events (only if contract exists)
useEffect(() => {
  if (!tokenization) return;

  const handleAssetCreated = (tokenId, creator, assetName) => {
    console.log('Asset created:', { tokenId: tokenId.toString(), creator, assetName });
    fetchAssets();
  };

  const handleFractionsPurchased = (tokenId, buyer, amount, totalCost) => {
    console.log('Fractions purchased:', { tokenId: tokenId.toString(), buyer, amount: amount.toString() });
    fetchAssets();
  };

  try {
    tokenization.on('AssetCreated', handleAssetCreated);
    tokenization.on('FractionsPurchased', handleFractionsPurchased);

    return () => {
      tokenization.off('AssetCreated', handleAssetCreated);
      tokenization.off('FractionsPurchased', handleFractionsPurchased);
    };
  } catch (err) {
    console.log('Event listeners not set up:', err.message);
  }
}, [tokenization, fetchAssets]);

  return {
    assets,
    loading,
    error,
    purchaseShares,
    transferShares,
    getUserShares,
    getUserOwnershipPercentage,
    lockShares,
    unlockShares,
    refreshAssets: fetchAssets
  };
};