import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const KYCModal = ({ onClose }) => {
  const { setUserKYCStatus, showNotification } = useApp();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleComplete = () => {
    setLoading(true);
    setTimeout(() => {
      setUserKYCStatus(true);
      showNotification('Verification completed');
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-neutral-900 rounded-sm max-w-md w-full p-8 animate-fadeIn">
        <div className="flex items-center justify-between mb-8">
          <h2 className="heading-3 text-white">Verification</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-12">
          {[1, 2, 3].map((num) => (
            <div key={num} className="flex items-center">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm
                            ${step >= num 
                              ? 'border-white text-white' 
                              : 'border-neutral-800 text-neutral-600'}`}>
                {num}
              </div>
              {num < 3 && (
                <div className={`w-20 h-px mx-2 ${
                  step > num ? 'bg-white' : 'bg-neutral-800'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="mb-8">
          {step === 1 && (
            <div className="text-center py-8">
              <h3 className="text-lg font-normal text-white mb-4">Identity Verification</h3>
              <p className="text-neutral-500 mb-8">
                Upload your government-issued ID to verify your identity
              </p>
              <button
                onClick={() => setStep(2)}
                className="btn-primary"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="text-center py-8">
              <h3 className="text-lg font-normal text-white mb-4">Address Verification</h3>
              <p className="text-neutral-500 mb-8">
                Provide proof of address (utility bill, bank statement)
              </p>
              <button
                onClick={() => setStep(3)}
                className="btn-primary"
              >
                Continue
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <h3 className="text-lg font-normal text-white mb-4">Review & Submit</h3>
              <p className="text-neutral-500 mb-8">
                Review and submit your verification application
              </p>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Complete'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KYCModal;