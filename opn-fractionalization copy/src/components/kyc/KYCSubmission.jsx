// src/components/kyc/KYCSubmission.jsx
import React, { useState } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useApp } from '../../contexts/AppContext';
import { AlertCircle, Upload, Loader2, CheckCircle } from 'lucide-react';

const KYCSubmission = ({ onComplete }) => {
  const { address } = useWeb3();
  const { showNotification } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    documentType: 'passport',
    documentNumber: '',
    acceptTerms: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.acceptTerms) {
      showNotification('Please accept the terms and conditions', 'error');
      return;
    }

    try {
      setSubmitting(true);
      
      // In a real application, this would:
      // 1. Upload documents to IPFS
      // 2. Submit KYC data to a backend service
      // 3. Backend service would verify documents
      // 4. Once verified, backend would call the smart contract to verify the user
      
      // For now, we'll simulate the submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSubmitted(true);
      showNotification(
        'KYC submission received! Our compliance team will review your application within 24-48 hours.',
        'success'
      );
      
      // In production, you'd track the submission status
      localStorage.setItem(`kyc_submitted_${address}`, 'true');
      
    } catch (error) {
      console.error('KYC submission error:', error);
      showNotification('Failed to submit KYC. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h2 className="heading-2 text-white mb-4">KYC Submitted Successfully</h2>
        <p className="body-text mb-8">
          Your KYC application has been submitted and is pending review. 
          You'll be notified once your verification is complete.
        </p>
        <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-sm">
          <p className="text-sm text-neutral-300">
            <strong>What happens next?</strong><br />
            Our compliance team will review your submission within 24-48 hours. 
            Once approved, you'll be able to create fractionalization requests.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="heading-2 text-white mb-4">KYC Verification Required</h2>
        <p className="body-text">
          To create fractionalization requests, you need to complete our Know Your Customer (KYC) 
          verification process. This helps us maintain regulatory compliance and protect all users.
        </p>
      </div>

      <div className="mb-8 p-4 bg-yellow-900/20 border border-yellow-900/50 rounded-sm">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-200 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <p className="font-medium mb-1">Important Information</p>
            <ul className="list-disc list-inside space-y-1 text-yellow-200/80">
              <li>Verification typically takes 24-48 hours</li>
              <li>You must be 18 years or older</li>
              <li>All information provided must be accurate and truthful</li>
              <li>Your data is encrypted and stored securely</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <section className="space-y-4">
          <h3 className="text-lg font-normal text-white">Personal Information</h3>
          
          <div>
            <label className="label-text block mb-3">Full Legal Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              className="input-field"
              placeholder="As shown on government ID"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="label-text block mb-3">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="input-field"
              placeholder="your@email.com"
              required
              disabled={submitting}
            />
          </div>
        </section>

        {/* Document Information */}
        <section className="space-y-4">
          <h3 className="text-lg font-normal text-white">Identity Verification</h3>
          
          <div>
            <label className="label-text block mb-3">Document Type</label>
            <select
              value={formData.documentType}
              onChange={(e) => setFormData({...formData, documentType: e.target.value})}
              className="input-field"
              disabled={submitting}
            >
              <option value="passport">Passport</option>
              <option value="drivers_license">Driver's License</option>
              <option value="national_id">National ID Card</option>
            </select>
          </div>

          <div>
            <label className="label-text block mb-3">Document Number</label>
            <input
              type="text"
              value={formData.documentNumber}
              onChange={(e) => setFormData({...formData, documentNumber: e.target.value})}
              className="input-field"
              placeholder="Enter document number"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="label-text block mb-3">Upload Document</label>
            <div className="border border-neutral-800 border-dashed rounded-sm p-8 text-center 
                          hover:border-neutral-700 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-3" />
              <p className="text-sm text-neutral-400 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-neutral-500">
                PDF, JPG or PNG (max 10MB)
              </p>
            </div>
          </div>
        </section>

        {/* Terms and Conditions */}
        <section>
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={(e) => setFormData({...formData, acceptTerms: e.target.checked})}
              className="w-4 h-4 mt-1 text-white bg-black border-neutral-800 
                       rounded focus:ring-white focus:ring-offset-black"
              disabled={submitting}
            />
            <span className="text-sm text-neutral-300">
              I confirm that all information provided is accurate and I accept the{' '}
              <a href="#" className="text-white underline">Terms of Service</a> and{' '}
              <a href="#" className="text-white underline">Privacy Policy</a>
            </span>
          </label>
        </section>

        {/* Wallet Connection Info */}
        <div className="p-4 bg-neutral-950 rounded-sm">
          <p className="text-sm text-neutral-400">
            <strong className="text-white">Connected Wallet:</strong><br />
            {address}
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            This wallet address will be linked to your KYC verification
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end pt-4">
          <button
            type="submit"
            disabled={submitting || !formData.acceptTerms}
            className="btn-primary flex items-center space-x-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit KYC Application</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default KYCSubmission;