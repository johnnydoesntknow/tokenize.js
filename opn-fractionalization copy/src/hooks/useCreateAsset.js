import { useState } from 'react';
import { ethers } from 'ethers';
import { useContract } from './useContract';
import { useWeb3 } from '../contexts/Web3Context';

// Share type enum matching the contract
const ShareType = {
  WeightedShares: 0,
  EqualShares: 1
};

export const useCreateAsset = () => {
  const { fractionalization, kyc } = useContract();
  const { address } = useWeb3();
  const [loading, setLoading] = useState(false);

  // Create a new fractionalized asset
  const createAsset = async (formData) => {
    if (!fractionalization) throw new Error('Contract not connected');

    try {
      setLoading(true);

      // Check KYC first
      if (kyc && address) {
        try {
          const isVerified = await kyc.isVerified(address);
          if (!isVerified) {
            // Try mock KYC if testnet
            const isTestnet = await kyc.isTestnet();
            if (isTestnet) {
              console.log('Completing mock KYC...');
              const kycTx = await kyc.completeMockKYC();
              await kycTx.wait();
            } else {
              throw new Error('KYC verification required to create assets');
            }
          }
        } catch (kycError) {
          console.log('KYC check:', kycError.message);
        }
      }

      // Convert price to wei (with 18 decimals)
      const priceInWei = ethers.utils.parseEther(formData.pricePerShare.toString());

      // Determine share type
      const shareType = formData.shareType === 'weighted' 
        ? ShareType.WeightedShares 
        : ShareType.EqualShares;

      // Call the contract
      const tx = await fractionalization.createFractionalizationRequest(
        formData.assetType || 'Real Estate',
        formData.assetName,
        formData.assetDescription,
        formData.assetImageUrl,
        formData.totalShares,
        priceInWei,
        formData.minPurchaseAmount || 1,
        formData.maxPurchaseAmount || 0, // 0 = no limit
        shareType,
        formData.requiresPurchaserKYC || false
      );

      const receipt = await tx.wait();
      
      // Extract request ID from events
      let requestId = null;
      let assetId = null;

      // Check for RequestCreated event
      const requestCreatedEvent = receipt.events?.find(e => e.event === 'RequestCreated');
      if (requestCreatedEvent) {
        requestId = requestCreatedEvent.args.requestId.toString();
      }

      // Check for RequestAutoApproved event (if alpha mode is on)
      const autoApprovedEvent = receipt.events?.find(e => e.event === 'RequestAutoApproved');
      if (autoApprovedEvent) {
        requestId = autoApprovedEvent.args.requestId.toString();
        assetId = autoApprovedEvent.args.assetId.toString();
      }
      
      return { 
        tx, 
        receipt,
        requestId, 
        assetId,
        isAutoApproved: !!autoApprovedEvent
      };
    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Check if alpha mode is enabled - FORCING TRUE FOR AUTO-APPROVAL
  const checkAlphaMode = async () => {
    return true; // FORCED TO TRUE - All assets will auto-approve
    
    // Original code (keeping for reference):
    // if (!fractionalization) return false;
    // try {
    //   return await fractionalization.isAlphaMode();
    // } catch (error) {
    //   console.error('Error checking alpha mode:', error);
    //   return false;
    // }
  };

  // Get platform fee
  const getPlatformFee = async () => {
    if (!fractionalization) return 250; // Default 2.5%
    try {
      const fee = await fractionalization.platformFee();
      return fee.toNumber();
    } catch (error) {
      console.error('Error getting platform fee:', error);
      return 250;
    }
  };

  // Cancel a pending request
  const cancelRequest = async (requestId) => {
    if (!fractionalization) throw new Error('Contract not connected');
    
    try {
      setLoading(true);
      const tx = await fractionalization.cancelRequest(requestId);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error('Error cancelling request:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createAsset,
    checkAlphaMode,
    getPlatformFee,
    cancelRequest,
    loading
  };
};