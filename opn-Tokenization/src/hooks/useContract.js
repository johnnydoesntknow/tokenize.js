// src/hooks/useContract.js
// Updated for new 5-contract architecture
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { 
  CONTRACT_ADDRESSES,
  ASSET_REGISTRY_ABI,
  POSITION_NFT_ABI,
  PRIMARY_MARKET_ABI,
  SECONDARY_MARKET_ABI,
  GOVERNANCE_ABI
} from '../utils/contracts';

export const useContract = () => {
  const { signer, chainId, isConnected } = useWeb3();
  const [contracts, setContracts] = useState({
    assetRegistry: null,
    positionNFT: null,
    primaryMarket: null,
    secondaryMarket: null,
    governance: null,
    // Legacy aliases for backward compatibility
    tokenization: null,
    fractionalization: null,
    kyc: null
  });

  useEffect(() => {
    if (signer && isConnected) {
      try {
        // Initialize all 5 contracts
        const assetRegistry = new ethers.Contract(
          CONTRACT_ADDRESSES.ASSET_REGISTRY,
          ASSET_REGISTRY_ABI,
          signer
        );

        const positionNFT = new ethers.Contract(
          CONTRACT_ADDRESSES.POSITION_NFT,
          POSITION_NFT_ABI,
          signer
        );

        const primaryMarket = new ethers.Contract(
          CONTRACT_ADDRESSES.PRIMARY_MARKET,
          PRIMARY_MARKET_ABI,
          signer
        );

        const secondaryMarket = new ethers.Contract(
          CONTRACT_ADDRESSES.SECONDARY_MARKET,
          SECONDARY_MARKET_ABI,
          signer
        );

        const governance = new ethers.Contract(
          CONTRACT_ADDRESSES.GOVERNANCE,
          GOVERNANCE_ABI,
          signer
        );

        // Mock KYC that always returns true (auto-verified)
        const mockKyc = {
          isVerified: async () => true,
          getUserKYCData: async () => ({
            verified: true,
            verificationDate: Math.floor(Date.now() / 1000),
            expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
            documentHash: 'AUTO_VERIFIED',
            verifiedBy: '0x0000000000000000000000000000000000000000',
            isBlacklisted: false
          })
        };

        setContracts({
          assetRegistry,
          positionNFT,
          primaryMarket,
          secondaryMarket,
          governance,
          // Legacy aliases - point to assetRegistry for backward compatibility
          tokenization: assetRegistry,
          fractionalization: assetRegistry,
          kyc: mockKyc
        });

        console.log('✅ All contracts initialized:', {
          assetRegistry: CONTRACT_ADDRESSES.ASSET_REGISTRY,
          positionNFT: CONTRACT_ADDRESSES.POSITION_NFT,
          primaryMarket: CONTRACT_ADDRESSES.PRIMARY_MARKET,
          secondaryMarket: CONTRACT_ADDRESSES.SECONDARY_MARKET,
          governance: CONTRACT_ADDRESSES.GOVERNANCE
        });
      } catch (error) {
        console.error('Error initializing contracts:', error);
        setContracts({
          assetRegistry: null,
          positionNFT: null,
          primaryMarket: null,
          secondaryMarket: null,
          governance: null,
          tokenization: null,
          fractionalization: null,
          kyc: null
        });
      }
    } else {
      setContracts({
        assetRegistry: null,
        positionNFT: null,
        primaryMarket: null,
        secondaryMarket: null,
        governance: null,
        tokenization: null,
        fractionalization: null,
        kyc: null
      });
    }
  }, [signer, chainId, isConnected]);

  return contracts;
};