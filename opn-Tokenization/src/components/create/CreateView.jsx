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
import ImageUploadSection from './ImageUploadSection';
import { uploadAssetFolderToIPFS, createCompleteAssetMetadata } from '../../utils/ipfsUpload';

const CreateView = () => {
  const { address, isConnected, signer, isAdminUser } = useWeb3();
  const { createAsset, checkAlphaMode, loading: createLoading } = useCreateAsset();
  const { showNotification, setUserKYCStatus } = useApp(); 
  const { kyc } = useContract();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isAlphaMode, setIsAlphaMode] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [hasCheckedKYC, setHasCheckedKYC] = useState(false);
  const [documentUploadMethod, setDocumentUploadMethod] = useState('url'); // 'url' or 'drag'
const [additionalDocuments, setAdditionalDocuments] = useState([]);
const [uploadingDocument, setUploadingDocument] = useState(false);

  const getTotalDocumentCount = () => {
  let count = 0;
  if (formData.titleDocumentUrl) count++;
  if (formData.deedDocumentUrl) count++;
  if (formData.smartContractUrl) count++;
  count += additionalDocuments.length;
  return count;
};

const canAddMoreDocuments = () => getTotalDocumentCount() < 25;

const handleAddDocument = () => {
  if (!canAddMoreDocuments()) {
    showNotification('Maximum 25 documents allowed', 'error');
    return;
  }
  
  setAdditionalDocuments(prev => [
    ...prev,
    { id: Date.now(), name: '', url: '', file: null }
  ]);
};

const handleRemoveDocument = (id) => {
  setAdditionalDocuments(prev => prev.filter(doc => doc.id !== id));
};

const handleUpdateDocument = (id, field, value) => {
  setAdditionalDocuments(prev =>
    prev.map(doc => doc.id === id ? { ...doc, [field]: value } : doc)
  );
};

const handleDocumentFileUpload = async (file, fieldName = null, documentId = null) => {
  if (!file) return;
  
  setUploadingDocument(true);
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY,
        'pinata_secret_api_key': import.meta.env.VITE_PINATA_API_SECRET
      },
      body: formData
    });
    
    if (!res.ok) throw new Error('Upload failed');
    
    const data = await res.json();
    const docUrl = `${import.meta.env.VITE_IPFS_GATEWAY}${data.IpfsHash}`;
    
    if (documentId) {
      // Update custom document
      handleUpdateDocument(documentId, 'url', docUrl);
      handleUpdateDocument(documentId, 'file', file.name);
    } else if (fieldName) {
      // Update fixed field
      handleInputChange(fieldName, docUrl);
    }
    
    showNotification('Document uploaded to IPFS', 'success');
    return docUrl;
  } catch (error) {
    console.error('Document upload failed:', error);
    showNotification('Failed to upload document', 'error');
    return null;
  } finally {
    setUploadingDocument(false);
  }
};

const UploadMethodToggle = () => (
  <div className="flex items-center gap-4 mb-4">
    <span className="text-sm text-neutral-400">Upload Method:</span>
    <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
      <button
        type="button"
        onClick={() => setDocumentUploadMethod('drag')}
        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
          documentUploadMethod === 'drag'
            ? 'bg-neutral-800 text-white'
            : 'text-neutral-500 hover:text-white'
        }`}
      >
        Drag & Drop
      </button>
      <button
        type="button"
        onClick={() => setDocumentUploadMethod('url')}
        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
          documentUploadMethod === 'url'
            ? 'bg-neutral-800 text-white'
            : 'text-neutral-500 hover:text-white'
        }`}
      >
        URL
      </button>
    </div>
  </div>
);

const DocumentInput = ({ 
  label, 
  value, 
  onChange, 
  fieldName,
  placeholder,
  isCustom = false,
  onRemove = null,
  customName = '',
  onNameChange = null,
  documentId = null
}) => (
  <div className="space-y-2">
    {isCustom && (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={customName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Document Name (e.g., Appraisal Report)"
          className="flex-1 bg-black border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm"
          maxLength={50}
        />
        <button
          type="button"
          onClick={onRemove}
          className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 hover:bg-red-500/20 transition-colors text-sm"
        >
          Remove
        </button>
      </div>
    )}
    
    {!isCustom && (
      <label className="block text-sm text-neutral-400 mb-2">{label}</label>
    )}
    
    {documentUploadMethod === 'url' ? (
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "https://ipfs.io/ipfs/... (optional)"}
        className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-white"
      />
    ) : (
      <div className="border-2 border-dashed border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors">
        <input
          type="file"
          onChange={(e) => handleDocumentFileUpload(e.target.files[0], fieldName, documentId)}
          className="hidden"
          id={`file-${isCustom ? documentId : label.replace(/\s/g, '-')}`}
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          disabled={uploadingDocument}
        />
        <label
          htmlFor={`file-${isCustom ? documentId : label.replace(/\s/g, '-')}`}
          className="cursor-pointer block text-center"
        >
          {uploadingDocument ? (
            <div className="text-sm text-blue-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading to IPFS...
            </div>
          ) : value ? (
            <div className="text-sm text-green-500">
              ✓ Document uploaded
              <p className="text-xs text-neutral-500 mt-1">Click to replace</p>
            </div>
          ) : (
            <div className="text-sm text-neutral-400">
              Click to upload or drag & drop
              <p className="text-xs text-neutral-500 mt-1">PDF, DOC, TXT, or images</p>
            </div>
          )}
        </label>
      </div>
    )}
  </div>
);


  const [uploadedImages, setUploadedImages] = useState({
    mainImage: null,
    additionalImages: []
  });


  const [formData, setFormData] = useState({
    // Asset Information
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
    shareType: 'weighted', // 'weighted' or 'equal'
    
    totalShares: 1000,
    pricePerShare: '',
    totalValue: '', 
    minPurchaseWeight: 1, 
    maxPurchaseWeight: 50, 
    
    // Common for both:
    minPurchaseAmount: 1, 
    maxPurchaseAmount: 0, 
    maxPositionsPerUser: 10, 
    
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

  // Connection check
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl text-white mb-4">Please connect your wallet</h2>
        </div>
      </div>
    );
  }
  
  // Admin check
  if (!isAdminUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl text-white mb-4">Admin Access Required</h2>
          <p className="text-neutral-400">Only authorized administrators can create assets.</p>
          <p className="text-neutral-500 text-sm mt-4">Connected: {address}</p>
        </div>
      </div>
    );
  }

  const steps = [
    { number: 1, title: 'Asset Details', icon: FileText },
    { number: 2, title: 'Share Structure', icon: Users },
    { number: 3, title: 'Review & Submit', icon: CheckCircle }
  ];

  const handleAdditionalImageChange = (index, value) => {
    const newImages = [...formData.additionalImageUrls];
    newImages[index] = value;
    handleInputChange('additionalImageUrls', newImages);
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.assetType) {
          newErrors.assetType = 'Please select an asset type';
        }
        
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
        
        if (!uploadedImages.mainImage) {
          newErrors.assetImageUrl = 'Please upload a main image';
        }
        break;
      
      case 2:
        if (formData.shareType === 'equal') {
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
        } else {
          // WEIGHTED MODEL validation
          if (!formData.totalValue || parseFloat(formData.totalValue) <= 0) {
            newErrors.totalValue = 'Total value must be greater than 0';
          }
          
          if (!formData.minPurchaseWeight || parseFloat(formData.minPurchaseWeight) <= 0) {
            newErrors.minPurchaseWeight = 'Min purchase must be greater than 0%';
          }
          if (parseFloat(formData.minPurchaseWeight) > 100) {
            newErrors.minPurchaseWeight = 'Cannot exceed 100%';
          }
          
          if (!formData.maxPurchaseWeight || parseFloat(formData.maxPurchaseWeight) <= 0) {
            newErrors.maxPurchaseWeight = 'Max purchase must be greater than 0%';
          }
          if (parseFloat(formData.maxPurchaseWeight) > 100) {
            newErrors.maxPurchaseWeight = 'Cannot exceed 100%';
          }
          if (parseFloat(formData.maxPurchaseWeight) < parseFloat(formData.minPurchaseWeight)) {
            newErrors.maxPurchaseWeight = 'Must be greater than minimum purchase';
          }
        }
        
        if (!formData.maxPositionsPerUser || formData.maxPositionsPerUser < 1) {
          newErrors.maxPositionsPerUser = 'Must allow at least 1 position';
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

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    setLoading(true);
    showNotification('Preparing asset for upload...', 'info');
    
    // ============================================================================
    // STEP 1: Upload ALL files to ONE IPFS folder
    // ============================================================================
    console.log('📦 Uploading asset folder to IPFS...');
    
    // Prepare documents array
    const documentsToUpload = [];
    
    if (formData.titleDocumentUrl && !formData.titleDocumentUrl.startsWith('http')) {
      // It's a file, not a URL
      documentsToUpload.push({
        name: formData.assetType === 'Vehicles' ? 'Registration' : 'Title',
        file: formData.titleDocumentUrl // This should be the file object
      });
    }
    
    if (formData.deedDocumentUrl && !formData.deedDocumentUrl.startsWith('http')) {
      documentsToUpload.push({
        name: formData.assetType === 'Vehicles' ? 'Service-History' : 'Deed',
        file: formData.deedDocumentUrl
      });
    }
    
    // Add additional custom documents
    additionalDocuments.forEach(doc => {
      if (doc.file) {
        documentsToUpload.push({
          name: doc.name || `Document-${documentsToUpload.length + 1}`,
          file: doc.file
        });
      }
    });
    
    // Upload folder to IPFS
    const folderStructure = await uploadAssetFolderToIPFS({
      assetName: formData.assetName,
      mainImage: uploadedImages.mainImage,
      additionalImages: uploadedImages.additionalImages,
      documents: documentsToUpload
    });
    
    showNotification('✅ Files uploaded to IPFS!', 'success');
    console.log('📁 Folder structure:', folderStructure);
    
    // ============================================================================
    // STEP 2: Create metadata and upload to IPFS
    // ============================================================================
    const { metadataCID, metadata } = await createCompleteAssetMetadata(formData, folderStructure);
    showNotification('✅ Metadata created!', 'success');
    console.log('📄 Metadata CID:', metadataCID);
    
    // ============================================================================
    // STEP 3: Build enhanced description
    // ============================================================================
    let enhancedDescription = formData.assetDescription;
    
    if (formData.assetType === 'Real Estate') {
      enhancedDescription += `\n\nLocation: ${formData.propertyLocation}`;
      enhancedDescription += `\nSize: ${formData.propertySize} ${formData.propertySizeUnit === 'acres' ? 'acres' : 'sq ft'}`;
    }
    
    if (formData.assetType === 'Vehicles') {
      enhancedDescription += `\n\nVehicle Details:`;
      enhancedDescription += `\nYear: ${formData.vehicleYear}`;
      enhancedDescription += `\nMake: ${formData.vehicleMake}`;
      enhancedDescription += `\nModel: ${formData.vehicleModel}`;
      if (formData.vehicleVIN) {
        enhancedDescription += `\nVIN: ${formData.vehicleVIN}`;
      }
    }
    
    // Add IPFS folder info to description
    enhancedDescription += `\n\nIPFS Folder: ${folderStructure.folderCID}`;
    enhancedDescription += `\nImages: ${folderStructure.additionalImages.length + 1}`;
    enhancedDescription += `\nDocuments: ${folderStructure.documents.length}`;
    
    // ============================================================================
    // STEP 4: Create asset on blockchain
    // ============================================================================
    const assetParams = {
      assetType: formData.assetType,
      assetName: formData.assetName,
      assetDescription: enhancedDescription,
      assetImageUrl: folderStructure.mainImage, // Main image URL
      metadataUrl: metadataCID, // Metadata CID that contains folder structure
      
      // Share structure
      shareType: formData.shareType,
      totalShares: formData.shareType === 'fixed' ? parseInt(formData.totalShares) : 0,
      pricePerShare: formData.shareType === 'fixed' ? formData.pricePerShare : '0',
      totalValue: formData.shareType === 'weighted' ? formData.totalValue : '0',
      minPurchaseAmount: formData.shareType === 'fixed' ? parseInt(formData.minPurchaseAmount) : 0,
      minPurchaseWeight: formData.shareType === 'weighted' ? parseFloat(formData.minPurchaseWeight) : 0,
      maxPurchaseAmount: formData.shareType === 'fixed' ? parseInt(formData.maxPurchaseAmount) : 0,
      maxPurchaseWeight: formData.shareType === 'weighted' ? parseFloat(formData.maxPurchaseWeight) : 0,
      maxPositionsPerUser: parseInt(formData.maxPositionsPerUser),
      requiresPurchaserKYC: formData.requiresPurchaserKYC
    };
    
    showNotification('📝 Creating asset on blockchain...', 'info');
    await createAsset(assetParams);
    
    showNotification('🎉 Asset created successfully!', 'success');
    
      
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
        shareType: 'weighted',
        totalShares: 1000,
        pricePerShare: '',
        totalValue: '',
        minPurchaseWeight: 1,
        maxPurchaseWeight: 50,
        minPurchaseAmount: 1,
        maxPurchaseAmount: 0,
        maxPositionsPerUser: 10,
        requiresPurchaserKYC: false,
        ownershipConfirmed: false,
        termsAccepted: false
      });
      setCurrentStep(1);
      setAdditionalDocuments([]);
      setDocumentUploadMethod('url');
      setCurrentStep(1);

    } catch (error) {
    console.error('❌ Asset creation error:', error);
    showNotification(`Failed to create asset: ${error.message}`, 'error');
  } finally {
    setLoading(false);
  }
};


  // Calculate total value based on share type
  const totalValue = formData.shareType === 'equal'
    ? formData.pricePerShare && formData.totalShares
      ? (parseFloat(formData.pricePerShare) * parseInt(formData.totalShares)).toFixed(2)
      : '0.00'
    : formData.totalValue || '0.00';

  // Asset Details 
  const renderAssetDetailsStep = () => (
    <div className="space-y-6">
      <div className="bg-neutral-900 p-6 border border-neutral-800 rounded-lg">
        <h3 className="text-xl font-normal text-white mb-4">Asset Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Asset Type *</label>
            <select 
              value={formData.assetType}
              onChange={(e) => {
                handleInputChange('assetType', e.target.value);
                if (e.target.value !== 'Real Estate') {
                  handleInputChange('propertySubType', '');
                  handleInputChange('propertySizeUnit', 'sqft');
                }
              }}
              className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
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

          {formData.assetType === 'Real Estate' && (
            <>
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Property Type *</label>
                <select 
                  value={formData.propertySubType}
                  onChange={(e) => {
                    handleInputChange('propertySubType', e.target.value);
                    if (e.target.value === 'Land') {
                      handleInputChange('propertySizeUnit', 'acres');
                    } else {
                      handleInputChange('propertySizeUnit', 'sqft');
                    }
                  }}
                  className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
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

              <div>
                <label className="block text-sm text-neutral-400 mb-2">Location *</label>
                <input
                  type="text"
                  value={formData.propertyLocation}
                  onChange={(e) => handleInputChange('propertyLocation', e.target.value)}
                  placeholder="e.g., Dubai Marina, Dubai, UAE"
                  className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
                    errors.propertyLocation ? 'border-red-500' : 'border-neutral-800'
                  }`}
                />
                {errors.propertyLocation && (
                  <p className="text-red-400 text-xs mt-1">{errors.propertyLocation}</p>
                )}
              </div>

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
                    className={`flex-1 bg-black border rounded-lg px-4 py-3 text-white ${
                      errors.propertySize ? 'border-red-500' : 'border-neutral-800'
                    }`}
                  />
                  <div className="px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-400">
                    {formData.propertySubType === 'Land' ? 'acres' : 'sq ft'}
                  </div>
                </div>
                {errors.propertySize && (
                  <p className="text-red-400 text-xs mt-1">{errors.propertySize}</p>
                )}
              </div>
            </>
          )}

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
                    className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
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
                    className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
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
                    className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
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
                  className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-3 text-white"
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
              className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
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
              className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
                errors.assetDescription ? 'border-red-500' : 'border-neutral-800'
              }`}
            />
            {errors.assetDescription && (
              <p className="text-red-400 text-xs mt-1">{errors.assetDescription}</p>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-800">
            <h4 className="text-lg font-normal text-white mb-4 flex items-center gap-2">
              <Image className="w-5 h-5" />
              Asset Images
            </h4>
            <p className="text-xs text-neutral-500 mb-4">
              Upload high-quality images of your asset. The main image will be the primary display image.
            </p>
            
            <ImageUploadSection 
              onImagesChange={(images) => {
                setUploadedImages(images);
                if (images.mainImage) {
                  handleInputChange('assetImageUrl', images.mainImage.url);
                }
              }}
            />
            
            {uploadedImages.mainImage && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-500">
                  ✓ Main image uploaded to IPFS
                </p>
                {uploadedImages.additionalImages.length > 0 && (
                  <p className="text-sm text-green-500 mt-1">
                    ✓ {uploadedImages.additionalImages.length} additional image{uploadedImages.additionalImages.length > 1 ? 's' : ''} uploaded
                  </p>
                )}
              </div>
            )}
            
            {errors.assetImageUrl && (
              <p className="text-red-400 text-xs mt-2">{errors.assetImageUrl}</p>
            )}
          </div>

          {formData.assetType && (
  <div className="mt-6 pt-6 border-neutral-800">
    <h4 className="text-lg font-normal text-white mb-2">
      {formData.assetType === 'Vehicles' 
        ? 'Vehicle Documentation' 
        : formData.assetType === 'Real Estate'
        ? 'Property Documentation'
        : 'Asset Documentation'}
    </h4>
    <p className="text-xs text-neutral-500 mb-4">
      Upload documents to IPFS or provide URLs to existing documents. These help verify ownership and build trust.
    </p>
    
    {/* Upload Method Toggle */}
    <UploadMethodToggle />
    
    <div className="space-y-4">
      {/* Fixed Document Fields */}
      <DocumentInput
  label={
    formData.assetType === 'Vehicles' 
      ? 'Registration Document URL' 
      : formData.assetType === 'Real Estate'
      ? 'Title Document URL'
      : 'Proof of Ownership URL'
  }
  value={formData.titleDocumentUrl}
  onChange={(value) => handleInputChange('titleDocumentUrl', value)}
  fieldName="titleDocumentUrl"
  placeholder="https://ipfs.io/ipfs/... (optional)"
/>

<DocumentInput
  label={
    formData.assetType === 'Vehicles' 
      ? 'Service History URL' 
      : formData.assetType === 'Real Estate'
      ? 'Deed Document URL'
      : 'Certificate of Authenticity URL'
  }
  value={formData.deedDocumentUrl}
  onChange={(value) => handleInputChange('deedDocumentUrl', value)}
  fieldName="deedDocumentUrl"
  placeholder="https://ipfs.io/ipfs/... (optional)"
/>

      {(formData.assetType === 'Vehicles' || formData.assetType === 'Art' || formData.assetType === 'Collectibles') && (
  <DocumentInput
    label={
      formData.assetType === 'Vehicles'
        ? 'Insurance Document URL'
        : formData.assetType === 'Art'
        ? 'Appraisal Document URL'
        : 'Valuation Document URL'
    }
    value={formData.smartContractUrl}
    onChange={(value) => handleInputChange('smartContractUrl', value)}
    fieldName="smartContractUrl"
    placeholder="https://ipfs.io/ipfs/... (optional)"
  />
)}

<DocumentInput
  label="Additional Document URL"
  value={formData.additionalDocumentUrl}
  onChange={(value) => handleInputChange('additionalDocumentUrl', value)}
  fieldName="additionalDocumentUrl"
  placeholder={
    formData.assetType === 'Vehicles' 
      ? "https://... (optional - inspection report, etc.)"
      : "https://... (optional - appraisal, inspection report, etc.)"
  }
/>

{/* Additional Documents Section */}
{additionalDocuments.length > 0 && (
        <div className="mt-6 pt-4 border-t border-neutral-800">
          <h5 className="text-sm text-neutral-400 mb-3">Additional Documents</h5>
          <div className="space-y-4">
            {additionalDocuments.map((doc) => (
              <DocumentInput
                key={doc.id}
                value={doc.url}
                onChange={(value) => handleUpdateDocument(doc.id, 'url', value)}
                documentId={doc.id}
                isCustom={true}
                customName={doc.name}
                onNameChange={(value) => handleUpdateDocument(doc.id, 'name', value)}
                onRemove={() => handleRemoveDocument(doc.id)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Add Document Button */}
      {canAddMoreDocuments() && (
        <button
          type="button"
          onClick={handleAddDocument}
          className="w-full mt-4 px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Add Another Document ({getTotalDocumentCount()}/25)
        </button>
      )}
    </div>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
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

  // Render step 2 with conditional fields
  const renderShareStructureStep = () => (
    <div className="space-y-6">
      <div className="bg-neutral-900 p-6 border border-neutral-800 rounded-lg">
        <h3 className="text-xl font-normal text-white mb-4">Share Structure</h3>
        
        <div className="mb-6">
          <label className="block text-sm text-neutral-400 mb-3">Share Type</label>
          <div className="grid grid-cols-2 gap-4">
            {/* Weighted Shares Button */}
            <button
              type="button"
              onClick={() => handleInputChange('shareType', 'weighted')}
              className={`relative p-4 border rounded-lg ${
                formData.shareType === 'weighted' 
                  ? 'border-blue-500 bg-blue-500/10 text-white' 
                  : 'border-neutral-800 text-neutral-400'
              }`}
            >
              <div className="absolute top-2 right-2 group">
                <Info className="w-4 h-4 text-neutral-500 hover:text-white transition-colors cursor-help" />
                
                <div className="absolute right-0 top-6 w-64 p-3 bg-black border border-neutral-700 rounded-lg 
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                      transition-all duration-200 z-50 shadow-xl pointer-events-none">
                  <div className="absolute -top-[5px] right-[8px] w-[10px] h-[10px] 
                                bg-black border-l border-t border-neutral-700 rotate-45"></div>
                  
                  <p className="text-xs text-white font-semibold mb-2">Weighted Shares</p>
                  <p className="text-[11px] text-neutral-300 leading-relaxed mb-2">
                    Users buy percentage ownership. Set total value and min/max percentages.
                  </p>
                  <div className="p-2 bg-black/50 rounded">
                    <p className="text-[10px] text-neutral-400 italic">
                      Example: $1M asset, min 1%, max 50% - users can buy 1-50% ownership
                    </p>
                  </div>
                </div>
              </div>
              
              <TrendingUp className="w-5 h-5 mb-2" />
              <p className="font-medium">Weighted Shares</p>
              <p className="text-xs mt-1">Buy percentage of total value</p>
            </button>
            
            {/* Equal Shares Button */}
            <button
              type="button"
              onClick={() => handleInputChange('shareType', 'equal')}
              className={`relative p-4 border rounded-lg ${
                formData.shareType === 'equal' 
                  ? 'border-blue-500 bg-blue-500/10 text-white' 
                  : 'border-neutral-800 text-neutral-400'
              }`}
            >
              <div className="absolute top-2 right-2 group">
                <Info className="w-4 h-4 text-neutral-500 hover:text-white transition-colors cursor-help" />
                
                <div className="absolute right-0 top-6 w-64 p-3 bg-black border border-neutral-700 rounded-lg 
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                      transition-all duration-200 z-50 shadow-xl pointer-events-none">
                  <div className="absolute -top-[5px] right-[8px] w-[10px] h-[10px] 
                                bg-black border-l border-t border-neutral-700 rotate-45"></div>

                  <p className="text-xs text-white font-semibold mb-2">Equal Shares</p>
                  <p className="text-[11px] text-neutral-300 leading-relaxed mb-2">
                    Fixed tokens with set price. Users buy specific number of tokens.
                  </p>
                  <div className="p-2 bg-black/50 rounded">
                    <p className="text-[10px] text-neutral-400 italic">
                      Example: 1000 tokens at $100 each - users buy 1-1000 tokens
                    </p>
                  </div>
                </div>
              </div>
              
              <Users className="w-5 h-5 mb-2" />
              <p className="font-medium">Equal Shares</p>
              <p className="text-xs mt-1">Fixed tokens at set price</p>
            </button>
          </div>
        </div>

        {/* Conditional fields based on share type */}
        {formData.shareType === 'equal' ? (
         
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Total Supply (tokens) *</label>
                <input
                  type="number"
                  value={formData.totalShares}
                  onChange={(e) => handleInputChange('totalShares', parseInt(e.target.value) || 0)}
                  min="1"
                  placeholder="1000"
                  className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
                    errors.totalShares ? 'border-red-500' : 'border-neutral-800'
                  }`}
                />
                <p className="text-xs text-neutral-500 mt-1">Total number of tokens to create</p>
                {errors.totalShares && (
                  <p className="text-red-400 text-xs mt-1">{errors.totalShares}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">Price per Token (OPN) *</label>
                <input
                  type="number"
                  value={formData.pricePerShare}
                  onChange={(e) => handleInputChange('pricePerShare', e.target.value)}
                  step="0.000001"
                  min="0.000001"
                  placeholder="0.1"
                  className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
                    errors.pricePerShare ? 'border-red-500' : 'border-neutral-800'
                  }`}
                />
                <p className="text-xs text-neutral-500 mt-1">Cost of 1 token</p>
                {errors.pricePerShare && (
                  <p className="text-red-400 text-xs mt-1">{errors.pricePerShare}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">Min Purchase (tokens) *</label>
                <input
                  type="number"
                  value={formData.minPurchaseAmount}
                  onChange={(e) => handleInputChange('minPurchaseAmount', parseInt(e.target.value) || 1)}
                  min="1"
                  placeholder="1"
                  className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
                    errors.minPurchaseAmount ? 'border-red-500' : 'border-neutral-800'
                  }`}
                />
                <p className="text-xs text-neutral-500 mt-1">Minimum tokens per purchase</p>
                {errors.minPurchaseAmount && (
                  <p className="text-red-400 text-xs mt-1">{errors.minPurchaseAmount}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-neutral-400">Max per User (tokens)</label>
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
                  placeholder={hasMaxLimit ? "Max tokens" : "Unlimited"}
                  className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
                    !hasMaxLimit 
                      ? 'border-neutral-900 bg-neutral-950 text-neutral-600 cursor-not-allowed' 
                      : errors.maxPurchaseAmount 
                        ? 'border-red-500' 
                        : 'border-neutral-800'
                  }`}
                />
                <p className="text-xs text-neutral-500 mt-1">Max tokens one user can buy</p>
                {errors.maxPurchaseAmount && hasMaxLimit && (
                  <p className="text-red-400 text-xs mt-1">{errors.maxPurchaseAmount}</p>
                )}
              </div>
            </div>
          </>
        ) : (
          
          <>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Total Asset Value (OPN) *</label>
                <input
                  type="number"
                  value={formData.totalValue}
                  onChange={(e) => handleInputChange('totalValue', e.target.value)}
                  step="0.01"
                  min="0.01"
                  placeholder="1000000"
                  className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
                    errors.totalValue ? 'border-red-500' : 'border-neutral-800'
                  }`}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Total value of the asset in OPN
                </p>
                {errors.totalValue && (
                  <p className="text-red-400 text-xs mt-1">{errors.totalValue}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Min Purchase (%) *</label>
                <input
                  type="number"
                  value={formData.minPurchaseWeight}
                  onChange={(e) => handleInputChange('minPurchaseWeight', parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0.01"
                  max="100"
                  placeholder="1"
                  className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
                    errors.minPurchaseWeight ? 'border-red-500' : 'border-neutral-800'
                  }`}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Minimum ownership % (e.g., 1% = {formData.totalValue ? (parseFloat(formData.totalValue) * 0.01).toFixed(2) : '0'} OPN)
                </p>
                {errors.minPurchaseWeight && (
                  <p className="text-red-400 text-xs mt-1">{errors.minPurchaseWeight}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">Max per User (%) *</label>
                <input
                  type="number"
                  value={formData.maxPurchaseWeight}
                  onChange={(e) => handleInputChange('maxPurchaseWeight', parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0.01"
                  max="100"
                  placeholder="50"
                  className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
                    errors.maxPurchaseWeight ? 'border-red-500' : 'border-neutral-800'
                  }`}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Maximum ownership % per user
                </p>
                {errors.maxPurchaseWeight && (
                  <p className="text-red-400 text-xs mt-1">{errors.maxPurchaseWeight}</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Common field for both models */}
        <div className="mt-4">
          <label className="block text-sm text-neutral-400 mb-2">Max Positions per User *</label>
          <input
            type="number"
            value={formData.maxPositionsPerUser}
            onChange={(e) => handleInputChange('maxPositionsPerUser', parseInt(e.target.value) || 1)}
            min="1"
            max="100"
            placeholder="10"
            className={`w-full bg-black border rounded-lg px-4 py-3 text-white ${
              errors.maxPositionsPerUser ? 'border-red-500' : 'border-neutral-800'
            }`}
          />
          <p className="text-xs text-neutral-500 mt-1">
            Maximum number of separate positions one user can hold (for portfolio management)
          </p>
          {errors.maxPositionsPerUser && (
            <p className="text-red-400 text-xs mt-1">{errors.maxPositionsPerUser}</p>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
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

  // Review step with conditional display
  const renderReviewStep = () => {
    const validAdditionalImages = formData.additionalImageUrls.filter(url => url && url.trim());
    
    return (
      <div className="space-y-6">
        <div className="bg-neutral-900 p-6 border border-neutral-800 rounded-lg">
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
                 {getTotalDocumentCount() || 'None'} uploaded</span>
              </div>
            )}
            
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Share Type</span>
              <span className="text-white capitalize">{formData.shareType} Model</span>
            </div>
            
           
            {formData.shareType === 'equal' ? (
              <>
                <div className="flex justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Total Supply</span>
                  <span className="text-white">{formData.totalShares.toLocaleString()} tokens</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Price per Token</span>
                  <span className="text-white">{formData.pricePerShare} OPN</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Min Purchase</span>
                  <span className="text-white">{formData.minPurchaseAmount} tokens</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Max per User</span>
                  <span className="text-white">
                    {formData.maxPurchaseAmount === 0 ? 'Unlimited' : `${formData.maxPurchaseAmount} tokens`}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Total Value</span>
                  <span className="text-white">{formData.totalValue} OPN</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Min Purchase</span>
                  <span className="text-white">{formData.minPurchaseWeight}%</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Max per User</span>
                  <span className="text-white">{formData.maxPurchaseWeight}%</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Total Asset Value</span>
              <span className="text-white font-semibold">{totalValue} OPN</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">Max Positions per User</span>
              <span className="text-white">{formData.maxPositionsPerUser}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-neutral-400">KYC Required</span>
              <span className="text-white">{formData.requiresPurchaserKYC ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

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
                I legally own this asset and have the right to tokenize it.
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
          <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-3">
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
          <p className="text-neutral-400 font-light">Please connect your wallet to create assets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        <div className="px-6 lg:px-8 py-4 lg:py-8">
          <h1 className="text-4xl font-light text-white mb-2 pl-14 lg:pl-0">Create Tokenized Asset</h1>
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
            className={`px-6 py-3 border rounded-lg flex items-center gap-2 transition-all ${
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
                className="px-8 py-3 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || createLoading || !formData.ownershipConfirmed || !formData.termsAccepted}
                className={`px-8 py-3 rounded-lg flex items-center gap-2 transition-colors ${
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