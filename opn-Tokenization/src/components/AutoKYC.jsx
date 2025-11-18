// src/components/AutoKYC.jsx - Fixed version
import { useEffect, useState, useRef } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { useApp } from '../contexts/AppContext';
import { CONTRACTS } from '../utils/contracts';

const AutoKYC = () => {
  const { address, signer, isConnected } = useWeb3();
  const { showNotification } = useApp();
  const [kycAttempted, setKycAttempted] = useState(false);
  const attemptedAddressRef = useRef(null);
  
  useEffect(() => {
    console.log('KYC Contract Address being used:', CONTRACTS.opn.kyc);
console.log('Current wallet address:', address);
    const handleAutoKYC = async () => {
      if (!isConnected || !signer || !address) {
        return;
      }
      
      if (attemptedAddressRef.current === address) {
        return;
      }
      
      attemptedAddressRef.current = address;
      setKycAttempted(true);
      
      try {
        const kycContract = new ethers.Contract(
          CONTRACTS.opn.kyc, // Use the contract from config
          [
            'function verifyKYC(uint256 _validityPeriod)',
            'function isVerified(address user) view returns (bool)'
          ],
          signer
        );
        
        // Check if already verified
        const isVerified = await kycContract.isVerified(address);
        console.log(`Address ${address} KYC status:`, isVerified);
        
        if (isVerified) {
          console.log('✅ Already KYC verified');
          return;
        }
        
        console.log('Attempting to complete KYC for', address);
        
        try {
          // Call verifyKYC with 0 for default validity period
          const tx = await kycContract.verifyKYC(0, { 
            gasLimit: 300000
          });
          
          console.log('KYC transaction sent:', tx.hash);
          const receipt = await tx.wait();
          
          if (receipt.status === 0) {
            console.error('❌ KYC transaction failed on-chain');
            showNotification(
              'KYC transaction failed.',
              'error'
            );
          } else {
            console.log('✅ KYC completed successfully');
            showNotification('KYC verification completed! You can now create assets.', 'success');
          }
        } catch (txError) {
          if (txError.code === 'ACTION_REJECTED') {
            console.log('User rejected KYC transaction');
            showNotification(
              'KYC transaction rejected. You can complete it manually from the Create page.',
              'info'
            );
          } else {
            console.error('KYC transaction error:', txError);
            showNotification(
              'KYC verification failed. Try creating an asset anyway - it might work.',
              'warning'
            );
          }
        }
        
      } catch (error) {
        console.error('KYC check error:', error);
      }
    };
    
    const timer = setTimeout(handleAutoKYC, 1500);
    
    return () => clearTimeout(timer);
  }, [address, signer, isConnected, showNotification]);
  
  return null;
};

export default AutoKYC;