import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useContract } from './useContract';
import { useWeb3 } from '../contexts/Web3Context';

export const useMarketplace = () => {
  const { fractionalization, kyc } = useContract();
  const { isConnected, address } = useWeb3();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all active assets with new contract structure
  const fetchAssets = useCallback(async () => {
    if (!fractionalization || !isConnected) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get active assets using the new pagination method
      const result = await fractionalization.getActiveAssets(0, 100);
      const assetIds = result[0]; // First element is the array of IDs
      
      // Fetch details for each asset
      const assetPromises = assetIds.map(async (assetId) => {
        const asset = await fractionalization.assetDetails(assetId);
        const request = await fractionalization.requests(asset.requestId);
        
        return {
          // Core identifiers
          assetId: assetId.toString(),
          requestId: asset.requestId.toString(),
          
          // Asset info from request
          proposer: request.proposer,
          assetType: request.assetType,
          assetName: request.assetName,
          assetDescription: request.assetDescription,
          assetImageUrl: request.assetImageUrl,
          
          // Share details
          totalShares: asset.totalShares.toString(),
          availableShares: asset.availableShares.toString(),
          pricePerShare: ethers.utils.formatEther(asset.pricePerShare),
          minPurchaseAmount: asset.minPurchaseAmount.toString(),
          maxPurchaseAmount: asset.maxPurchaseAmount.toString(),
          shareType: asset.shareType, // 0 = Weighted, 1 = Equal
          
          // Settings
          requiresPurchaserKYC: asset.requiresPurchaserKYC,
          isActive: asset.isActive,
          
          // Metrics
          totalRevenue: ethers.utils.formatEther(asset.totalRevenue),
          totalInvestors: asset.totalInvestors.toString(),
          
          // Timestamps
          createdAt: new Date(asset.createdAt.toNumber() * 1000).toISOString(),
          lastActivityAt: new Date(asset.lastActivityAt.toNumber() * 1000).toISOString()
        };
      });

      const fetchedAssets = await Promise.all(assetPromises);
      setAssets(fetchedAssets);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fractionalization, isConnected]);

  // Purchase shares with new contract method
  const purchaseShares = async (assetId, shareAmount) => {
    if (!fractionalization) throw new Error('Contract not connected');

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
      const result = await fractionalization.calculatePurchaseCost(assetId, shareAmount);
      const totalCost = result.totalCost;
      const maxPrice = ethers.utils.parseEther(asset.pricePerShare);
      
      // Call the new purchaseShares method with max price protection
      const tx = await fractionalization.purchaseShares(
        assetId, 
        shareAmount,
        maxPrice, // Max price per share for slippage protection
        { value: totalCost }
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

  // Transfer shares to another address (NEW)
  const transferShares = async (to, assetId, amount) => {
    if (!fractionalization) throw new Error('Contract not connected');
    
    try {
      const tx = await fractionalization.transferShares(to, assetId, amount);
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
    if (!fractionalization || !userAddress) return '0';
    
    try {
      const shares = await fractionalization.getUserShares(userAddress, assetId);
      return shares.toString();
    } catch (err) {
      console.error('Error fetching shares:', err);
      return '0';
    }
  };

  // Get user's ownership percentage (NEW)
  const getUserOwnershipPercentage = async (userAddress, assetId) => {
    if (!fractionalization || !userAddress) return { percentage: 0, shares: 0 };
    
    try {
      const result = await fractionalization.getUserOwnershipPercentage(userAddress, assetId);
      return {
        percentage: result.percentage.toNumber() / 100, // Convert from basis points
        shares: result.shares.toString()
      };
    } catch (err) {
      console.error('Error fetching ownership:', err);
      return { percentage: 0, shares: 0 };
    }
  };

  // Lock shares for a period (NEW)
  const lockShares = async (assetId, amount, lockDuration) => {
    if (!fractionalization) throw new Error('Contract not connected');
    
    try {
      const tx = await fractionalization.lockShares(assetId, amount, lockDuration);
      await tx.wait();
      return tx;
    } catch (err) {
      console.error('Lock error:', err);
      throw err;
    }
  };

  // Unlock shares after lock period (NEW)
  const unlockShares = async (assetId) => {
    if (!fractionalization) throw new Error('Contract not connected');
    
    try {
      const tx = await fractionalization.unlockShares(assetId);
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

  // Listen for events
  useEffect(() => {
    if (!fractionalization) return;

    const handleSharesPurchased = (assetId, buyer, amount, totalCost) => {
      console.log('Shares purchased event:', { assetId: assetId.toString(), buyer, amount: amount.toString(), totalCost: ethers.utils.formatEther(totalCost) });
      fetchAssets();
    };

    const handleRequestAutoApproved = (requestId, assetId, proposer) => {
      console.log('Request auto-approved:', { requestId: requestId.toString(), assetId: assetId.toString(), proposer });
      fetchAssets();
    };

    const handleSharesTransferred = (assetId, from, to, amount) => {
      console.log('Shares transferred:', { assetId: assetId.toString(), from, to, amount: amount.toString() });
      fetchAssets();
    };

    fractionalization.on('SharesPurchased', handleSharesPurchased);
    fractionalization.on('RequestAutoApproved', handleRequestAutoApproved);
    fractionalization.on('SharesTransferred', handleSharesTransferred);

    return () => {
      fractionalization.off('SharesPurchased', handleSharesPurchased);
      fractionalization.off('RequestAutoApproved', handleRequestAutoApproved);
      fractionalization.off('SharesTransferred', handleSharesTransferred);
    };
  }, [fractionalization, fetchAssets]);

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