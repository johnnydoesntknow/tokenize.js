import React, { useState } from 'react';
import { Shield, X, Loader2, CheckCircle } from 'lucide-react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { useApp } from '../../contexts/AppContext';
import { CONTRACTS } from '../../utils/contracts';

const KYCModal = ({ isOpen, onClose, onSuccess }) => {
  const { signer, address } = useWeb3();
  const { showNotification } = useApp();
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = async () => {
    try {
      setLoading(true);
      
      const kycContract = new ethers.Contract(
        CONTRACTS.opn.kyc,
        [
          'function verifyKYC(uint256 _validityPeriod)',
          'function isVerified(address user) view returns (bool)'
        ],
        signer
      );
      
      // Check if already verified
      const isAlreadyVerified = await kycContract.isVerified(address);
      
      if (isAlreadyVerified) {
        setVerified(true);
        showNotification('You are already KYC verified!', 'success');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
        return;
      }
      
      // Request verification
      const tx = await kycContract.verifyKYC(0, { gasLimit: 300000 });
      await tx.wait();
      
      setVerified(true);
      showNotification('KYC verification completed!', 'success');
      
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
      
    } catch (error) {
      if (error.code === 'ACTION_REJECTED') {
        showNotification('Verification cancelled', 'info');
      } else {
        showNotification('Verification failed. Please try again.', 'error');
      }
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-black border border-neutral-900 rounded-sm max-w-md w-full p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-neutral-900 rounded-sm transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="text-center">
          

          {/* Title */}
          <h2 className="text-2xl font-light text-white mb-2">
            {verified ? 'Verification Complete!' : 'KYC Verification Required'}
          </h2>

          {/* Description */}
          <p className="text-neutral-400 mb-6">
            {verified 
              ? 'You can now create and trade fractionalized assets.'
              : 'Complete a quick verification through your wallet to continue.'
            }
          </p>

          {/* Button */}
          {!verified && (
            <button
              onClick={handleVerify}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify with Wallet</span>
              )}
            </button>
          )} 
        </div>
      </div>
    </div>
  );
};

export default KYCModal;
