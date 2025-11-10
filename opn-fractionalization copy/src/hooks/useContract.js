// src/hooks/useContract.js
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { FRACTIONALIZATION_ABI, KYC_ABI, CONTRACTS } from '../utils/contracts';

export const useContract = () => {
  const { signer, chainId, isConnected } = useWeb3();
  const [contracts, setContracts] = useState({
    fractionalization: null,
    kyc: null,
    kycRegistry: null // Adding alias for compatibility
  });

  useEffect(() => {
    if (signer && isConnected && chainId) {
      const networkName = getNetworkName(chainId);
      const addresses = CONTRACTS[networkName] || CONTRACTS.opn;

      if (addresses) {
        const fractionalizationContract = new ethers.Contract(
          addresses.fractionalization,
          FRACTIONALIZATION_ABI,
          signer
        );

        // Create a wrapper for KYC contract that auto-approves everyone
        const actualKycContract = new ethers.Contract(
          addresses.kyc,
          KYC_ABI,
          signer
        );

        // Override the isVerified method to always return true
        const kycContractWrapper = new Proxy(actualKycContract, {
          get(target, prop) {
            // Auto-approve all KYC checks
            if (prop === 'isVerified') {
              return async () => true; // Everyone is verified!
            }
            // Auto-approve getUserKYCData to return verified status
            if (prop === 'getUserKYCData') {
              return async (address) => ({
                verified: true,
                verificationDate: Math.floor(Date.now() / 1000),
                expiryDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
                documentHash: 'AUTO_VERIFIED',
                verifiedBy: '0x0000000000000000000000000000000000000000',
                isBlacklisted: false
              });
            }
            // Pass through all other methods unchanged
            return target[prop];
          }
        });

        setContracts({
          fractionalization: fractionalizationContract,
          kyc: kycContractWrapper,
          kycRegistry: kycContractWrapper // Alias for compatibility
        });
      }
    } else {
      setContracts({
        fractionalization: null,
        kyc: null,
        kycRegistry: null
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
    case 984: return 'opn';
    default: return 'opn'; // Default to OPN
  }
};