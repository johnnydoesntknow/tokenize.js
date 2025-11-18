// src/hooks/useMarketplace.js
// ✅ FIXED VERSION - Properly handles 18-decimal precision (wei-units)
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useContract } from './useContract';
import { useWeb3 } from '../contexts/Web3Context';

export const useMarketplace = () => {
  const { assetRegistry, positionManager } = useContract();
  const { isConnected, address } = useWeb3();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to convert IPFS CID to gateway URL
  const getImageUrl = (url) => {
    if (!url) return '/placeholder.jpg';
    if (url.startsWith('http')) return url;
    return `https://ipfs.io/ipfs/${url}`;
  };

  // Main function to fetch all assets
  const fetchAssets = useCallback(async () => {
    if (!assetRegistry || !isConnected) {
      setAssets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const code = await assetRegistry.provider.getCode(assetRegistry.address);
      if (code === '0x') {
        console.log('AssetRegistry contract not deployed');
        setAssets([]);
        setLoading(false);
        return;
      }

      const result = await assetRegistry.getActiveAssets(0, 100);
      const assetIds = result.ids || result[0] || [];
      
      if (!assetIds || assetIds.length === 0) {
        console.log('No assets found');
        setAssets([]);
        setLoading(false);
        return;
      }
      
      console.log(`Fetching ${assetIds.length} assets from AssetRegistry...`);
      
      const assetPromises = assetIds.map(async (assetId) => {
        try {
          const asset = await assetRegistry.assets(assetId);
          
          if (!asset.isActive) {
            console.log(`Asset ${assetId} is inactive, skipping`);
            return null;
          }
          
          const isWeighted = asset.model === 1;
          
          console.log(`Asset ${assetId}: ${asset.assetName} - Model: ${isWeighted ? 'WEIGHTED' : 'FIXED'}`);
          
          const baseAsset = {
            assetId: assetId.toString(),
            assetType: asset.assetType,
            assetName: asset.assetName,
            assetDescription: asset.assetDescription,
            assetImageUrl: getImageUrl(asset.mainImageUrl),
            mainImageUrl: getImageUrl(asset.mainImageUrl),
            model: asset.model,
            isActive: asset.isActive,
            createdAt: asset.createdAt.toString(),
            maxPositionsPerUser: asset.maxPositionsPerUser.toString(),
            totalRevenue: asset.totalRevenue,
            ethRewardPool: asset.ethRewardPool,
            usdcRewardPool: asset.usdcRewardPool
          };
          
          if (isWeighted) {
            // ✅ WEIGHTED MODEL - Handle 18-decimal precision
            // soldWeight is now in wei-units (1e18 = 100%)
            
            // Convert to percentage: divide by 1e16 (because 1e16 = 1%)
            const soldWeightBN = asset.soldWeight;
            const soldPercentage = parseFloat(ethers.utils.formatUnits(soldWeightBN, 16));
            const availablePercentage = 100 - soldPercentage;
            
            console.log(`  - Total Value: ${ethers.utils.formatEther(asset.totalValue)} OPN`);
            console.log(`  - Sold: ${soldPercentage.toFixed(4)}%`);
            console.log(`  - Available: ${availablePercentage.toFixed(4)}%`);
            
            return {
              ...baseAsset,
              totalValue: asset.totalValue,
              soldWeight: soldWeightBN.toString(), // Keep as string for display
              soldPercentage: soldPercentage,
              // ✅ FIXED: minPurchaseAmount and maxPurchaseAmount are also in wei-units now
              minPurchaseWeight: parseFloat(ethers.utils.formatUnits(asset.minPurchaseAmount, 16)),
              maxPurchaseWeight: parseFloat(ethers.utils.formatUnits(asset.maxPurchaseAmount, 16)),
              availableWeight: availablePercentage,
              availablePercentage: availablePercentage
            };
          } else {
            // FIXED MODEL
            const totalSupply = asset.totalSupply;
            const soldTokens = asset.soldTokens;
            const availableTokens = totalSupply.sub(soldTokens);
            
            console.log(`  - Price per Token: ${ethers.utils.formatEther(asset.pricePerToken)} OPN`);
            console.log(`  - Total Supply: ${totalSupply.toString()} tokens`);
            console.log(`  - Sold: ${soldTokens.toString()} tokens`);
            console.log(`  - Available: ${availableTokens.toString()} tokens`);
            
            return {
              ...baseAsset,
              totalSupply: totalSupply,
              pricePerToken: asset.pricePerToken,
              pricePerShare: asset.pricePerToken,
              soldTokens: soldTokens,
              availableTokens: availableTokens,
              availableShares: availableTokens,
              minPurchaseAmount: asset.minPurchaseAmount,
              maxPurchaseAmount: asset.maxPurchaseAmount
            };
          }
          
        } catch (error) {
          console.error(`Error fetching asset ${assetId}:`, error);
          return null;
        }
      });
      
      const fetchedAssets = await Promise.all(assetPromises);
      const validAssets = fetchedAssets.filter(asset => asset !== null);
      
      console.log(`✅ Successfully fetched ${validAssets.length} active assets`);
      setAssets(validAssets);
      
    } catch (error) {
      console.error('Error in fetchAssets:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [assetRegistry, isConnected]);

  const getUserShares = useCallback(async (assetId) => {
    if (!positionManager || !address) return 0;
    
    try {
      const positions = await positionManager.getUserPositions(address, assetId);
      return positions.length;
    } catch (error) {
      console.error('Error fetching user shares:', error);
      return 0;
    }
  }, [positionManager, address]);

  const getUserPositions = useCallback(async (assetId) => {
    if (!positionManager || !address) return [];
    
    try {
      const positionIds = await positionManager.getUserPositions(address, assetId);
      
      const positions = await Promise.all(
        positionIds.map(async (positionId) => {
          const position = await positionManager.positions(positionId);
          
          return {
            positionId: positionId.toString(),
            assetId: position.assetId.toString(),
            owner: position.owner,
            amount: position.amount,
            purchasePrice: position.purchasePrice,
            purchaseTimestamp: position.purchaseTimestamp.toString(),
            lastRewardClaim: position.lastRewardClaim ? position.lastRewardClaim.toString() : '0'
          };
        })
      );
      
      return positions;
    } catch (error) {
      console.error('Error fetching user positions:', error);
      return [];
    }
  }, [positionManager, address]);

  const getUserOwnership = useCallback(async (assetId) => {
    if (!positionManager || !address) return { amount: 0, percentage: 0 };
    
    try {
      const positions = await getUserPositions(assetId);
      
      if (positions.length === 0) {
        return { amount: 0, percentage: 0 };
      }
      
      const totalAmount = positions.reduce((sum, pos) => {
        return sum + parseFloat(pos.amount.toString());
      }, 0);
      
      const asset = assets.find(a => a.assetId === assetId.toString());
      
      if (!asset) {
        return { amount: totalAmount, percentage: 0 };
      }
      
      let percentage = 0;
      
      if (asset.model === 1) {
        // ✅ WEIGHTED: amount is in wei-units, convert to percentage
        percentage = parseFloat(ethers.utils.formatUnits(totalAmount.toString(), 16));
      } else {
        // FIXED: calculate from total supply
        const totalSupply = parseFloat(asset.totalSupply.toString());
        if (totalSupply > 0) {
          percentage = (totalAmount / totalSupply) * 100;
        }
      }
      
      return {
        amount: totalAmount,
        percentage: percentage
      };
    } catch (error) {
      console.error('Error calculating user ownership:', error);
      return { amount: 0, percentage: 0 };
    }
  }, [positionManager, address, assets, getUserPositions]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    if (!assetRegistry) return;
    
    const handleAssetCreated = () => {
      console.log('Asset created event detected, refreshing...');
      fetchAssets();
    };
    
    try {
      assetRegistry.on('AssetCreated', handleAssetCreated);
      return () => {
        assetRegistry.off('AssetCreated', handleAssetCreated);
      };
    } catch (error) {
      console.error('Error setting up event listener:', error);
    }
  }, [assetRegistry, fetchAssets]);

  return {
    assets,
    loading,
    error,
    refetch: fetchAssets,
    getUserShares,
    getUserPositions,
    getUserOwnership
  };
};