// src/hooks/useContract.js
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { TOKENIZATION_ABI, CONTRACTS } from '../utils/contracts';

export const useContract = () => {
  const { signer, chainId, isConnected } = useWeb3();
  const [contracts, setContracts] = useState({
    tokenization: null,
    fractionalization: null, // Alias for compatibility with old code
    kyc: null
  });

  useEffect(() => {
    if (signer && isConnected && chainId) {
      const networkName = getNetworkName(chainId);
      const addresses = CONTRACTS[networkName] || CONTRACTS.opn;

      if (addresses && addresses.tokenization) {
        const tokenizationContract = new ethers.Contract(
          addresses.tokenization,
          TOKENIZATION_ABI,
          signer
        );

        // Create a mock KYC that always returns true (for compatibility)
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
          tokenization: tokenizationContract,
          fractionalization: tokenizationContract, // Alias for old code
          kyc: mockKyc
        });
      }
    } else {
      setContracts({
        tokenization: null,
        fractionalization: null,
        kyc: null
      });
    }
  }, [signer, chainId, isConnected]);

  return contracts;
};

const getNetworkName = (chainId) => {
  switch (chainId) {
    case 1: return 'mainnet';
    case 137: return 'polygon';
    case 42161: return 'arbitrum';
    case 403: return 'opn';  // ← CHANGED to 403 for SAGE
    case 984: return 'opn';  // Keep for compatibility
    default: return 'opn';
  }
};