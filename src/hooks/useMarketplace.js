import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useContract } from './useContract';
import { useWeb3 } from '../contexts/Web3Context';

export const useMarketplace = () => {
  const { Tokenization, kyc } = useContract();
  const { isConnected, address } = useWeb3();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all active assets with error handling
  const fetchAssets = useCallback(async () => {
    if (!Tokenization || !isConnected) {
      setAssets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if contract is deployed
      const code = await Tokenization.provider.getCode(Tokenization.address);
      if (code === '0x') {
        console.log('Tokenization contract not deployed on this network');
        setAssets([]);
        setLoading(false);
        return;
      }

      // Get active assets using the new pagination method
      const result = await Tokenization.getActiveAssets(0, 100);
      const assetIds = result[0] || []; // First element is the array of IDs
      
      // If no assets, set empty and return
      if (!assetIds || assetIds.length === 0) {
        setAssets([]);
        setLoading(false);
        return;
      }
      
      // Fetch details for each asset
      const assetPromises = assetIds.map(async (assetId) => {
        try {
          const asset = await Tokenization.assetDetails(assetId);
          const request = await Tokenization.requests(asset.requestId);
          
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
  }, [Tokenization, isConnected]);

  // Rest of your existing methods stay the same...
  // Purchase shares with new contract method
  const purchaseShares = async (assetId, shareAmount) => {
    if (!Tokenization) throw new Error('Contract not connected');

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
      const result = await Tokenization.calculatePurchaseCost(assetId, shareAmount);
      const totalCost = result.totalCost;
      const maxPrice = ethers.utils.parseEther(asset.pricePerShare);
      
      // Call the new purchaseShares method with max price protection
      const tx = await Tokenization.purchaseShares(
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

  // Transfer shares to another address
  const transferShares = async (to, assetId, amount) => {
    if (!Tokenization) throw new Error('Contract not connected');
    
    try {
      const tx = await Tokenization.transferShares(to, assetId, amount);
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
    if (!Tokenization || !userAddress) return '0';
    
    try {
      const shares = await Tokenization.getUserShares(userAddress, assetId);
      return shares.toString();
    } catch (err) {
      console.error('Error fetching shares:', err);
      return '0';
    }
  };

  // Get user's ownership percentage
  const getUserOwnershipPercentage = async (userAddress, assetId) => {
    if (!Tokenization || !userAddress) return { percentage: 0, shares: 0 };
    
    try {
      const result = await Tokenization.getUserOwnershipPercentage(userAddress, assetId);
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
    if (!Tokenization) throw new Error('Contract not connected');
    
    try {
      const tx = await Tokenization.lockShares(assetId, amount, lockDuration);
      await tx.wait();
      return tx;
    } catch (err) {
      console.error('Lock error:', err);
      throw err;
    }
  };

  // Unlock shares after lock period
  const unlockShares = async (assetId) => {
    if (!Tokenization) throw new Error('Contract not connected');
    
    try {
      const tx = await Tokenization.unlockShares(assetId);
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
  useEffect(() => {
    if (!Tokenization) return;

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

    try {
      Tokenization.on('SharesPurchased', handleSharesPurchased);
      Tokenization.on('RequestAutoApproved', handleRequestAutoApproved);
      Tokenization.on('SharesTransferred', handleSharesTransferred);

      return () => {
        Tokenization.off('SharesPurchased', handleSharesPurchased);
        Tokenization.off('RequestAutoApproved', handleRequestAutoApproved);
        Tokenization.off('SharesTransferred', handleSharesTransferred);
      };
    } catch (err) {
      console.log('Event listeners not set up:', err.message);
    }
  }, [Tokenization, fetchAssets]);

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