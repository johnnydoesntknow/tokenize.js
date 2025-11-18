// src/hooks/useCreateAsset.js
// ✅ FIXED for 18-DECIMAL PRECISION
import { useState } from 'react';
import { ethers } from 'ethers';
import { useContract } from './useContract';
import { useWeb3 } from '../contexts/Web3Context';

export const useCreateAsset = () => {
  const { assetRegistry } = useContract();
  const { address } = useWeb3();
  const [loading, setLoading] = useState(false);

  const createAsset = async (formData) => {
    if (!assetRegistry) throw new Error('Contract not connected');

    try {
      setLoading(true);

      let tx;
      let assetId;

      if (formData.shareType === 'equal') {
        // ============================================
        // FIXED MODEL - createFixedAsset
        // ============================================
        const priceInWei = ethers.utils.parseEther(formData.pricePerShare.toString());
        
        console.log('Creating FIXED asset:', {
          totalSupply: formData.totalShares,
          pricePerToken: formData.pricePerShare,
          minPurchase: formData.minPurchaseAmount,
          maxPurchase: formData.maxPurchaseAmount || formData.totalShares
        });

        tx = await assetRegistry.createFixedAsset(
          formData.assetType || 'Real Estate',
          formData.assetName,
          formData.assetDescription,
          formData.assetImageUrl,
          formData.metadataUrl || "",
          formData.totalShares,
          priceInWei,
          formData.minPurchaseAmount,
          formData.maxPurchaseAmount || formData.totalShares,
          formData.maxPositionsPerUser || 10
        );
        
      } else {
        // ============================================
        // WEIGHTED MODEL - createWeightedAsset
        // ✅ FIXED: Convert percentages to WEI-UNITS (18-decimal precision)
        // ============================================
        const totalValueInWei = ethers.utils.parseEther(formData.totalValue.toString());
        
        // ✅ FIX: Convert percentage to wei-units using parseUnits with 16 decimals
        // Why 16? Because percentages have 2 decimal places and wei has 18
        // Example: 1% = 1.00 -> parseUnits("1", 16) = 1e16 (which is 1% of 1e18)
        const minWeightWeiUnits = ethers.utils.parseUnits(
          formData.minPurchaseWeight.toString(), 
          16
        );
        const maxWeightWeiUnits = ethers.utils.parseUnits(
          formData.maxPurchaseWeight.toString(), 
          16
        );
        
        console.log('Creating WEIGHTED asset with 18-decimal precision:', {
          totalValue: formData.totalValue,
          minWeight: formData.minPurchaseWeight + '% = ' + minWeightWeiUnits.toString() + ' wei-units',
          maxWeight: formData.maxPurchaseWeight + '% = ' + maxWeightWeiUnits.toString() + ' wei-units'
        });

        tx = await assetRegistry.createWeightedAsset(
          formData.assetType || 'Real Estate',
          formData.assetName,
          formData.assetDescription,
          formData.assetImageUrl,
          formData.metadataUrl || "",
          totalValueInWei,                   // total value in wei
          minWeightWeiUnits,                 // ✅ FIXED: min % in wei-units (not basis points!)
          maxWeightWeiUnits,                 // ✅ FIXED: max % in wei-units (not basis points!)
          formData.maxPositionsPerUser || 10
        );
      }

      const receipt = await tx.wait();
      
      // Extract asset ID from event
      const assetCreatedEvent = receipt.events?.find(
        e => e.event === 'AssetCreated'
      );
      
      if (assetCreatedEvent) {
        assetId = assetCreatedEvent.args.assetId || assetCreatedEvent.args[0];
        console.log('✅ Asset created with ID:', assetId.toString());
      }

      // Add additional images if provided
      if (formData.additionalImageUrls && assetId) {
        const validImages = formData.additionalImageUrls.filter(url => url && url.trim());
        
        if (validImages.length > 0) {
          console.log('Adding', validImages.length, 'additional images to asset:', assetId.toString());
          
          for (const imageUrl of validImages) {
            try {
              const imgTx = await assetRegistry.addAssetImage(assetId, imageUrl);
              await imgTx.wait();
              console.log('Added image:', imageUrl);
            } catch (error) {
              console.error('Failed to add image:', error);
              // Continue with other images even if one fails
            }
          }
        }
      }

      return {
        tx: receipt,
        requestId: assetId ? assetId.toString() : 'unknown'
      };

    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const checkAlphaMode = async () => {
    if (!assetRegistry) return false;
    
    try {
      return false;
    } catch (error) {
      return false;
    }
  };

  return {
    createAsset,
    checkAlphaMode,
    loading
  };
};