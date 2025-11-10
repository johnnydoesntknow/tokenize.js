// src/components/create/CreateView.jsx
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useCreateAsset } from '../../hooks/useCreateAsset';
import { useApp } from '../../contexts/AppContext';
import { useContract } from '../../hooks/useContract';
import { CONTRACTS } from '../../utils/contracts';
import { 
  Upload, 
  AlertCircle, 
  Loader2, 
  CheckCircle,
  Shield,
  FileText,
  Users,
  ChevronRight,
  ChevronLeft,
  Info,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  Car,
  Image
} from 'lucide-react';
import { ethers } from 'ethers';
import KYCModal from '../kyc/KYCModal';

const CreateView = () => {
  const { address, isConnected, signer } = useWeb3();
  const { createAsset, checkAlphaMode, loading: createLoading } = useCreateAsset();
  const { showNotification, setUserKYCStatus } = useApp(); 
  const { kyc } = useContract();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isAlphaMode, setIsAlphaMode] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [hasCheckedKYC, setHasCheckedKYC] = useState(false);

  const [formData, setFormData] = useState({
    // Asset Information
    assetType: '',
    propertySubType: '',
    assetName: '',
    assetDescription: '',
    assetImageUrl: '', // Main image
    
    // Additional images (NEW)
    additionalImageUrls: ['', '', '', ''], // Up to 4 additional images
    
    // Property-specific fields
    propertyLocation: '',
    propertySize: '',
    propertySizeUnit: 'sqft',
    
    // Vehicle-specific fields (NEW)
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleVIN: '',
    
    // Document URLs
    titleDocumentUrl: '',
    deedDocumentUrl: '',
    smartContractUrl: '',
    additionalDocumentUrl: '',
    
    // Fractionalization Details
    totalShares: 1000,
    pricePerShare: '',
    minPurchaseAmount: 1,
    maxPurchaseAmount: 0,
    shareType: 'weighted',
    requiresPurchaserKYC: false,
    
    // Legal Confirmations
    ownershipConfirmed: false,
    termsAccepted: false
  });

  const [errors, setErrors] = useState({});

  const hasMaxLimit = formData.maxPurchaseAmount > 0;

  // Check alpha mode on mount
  useEffect(() => {
    const checkMode = async () => {
      const mode = await checkAlphaMode();
      setIsAlphaMode(mode);
    };
    checkMode();
  }, []);

  // Check KYC status on wallet connection
  useEffect(() => {
    const checkInitialKYC = async () => {
      if (address && signer && !hasCheckedKYC) {
        try {
          const kycContract = new ethers.Contract(
            CONTRACTS.opn.kyc,
            ['function isVerified(address user) view returns (bool)'],
            signer
          );
          
          const isVerified = await kycContract.isVerified(address);
          setKycVerified(isVerified);
          setHasCheckedKYC(true);
        } catch (error) {
          console.error('KYC check error:', error);
          setKycVerified(false);
        }
      }
    };

    checkInitialKYC();
  }, [address, signer, hasCheckedKYC]);

  const steps = [
    { number: 1, title: 'Asset Details', icon: FileText },
    { number: 2, title: 'Share Structure', icon: Users },
    { number: 3, title: 'Review & Submit', icon: CheckCircle }
  ];

  // Helper function to handle additional image changes
  const handleAdditionalImageChange = (index, value) => {
    const newImages = [...formData.additionalImageUrls];
    newImages[index] = value;
    handleInputChange('additionalImageUrls', newImages);
  };

  // Validation for each step
  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.assetType) {
          newErrors.assetType = 'Please select an asset type';
        }
        
        // Real Estate validation
        if (formData.assetType === 'Real Estate') {
          if (!formData.propertySubType) {
            newErrors.propertySubType = 'Please select a property type';
          }
          if (!formData.propertyLocation || !formData.propertyLocation.trim()) {
            newErrors.propertyLocation = 'Property location is required';
          }
          if (!formData.propertySize || parseFloat(formData.propertySize) <= 0) {
            newErrors.propertySize = 'Property size must be greater than 0';
          }
        }
        
        // Vehicle validation
        if (formData.assetType === 'Vehicles') {
          if (!formData.vehicleYear || formData.vehicleYear < 1900 || formData.vehicleYear > new Date().getFullYear() + 1) {
            newErrors.vehicleYear = 'Please enter a valid year';
          }
          if (!formData.vehicleMake || !formData.vehicleMake.trim()) {
            newErrors.vehicleMake = 'Vehicle make is required';
          }
          if (!formData.vehicleModel || !formData.vehicleModel.trim()) {
            newErrors.vehicleModel = 'Vehicle model is required';
          }
        }
        
        if (!formData.assetName.trim()) {
          newErrors.assetName = 'Asset name is required';
        } else if (formData.assetName.length > 128) {
          newErrors.assetName = 'Asset name must be less than 128 characters';
        }
        
        if (!formData.assetDescription.trim()) {
          newErrors.assetDescription = 'Description is required';
        }
        
        if (!formData.assetImageUrl.trim()) {
          newErrors.assetImageUrl = 'Main image URL is required';
        }
        break;
      
      case 2:
        if (formData.totalShares < 1) {
          newErrors.totalShares = 'Must have at least 1 share';
        }
        if (formData.totalShares > 1000000000) {
          newErrors.totalShares = 'Maximum 1 billion shares allowed';
        }
        
        if (!formData.pricePerShare || parseFloat(formData.pricePerShare) <= 0) {
          newErrors.pricePerShare = 'Price must be greater than 0';
        }
        if (parseFloat(formData.pricePerShare) > 1000000) {
          newErrors.pricePerShare = 'Price seems too high (max 1M OPN per share)';
        }
        
        if (formData.minPurchaseAmount < 1) {
          newErrors.minPurchaseAmount = 'Minimum purchase must be at least 1';
        }
        if (formData.minPurchaseAmount > formData.totalShares) {
          newErrors.minPurchaseAmount = 'Cannot exceed total shares';
        }
        
        if (formData.maxPurchaseAmount !== 0 && formData.maxPurchaseAmount < formData.minPurchaseAmount) {
          newErrors.maxPurchaseAmount = 'Must be greater than minimum purchase';
        }
        break;

      case 3:
        if (!formData.ownershipConfirmed) {
          newErrors.ownershipConfirmed = 'You must confirm ownership';
        }
        if (!formData.termsAccepted) {
          newErrors.termsAccepted = 'You must accept the terms';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    setErrors(prev => ({
      ...prev,
      [field]: undefined
    }));
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      setLoading(true);
      
      // Build enhanced description with asset-specific details
      let enhancedDescription = formData.assetDescription;
      
      // Add property details if Real Estate
      if (formData.assetType === 'Real Estate') {
        enhancedDescription += `\n\nLocation: ${formData.propertyLocation}`;
        enhancedDescription += `\nSize: ${formData.propertySize} ${formData.propertySizeUnit === 'acres' ? 'acres' : 'sq ft'}`;
      }
      
      // Add vehicle details if Vehicle
      if (formData.assetType === 'Vehicles') {
        enhancedDescription += `\n\nVehicle Details:`;
        enhancedDescription += `\nYear: ${formData.vehicleYear}`;
        enhancedDescription += `\nMake: ${formData.vehicleMake}`;
        enhancedDescription += `\nModel: ${formData.vehicleModel}`;
        if (formData.vehicleVIN) {
          enhancedDescription += `\nVIN: ${formData.vehicleVIN}`;
        }
      }
      
      // Add additional images to description if provided
      const validAdditionalImages = formData.additionalImageUrls.filter(url => url && url.trim());
      if (validAdditionalImages.length > 0) {
        enhancedDescription += `\n\nAdditional Images:`;
        validAdditionalImages.forEach((url, index) => {
          enhancedDescription += `\nImage ${index + 1}: ${url}`;
        });
      }
      
      // Add document links if provided
      const docs = [];
      if (formData.titleDocumentUrl) {
        const docName = formData.assetType === 'Vehicles' ? 'Registration' : 'Title';
        docs.push(`${docName}: ${formData.titleDocumentUrl}`);
      }
      if (formData.deedDocumentUrl) {
        const docName = formData.assetType === 'Vehicles' ? 'Service History' : 'Deed';
        docs.push(`${docName}: ${formData.deedDocumentUrl}`);
      }
      if (formData.smartContractUrl) {
        const docName = formData.assetType === 'Vehicles' ? 'Insurance' : 'Contract';
        docs.push(`${docName}: ${formData.smartContractUrl}`);
      }
      if (formData.additionalDocumentUrl) {
        docs.push(`Additional: ${formData.additionalDocumentUrl}`);
      }
      
      if (docs.length > 0) {
        enhancedDescription += `\n\nDocuments:\n${docs.join('\n')}`;
      }
      
      // Create a modified formData with the correct assetType for the contract
      const submitData = {
        ...formData,
        assetDescription: enhancedDescription,
        // If Real Estate is selected, use the property sub-type appropriately
        assetType: formData.assetType === 'Real Estate' && formData.propertySubType
          ? formData.propertySubType === 'Land' 
            ? 'Land'
            : `${formData.propertySubType} Property`
          : formData.assetType // Keep "Vehicles", "Art", etc. as is
      };
      
      const { tx, requestId } = await createAsset(submitData);
      
      if (isAlphaMode) {
        showNotification(
          `Asset created and auto-approved! Request ID: ${requestId}`,
          'success'
        );
      } else {
        showNotification(
          `Asset request submitted! Request ID: ${requestId}. Waiting for compliance approval.`,
          'success'
        );
      }
      
      // Reset form
      setFormData({
        assetType: '',
        propertySubType: '',
        assetName: '',
        assetDescription: '',
        assetImageUrl: '',
        additionalImageUrls: ['', '', '', ''],
        propertyLocation: '',
        propertySize: '',
        propertySizeUnit: 'sqft',
        vehicleYear: '',
        vehicleMake: '',
        vehicleModel: '',
        vehicleVIN: '',
        titleDocumentUrl: '',
        deedDocumentUrl: '',
        smartContractUrl: '',
        additionalDocumentUrl: '',
        totalShares: 1000,
        pricePerShare: '',
        minPurchaseAmount: 1,
        maxPurchaseAmount: 0,
        shareType: 'weighted',
        requiresPurchaserKYC: false,
        ownershipConfirmed: false,
        termsAccepted: false
      });
      setCurrentStep(1);
      
    } catch (error) {
      console.error('Submit error:', error);
      showNotification(error.message || 'Failed to create asset', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Check KYC before creating asset
  const checkKYCBeforeCreate = async () => {
    if (kycVerified) {
      // Already verified, proceed with creation
      handleSubmit();
      return;
    }

    try {
      const kycContract = new ethers.Contract(
        CONTRACTS.opn.kyc,
        ['function isVerified(address user) view returns (bool)'],
        signer
      );
      
      const isVerified = await kycContract.isVerified(address);
      
      if (isVerified) {
        setKycVerified(true);
        handleSubmit();
      } else {
        // Show KYC modal
        setShowKYCModal(true);
      }
    } catch (error) {
      console.error('KYC check error:', error);
      // Show KYC modal on error
      setShowKYCModal(true);
    }
  };

  // Calculate total value
  const totalValue = formData.pricePerShare && formData.totalShares
    ? (parseFloat(formData.pricePerShare) * parseInt(formData.totalShares)).toFixed(2)
    : '0.00';

  // Render step 1: Asset Details
  const renderAssetDetailsStep = () => (
    <div className="space-y-6">
      <div className="bg-neutral-900 p-6 border border-neutral-800">
        <h3 className="text-xl font-normal text-white mb-4">Asset Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Asset Type *</label>
            <select 
              value={formData.assetType}
              onChange={(e) => {
                handleInputChange('assetType', e.target.value);
                // Reset sub-type when changing asset type
                if (e.target.value !== 'Real Estate') {
                  handleInputChange('propertySubType', '');
                  handleInputChange('propertySizeUnit', 'sqft');
                }
              }}
              className={`w-full bg-black border px-4 py-3 text-white ${
                errors.assetType ? 'border-red-500' : 'border-neutral-800'
              }`}
            >
              <option value="" disabled className="text-neutral-500">Select Asset Type</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Vehicles">Vehicles</option>
              <option value="Art">Art</option>
              <option value="Collectibles">Collectibles</option>
              <option value="Other">Other</option>
            </select>
            {errors.assetType && (
              <p className="text-red-400 text-xs mt-1">{errors.assetType}</p>
            )}
          </div>

          {/* Property Sub-Type - Only for Real Estate */}
          {formData.assetType === 'Real Estate' && (
            <>
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Property Type *</label>
                <select 
                  value={formData.propertySubType}
                  onChange={(e) => {
                    handleInputChange('propertySubType', e.target.value);
                    // Set size unit based on property type
                    if (e.target.value === 'Land') {
                      handleInputChange('propertySizeUnit', 'acres');
                    } else {
                      handleInputChange('propertySizeUnit', 'sqft');
                    }
                  }}
                  className={`w-full bg-black border px-4 py-3 text-white ${
                    errors.propertySubType ? 'border-red-500' : 'border-neutral-800'
                  }`}
                >
                  <option value="" disabled className="text-neutral-500">Select Property Type</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Land">Land</option>
                </select>
                {errors.propertySubType && (
                  <p className="text-red-400 text-xs mt-1">{errors.propertySubType}</p>
                )}
              </div>

              {/* Location Field */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Location *</label>
                <input
                  type="text"
                  value={formData.propertyLocation}
                  onChange={(e) => handleInputChange('propertyLocation', e.target.value)}
                  placeholder="e.g., Dubai Marina, Dubai, UAE"
                  className={`w-full bg-black border px-4 py-3 text-white ${
                    errors.propertyLocation ? 'border-red-500' : 'border-neutral-800'
                  }`}
                />
                {errors.propertyLocation && (
                  <p className="text-red-400 text-xs mt-1">{errors.propertyLocation}</p>
                )}
              </div>

              {/* Size Field */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Property Size {formData.propertySubType === 'Land' ? '(Acres)' : '(Sq Ft)'} *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.propertySize}
                    onChange={(e) => handleInputChange('propertySize', e.target.value)}
                    placeholder={formData.propertySubType === 'Land' ? "e.g., 5.5" : "e.g., 2500"}
                    step={formData.propertySubType === 'Land' ? "0.01" : "1"}
                    min="0"
                    className={`flex-1 bg-black border px-4 py-3 text-white ${
                      errors.propertySize ? 'border-red-500' : 'border-neutral-800'
                    }`}
                  />
                  <div className="px-4 py-3 bg-neutral-900 border border-neutral-800 text-neutral-400">
                    {formData.propertySubType === 'Land' ? 'acres' : 'sq ft'}
                  </div>
                </div>
                {errors.propertySize && (
                  <p className="text-red-400 text-xs mt-1">{errors.propertySize}</p>
                )}
              </div>
            </>
          )}

          {/* Vehicle-specific fields */}
          {formData.assetType === 'Vehicles' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Year *</label>
                  <input
                    type="number"
                    value={formData.vehicleYear}
                    onChange={(e) => handleInputChange('vehicleYear', e.target.value)}
                    placeholder="e.g., 2024"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className={`w-full bg-black border px-4 py-3 text-white ${
                      errors.vehicleYear ? 'border-red-500' : 'border-neutral-800'
                    }`}
                  />
                  {errors.vehicleYear && (
                    <p className="text-red-400 text-xs mt-1">{errors.vehicleYear}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Make *</label>
                  <input
                    type="text"
                    value={formData.vehicleMake}
                    onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
                    placeholder="e.g., Ferrari"
                    className={`w-full bg-black border px-4 py-3 text-white ${
                      errors.vehicleMake ? 'border-red-500' : 'border-neutral-800'
                    }`}
                  />
                  {errors.vehicleMake && (
                    <p className="text-red-400 text-xs mt-1">{errors.vehicleMake}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Model *</label>
                  <input
                    type="text"
                    value={formData.vehicleModel}
                    onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                    placeholder="e.g., 488 GTB"
                    className={`w-full bg-black border px-4 py-3 text-white ${
                      errors.vehicleModel ? 'border-red-500' : 'border-neutral-800'
                    }`}
                  />
                  {errors.vehicleModel && (
                    <p className="text-red-400 text-xs mt-1">{errors.vehicleModel}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">VIN (Optional)</label>
                <input
                  type="text"
                  value={formData.vehicleVIN}
                  onChange={(e) => handleInputChange('vehicleVIN', e.target.value)}
                  placeholder="Vehicle Identification Number"
                  maxLength={17}
                  className="w-full bg-black border border-neutral-800 px-4 py-3 text-white"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm text-neutral-400 mb-2">Asset Name *</label>
            <input
              type="text"
              value={formData.assetName}
              onChange={(e) => handleInputChange('assetName', e.target.value)}
              placeholder={
                formData.assetType === 'Real Estate' 
                  ? "e.g., Dubai Marina Penthouse"
                  : formData.assetType === 'Vehicles'
                  ? "e.g., 2024 Ferrari 488 GTB"
                  : "e.g., Name of your asset"
              }
              maxLength={128}
              className={`w-full bg-black border px-4 py-3 text-white ${
                errors.assetName ? 'border-red-500' : 'border-neutral-800'
              }`}
            />
            {errors.assetName && (
              <p className="text-red-400 text-xs mt-1">{errors.assetName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-2">Description *</label>
            <textarea
              value={formData.assetDescription}
              onChange={(e) => handleInputChange('assetDescription', e.target.value)}
              placeholder={
                formData.propertySubType === 'Residential' 
                  ? "Describe the residential property (bedrooms, bathrooms, amenities, year built, etc.)"
                  : formData.propertySubType === 'Commercial'
                  ? "Describe the commercial property (type, rental income, tenants, year built, etc.)"
                  : formData.propertySubType === 'Land'
                  ? "Describe the land (zoning, development potential, utilities, access, etc.)"
                  : formData.assetType === 'Vehicles'
                  ? "Describe the vehicle (condition, mileage, service history, modifications, etc.)"
                  : "Detailed description of your asset..."
              }
              rows={4}
              className={`w-full bg-black border px-4 py-3 text-white ${
                errors.assetDescription ? 'border-red-500' : 'border-neutral-800'
              }`}
            />
            {errors.assetDescription && (
              <p className="text-red-400 text-xs mt-1">{errors.assetDescription}</p>
            )}
          </div>

          {/* Main Image URL */}
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Main Image URL *</label>
            <input
              type="url"
              value={formData.assetImageUrl}
              onChange={(e) => handleInputChange('assetImageUrl', e.target.value)}
              placeholder="https://ipfs.io/ipfs/... or https://..."
              className={`w-full bg-black border px-4 py-3 text-white ${
                errors.assetImageUrl ? 'border-red-500' : 'border-neutral-800'
              }`}
            />
            {errors.assetImageUrl && (
              <p className="text-red-400 text-xs mt-1">{errors.assetImageUrl}</p>
            )}
          </div>

          {/* Additional Images Section - For ALL asset types */}
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <h4 className="text-lg font-normal text-white mb-4 flex items-center gap-2">
              <Image className="w-5 h-5" />
              Additional Images
            </h4>
            <p className="text-xs text-neutral-500 mb-4">
              Add up to 4 additional images to showcase your asset from different angles or aspects.
            </p>
            
            <div className="space-y-3">
              {formData.additionalImageUrls.map((url, index) => (
                <div key={index}>
                  <label className="block text-sm text-neutral-400 mb-2">
                    Additional Image {index + 1} (Optional)
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleAdditionalImageChange(index, e.target.value)}
                    placeholder="https://ipfs.io/ipfs/... or https://..."
                    className="w-full bg-black border border-neutral-800 px-4 py-3 text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Document Upload Section - For Real Estate and Vehicles */}
          {(formData.assetType === 'Real Estate' || formData.assetType === 'Vehicles') && (
            <div className="mt-6 pt-6 border-t border-neutral-800">
              <h4 className="text-lg font-normal text-white mb-4">
                {formData.assetType === 'Vehicles' ? 'Vehicle Documentation' : 'Property Documentation'}
              </h4>
              <p className="text-xs text-neutral-500 mb-4">
                Upload documents to IPFS or provide URLs to existing documents. These help verify ownership and build trust.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">
                    {formData.assetType === 'Vehicles' ? 'Registration Document URL' : 'Title Document URL'}
                  </label>
                  <input
                    type="url"
                    value={formData.titleDocumentUrl}
                    onChange={(e) => handleInputChange('titleDocumentUrl', e.target.value)}
                    placeholder="https://ipfs.io/ipfs/... (optional)"
                    className="w-full bg-black border border-neutral-800 px-4 py-3 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">
                    {formData.assetType === 'Vehicles' ? 'Service History URL' : 'Deed Document URL'}
                  </label>
                  <input
                    type="url"
                    value={formData.deedDocumentUrl}
                    onChange={(e) => handleInputChange('deedDocumentUrl', e.target.value)}
                    placeholder="https://ipfs.io/ipfs/... (optional)"
                    className="w-full bg-black border border-neutral-800 px-4 py-3 text-white"
                  />
                </div>

                {formData.assetType === 'Vehicles' && (
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Insurance Document URL</label>
                    <input
                      type="url"
                      value={formData.smartContractUrl}
                      onChange={(e) => handleInputChange('smartContractUrl', e.target.value)}
                      placeholder="https://ipfs.io/ipfs/... (optional)"
                      className="w-full bg-black border border-neutral-800 px-4 py-3 text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">
                    Additional Document URL
                  </label>
                  <input
                    type="url"
                    value={formData.additionalDocumentUrl}
                    onChange={(e) => handleInputChange('additionalDocumentUrl', e.target.value)}
                    placeholder={
                      formData.assetType === 'Vehicles' 
                        ? "https://... (optional - inspection report, etc.)"
                        : "https://... (optional - appraisal, inspection report, etc.)"
                    }
                    className="w-full bg-black border border-neutral-800 px-4 py-3 text-white"
                  />
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30">
                <p className="text-xs text-blue-400">
                  💡 Tip: Upload documents to IPFS for permanent, decentralized storage. You can use services like Pinata or web3.storage.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render step 2: Share Structure
  const renderShareStructureStep = () => (
    <div className="space-y-6">
      <div className="bg-neutral-900 p-6 border border-neutral-800">
        <h3 className="text-xl font-normal text-white mb-4">Share Structure</h3>
        
        <div className="mb-6">
          <label className="block text-sm text-neutral-400 mb-3">Share Type</label>
          <div className="grid grid-cols-2 gap-4">
            {/* Weighted Shares Button */}
            <button
              type="button"
              onClick={() => handleInputChange('shareType', 'weighted')}
              className={`relative p-4 border ${
                formData.shareType === 'weighted' 
                  ? 'border-blue-500 bg-blue-500/10 text-white' 
                  : 'border-neutral-800 text-neutral-400'
              }`}
            >
              {/* Info Icon with Tooltip */}
              <div className="absolute top-2 right-2 group">
                <Info className="w-4 h-4 text-neutral-500 hover:text-white transition-colors cursor-help" />
                
                {/* Tooltip */}
                <div className="absolute right-0 top-6 w-64 p-3 bg-black border border-neutral-700 rounded-lg 
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                      transition-all duration-200 z-50 shadow-xl pointer-events-none">
                  {/* Arrow */}
                  <div className="absolute -top-[5px] right-[8px] w-[10px] h-[10px] 
                                bg-black border-l border-t border-neutral-700 rotate-45"></div>
                  
                  <p className="text-xs text-white font-semibold mb-2">Weighted Shares</p>
                  <p className="text-[11px] text-neutral-300 leading-relaxed mb-2">
                    Ownership percentage directly corresponds to investment amount.
                  </p>
                  <div className="p-2 bg-black/50 rounded">
                    <p className="text-[10px] text-neutral-400 italic">
                      Example: Buy 250 of 1,000 shares = 25% ownership & 25% of all dividends
                    </p>
                  </div>
                </div>
              </div>
              
              <TrendingUp className="w-5 h-5 mb-2" />
              <p className="font-medium">Weighted Shares</p>
              <p className="text-xs mt-1">Proportional ownership based on investment</p>
            </button>
            
            {/* Equal Shares Button */}
            <button
              type="button"
              onClick={() => handleInputChange('shareType', 'equal')}
              className={`relative p-4 border ${
                formData.shareType === 'equal' 
                  ? 'border-blue-500 bg-blue-500/10 text-white' 
                  : 'border-neutral-800 text-neutral-400'
              }`}
            >
              {/* Info Icon with Tooltip */}
              <div className="absolute top-2 right-2 group">
                <Info className="w-4 h-4 text-neutral-500 hover:text-white transition-colors cursor-help" />
                
                <div className="absolute right-0 top-6 w-64 p-3 bg-black border border-neutral-700 rounded-lg 
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                      transition-all duration-200 z-50 shadow-xl pointer-events-none">
                  {/* Arrow */}
                  <div className="absolute -top-[5px] right-[8px] w-[10px] h-[10px] 
                                bg-black border-l border-t border-neutral-700 rotate-45"></div>

                  <p className="text-xs text-white font-semibold mb-2">Equal Shares</p>
                  <p className="text-[11px] text-neutral-300 leading-relaxed mb-2">
                    Each share is an identical unit with fixed rights.
                  </p>
                  <div className="p-2 bg-black/50 rounded">
                    <p className="text-[10px] text-neutral-400 italic">
                      Example: 100 shares total, each share = 1 vote. All shares have identical rights.
                    </p>
                  </div>
                </div>
              </div>
              
              <Users className="w-5 h-5 mb-2" />
              <p className="font-medium">Equal Shares</p>
              <p className="text-xs mt-1">Fixed units with equal rights</p>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Total Shares *</label>
            <input
              type="number"
              value={formData.totalShares}
              onChange={(e) => handleInputChange('totalShares', parseInt(e.target.value) || 0)}
              min="1"
              className={`w-full bg-black border px-4 py-3 text-white ${
                errors.totalShares ? 'border-red-500' : 'border-neutral-800'
              }`}
            />
            {errors.totalShares && (
              <p className="text-red-400 text-xs mt-1">{errors.totalShares}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-2">Price per Share (OPN) *</label>
            <input
              type="number"
              value={formData.pricePerShare}
              onChange={(e) => handleInputChange('pricePerShare', e.target.value)}
              step="0.000001"
              min="0.000001"
              placeholder="0.1"
              className={`w-full bg-black border px-4 py-3 text-white ${
                errors.pricePerShare ? 'border-red-500' : 'border-neutral-800'
              }`}
            />
            {errors.pricePerShare && (
              <p className="text-red-400 text-xs mt-1">{errors.pricePerShare}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-2">Min Purchase Amount *</label>
            <input
              type="number"
              value={formData.minPurchaseAmount}
              onChange={(e) => handleInputChange('minPurchaseAmount', parseInt(e.target.value) || 1)}
              min="1"
              className={`w-full bg-black border px-4 py-3 text-white mt-[12px] ${
                errors.minPurchaseAmount ? 'border-red-500' : 'border-neutral-800'
              }`}
            />
            {errors.minPurchaseAmount && (
              <p className="text-red-400 text-xs mt-1">{errors.minPurchaseAmount}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-neutral-400">
                Max per User
              </label>
              
              {/* Just the toggle icon - no button wrapper */}
              <div 
                onClick={() => {
                  if (formData.maxPurchaseAmount > 0) {
                    handleInputChange('maxPurchaseAmount', 0);
                  } else {
                    handleInputChange('maxPurchaseAmount', 100);
                  }
                }}
                className="cursor-pointer"
              >
                {hasMaxLimit ? (
                  <ToggleRight className="w-8 h-8 text-blue-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-neutral-500" />
                )}
              </div>
            </div>
            
            <input
              type="number"
              value={hasMaxLimit ? formData.maxPurchaseAmount : ''}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                if (hasMaxLimit && value > 0) {
                  handleInputChange('maxPurchaseAmount', value);
                }
              }}
              min="1"
              disabled={!hasMaxLimit}
              placeholder={hasMaxLimit ? "Enter maximum shares per user" : "Unlimited"}
              className={`w-full bg-black border px-4 py-3 text-white ${
                !hasMaxLimit 
                  ? 'border-neutral-900 bg-neutral-950 text-neutral-600 cursor-not-allowed' 
                  : errors.maxPurchaseAmount 
                    ? 'border-red-500' 
                    : 'border-neutral-800'
              }`}
            />
            {errors.maxPurchaseAmount && hasMaxLimit && (
              <p className="text-red-400 text-xs mt-1">{errors.maxPurchaseAmount}</p>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30">
          <div className="flex justify-between items-center">
            <p className="text-sm text-neutral-400">Total Asset Value:</p>
            <p className="text-2xl font-light text-white">{totalValue} OPN</p>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Platform fee: 2.5% on each purchase
          </p>
        </div>
      </div>
    </div>
  );

  // Render step 3: Review & Submit
  const renderReviewStep = () => {
    const validAdditionalImages = formData.additionalImageUrls.filter(url => url && url.trim());
    
    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-neutral-900 p-6 border border-neutral-800">
          <h3 className="text-xl font-normal text-white mb-4">Review Your Asset</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Asset Name</span>
              <span className="text-white">{formData.assetName || 'Not set'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Type</span>
              <span className="text-white">
                {formData.assetType}
                {formData.propertySubType && ` - ${formData.propertySubType}`}
              </span>
            </div>
            
            {/* Show property-specific details */}
            {formData.assetType === 'Real Estate' && (
              <>
                <div className="flex justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Location</span>
                  <span className="text-white">{formData.propertyLocation || 'Not set'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Size</span>
                  <span className="text-white">
                    {formData.propertySize} {formData.propertySizeUnit === 'acres' ? 'acres' : 'sq ft'}
                  </span>
                </div>
              </>
            )}
            
            {/* Show vehicle-specific details */}
            {formData.assetType === 'Vehicles' && (
              <>
                <div className="flex justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Vehicle</span>
                  <span className="text-white">
                    {formData.vehicleYear} {formData.vehicleMake} {formData.vehicleModel}
                  </span>
                </div>
                {formData.vehicleVIN && (
                  <div className="flex justify-between py-2 border-b border-neutral-800">
                    <span className="text-neutral-400">VIN</span>
                    <span className="text-white">{formData.vehicleVIN}</span>
                  </div>
                )}
              </>
            )}
            
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Images</span>
              <span className="text-white">
                1 main + {validAdditionalImages.length} additional
              </span>
            </div>
            
            {(formData.assetType === 'Real Estate' || formData.assetType === 'Vehicles') && (
              <div className="flex justify-between py-2 border-b border-neutral-800">
                <span className="text-neutral-400">Documents</span>
                <span className="text-white">
                  {[formData.titleDocumentUrl, formData.deedDocumentUrl, formData.smartContractUrl, formData.additionalDocumentUrl]
                    .filter(url => url).length || 'None'} uploaded
                </span>
              </div>
            )}
            
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Share Type</span>
              <span className="text-white capitalize">{formData.shareType} Shares</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Total Shares</span>
              <span className="text-white">{formData.totalShares.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Price per Share</span>
              <span className="text-white">{formData.pricePerShare} OPN</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Total Value</span>
              <span className="text-white font-semibold">{totalValue} OPN</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Min Purchase</span>
              <span className="text-white">{formData.minPurchaseAmount} shares</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Max per User</span>
              <span className="text-white">
                {formData.maxPurchaseAmount === 0 ? 'Unlimited' : `${formData.maxPurchaseAmount} shares`}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-neutral-400">KYC Required</span>
              <span className="text-white">{formData.requiresPurchaserKYC ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Legal Confirmations */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.ownershipConfirmed}
              onChange={(e) => handleInputChange('ownershipConfirmed', e.target.checked)}
              className="mt-0.5 w-5 h-5 bg-black border-2 border-neutral-700"
            />
            <div>
              <p className="text-sm text-white">I confirm asset ownership</p>
              <p className="text-xs text-neutral-500 mt-1">
                I legally own this asset and have the right to fractionalize it.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.termsAccepted}
              onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
              className="mt-0.5 w-5 h-5 bg-black border-2 border-neutral-700"
            />
            <div>
              <p className="text-sm text-white">I accept the platform terms</p>
              <p className="text-xs text-neutral-500 mt-1">
                I agree to the platform terms of service and the 2.5% transaction fee.
              </p>
            </div>
          </label>
        </div>

        {(errors.ownershipConfirmed || errors.termsAccepted) && (
          <div className="bg-red-900/10 border border-red-900/30 p-3">
            <p className="text-xs text-red-400">Please confirm all checkboxes to proceed</p>
          </div>
        )}
      </div>
    );
  };

  // Main render
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-xl font-light text-white mb-2">Wallet Not Connected</h2>
          <p className="text-neutral-400 font-light">Please connect your wallet to create fractionalized assets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="px-6 lg:px-8 py-4 lg:py-8">
          <h1 className="text-4xl font-light text-white mb-2 pl-14 lg:pl-0">Create Fractionalized Asset</h1>
          <p className="text-neutral-400 font-light pl-14 lg:pl-0">
            Transform your asset into tradeable digital shares on OPN Chain
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep >= step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center mb-2
                      ${isActive ? 'bg-blue-500' : 'bg-neutral-800'}
                      ${isCompleted ? 'bg-green-500' : ''}
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                      )}
                    </div>
                    <span className={`text-xs font-light ${isActive ? 'text-white' : 'text-neutral-500'}`}>
                      {step.title}
                    </span>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 transition-all duration-300 ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-neutral-800'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {currentStep === 1 && renderAssetDetailsStep()}
          {currentStep === 2 && renderShareStructureStep()}
          {currentStep === 3 && renderReviewStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-6 py-3 border flex items-center gap-2 transition-all ${
              currentStep === 1 
                ? 'border-neutral-800 text-neutral-600 cursor-not-allowed' 
                : 'border-neutral-700 text-white hover:bg-neutral-900'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex gap-4">
            {currentStep < steps.length ? (
              <button
                onClick={nextStep}
                className="px-8 py-3 bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={checkKYCBeforeCreate}
                disabled={loading || createLoading || !formData.ownershipConfirmed || !formData.termsAccepted}
                className={`px-8 py-3 flex items-center gap-2 transition-colors ${
                  loading || createLoading || !formData.ownershipConfirmed || !formData.termsAccepted
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {(loading || createLoading) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Create Asset
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KYC Modal */}
      {showKYCModal && (
        <KYCModal
          isOpen={showKYCModal}
          onClose={() => setShowKYCModal(false)}
          onSuccess={() => {
            setKycVerified(true);
            setUserKYCStatus(true);
            setShowKYCModal(false);
            handleSubmit();
          }}
          context="create" 
        />
      )}
    </div>
  );
};

export default CreateView;