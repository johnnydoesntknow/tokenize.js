import { useState } from 'react';
import { ethers } from 'ethers';
import { useContract } from './useContract';
import { useWeb3 } from '../contexts/Web3Context';

export const useCreateAsset = () => {
  const { tokenization } = useContract(); // lowercase tokenization
  const { address } = useWeb3();
  const [loading, setLoading] = useState(false);

  // Create a new tokenized asset (no KYC, no requests - direct creation)
  const createAsset = async (formData) => {
    if (!tokenization) throw new Error('Contract not connected');

    try {
      setLoading(true);

      // Convert price to wei (with 18 decimals)
      const priceInWei = ethers.utils.parseEther(formData.pricePerShare.toString());

      // Call the NEW createAsset function (not createTokenizationRequest)
      const tx = await tokenization.createAsset(
        formData.assetType || 'Real Estate',
        formData.assetName,
        formData.assetDescription,
        formData.assetImageUrl,
        formData.totalShares,
        priceInWei,
        formData.minPurchaseAmount || 1,
        formData.maxPurchaseAmount || 0  // 0 = no limit
      );

      const receipt = await tx.wait();
      
      // Extract tokenId from AssetCreated event
      let tokenId = null;
      
      // Look for AssetCreated event (not RequestCreated)
      const assetCreatedEvent = receipt.events?.find(e => e.event === 'AssetCreated');
      if (assetCreatedEvent) {
        tokenId = assetCreatedEvent.args.tokenId.toString();
      }
      
      return { 
        tx, 
        receipt,
        requestId: tokenId, // For compatibility with UI
        assetId: tokenId,
        tokenId: tokenId,
        isAutoApproved: true // Always auto-approved since admin creates directly
      };
    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Check if alpha mode is enabled - Always true since no approval needed
  const checkAlphaMode = async () => {
    return true; // Always true - admin creates assets directly
  };

  // Get platform fee
  const getPlatformFee = async () => {
    if (!tokenization) return 250; // Default 2.5%
    try {
      const fee = await tokenization.platformFee();
      return fee.toNumber();
    } catch (error) {
      console.error('Error getting platform fee:', error);
      return 250;
    }
  };

  // Cancel request - NOT NEEDED in new contract
  const cancelRequest = async (requestId) => {
    console.log('Cancel request not available - assets are created directly');
    return null;
  };

  return {
    createAsset,
    checkAlphaMode,
    getPlatformFee,
    cancelRequest,
    loading
  };
};