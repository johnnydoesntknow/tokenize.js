// src/components/property/PropertyModal.jsx
// UPDATED FIX - Share-based UI for FIXED, Percentage-based UI for WEIGHTED
// CHANGES:
// 1. Removed box around Purchase Interface
// 2. Added vertical divider between columns
// 3. Added OPN/USD toggle for weighted model input
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, MapPin, Home, Maximize, Calendar, Users, Shield, Loader2, 
  Percent, TrendingUp, AlertCircle, Car, Palette, Package,
  Building2, Trees
} from 'lucide-react';
import { ethers } from 'ethers';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useContract } from '../../hooks/useContract';
import { useWeb3 } from '../../contexts/Web3Context';
import { useApp } from '../../contexts/AppContext';

const PropertyModal = ({ property, onClose, onPurchaseSuccess }) => {
  const { getUserShares } = useMarketplace();
  const { primaryMarket } = useContract();
  const { address } = useWeb3();
  const { showNotification, userKYCStatus } = useApp();
  const [loading, setLoading] = useState(false);
  const [percentage, setPercentage] = useState(0.1);
  const [shareCount, setShareCount] = useState(1);
  const [customInput, setCustomInput] = useState('1');
  const [inputMode, setInputMode] = useState('buttons');
  const [userCurrentShares, setUserCurrentShares] = useState(0);
  const [fetchingShares, setFetchingShares] = useState(true);
  const [usdAmount, setUsdAmount] = useState('');
  const [currencyDisplay, setCurrencyDisplay] = useState('OPN'); // NEW: Toggle for OPN/USD
  const [lastEditedField, setLastEditedField] = useState('percentage'); // Track which field was last edited
  const OPN_USD_RATE = 0.05; // 1 OPN = $0.05 USD

  // Detect model type
  const isWeightedModel = property.model === 1 || property.model === 'WEIGHTED';
  
  console.log('🔍 PropertyModal - Asset Model:', {
    assetId: property.assetId,
    model: property.model,
    isWeightedModel
  });
  
  // Helper to safely convert BigNumber to number
  const toNumber = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (ethers.BigNumber.isBigNumber(value)) {
      return parseFloat(value.toString());
    }
    return parseFloat(value);
  };
  
  // Property data based on model
  const propertyData = useMemo(() => {
    if (isWeightedModel) {
      return {
        totalValue: property.totalValue ? parseFloat(ethers.utils.formatEther(property.totalValue)) : 0,
        minWeight: property.minPurchaseWeight || 0.01,
        maxWeight: property.maxPurchaseWeight || 100,
        isWeighted: true
      };
    } else {
      return {
        totalShares: property.totalSupply ? toNumber(property.totalSupply) : 0,
        availableShares: property.availableShares ? toNumber(property.availableShares) : 0,
        pricePerShare: property.pricePerToken ? parseFloat(ethers.utils.formatEther(property.pricePerToken)) : 0,
        maxPurchaseAmount: property.maxPurchaseAmount ? toNumber(property.maxPurchaseAmount) : 0,
        minPurchaseAmount: property.minPurchaseAmount ? toNumber(property.minPurchaseAmount) : 1,
        isWeighted: false
      };
    }
  }, [property, isWeightedModel]);
  
  // Fetch user's current shares on mount (only for FIXED)
  useEffect(() => {
    const fetchUserShares = async () => {
      if (!address || !property || isWeightedModel) {
        setFetchingShares(false);
        return;
      }
      
      try {
        setFetchingShares(true);
        const assetId = property.assetId || property.tokenId;
        const shares = await getUserShares(address, assetId);
        setUserCurrentShares(parseFloat(shares || 0));
      } catch (error) {
        console.error('Error fetching user shares:', error);
        setUserCurrentShares(0);
      } finally {
        setFetchingShares(false);
      }
    };
    
    fetchUserShares();
  }, [address, property?.assetId, property?.tokenId, getUserShares, isWeightedModel]);
  
  // Set initial shareCount to minPurchaseAmount for FIXED models
  useEffect(() => {
    if (!isWeightedModel && propertyData.minPurchaseAmount) {
      const minShares = propertyData.minPurchaseAmount;
      setShareCount(minShares);
      setCustomInput(minShares.toString());
    }
  }, [isWeightedModel, propertyData.minPurchaseAmount]);
  
  // Update OPN/USD field when percentage changes from percentage inputs (not from amount input)
  useEffect(() => {
    if (isWeightedModel && percentage > 0 && lastEditedField === 'percentage') {
      const opnAmount = (percentage / 100) * propertyData.totalValue;
      if (currencyDisplay === 'USD') {
        setUsdAmount((opnAmount * OPN_USD_RATE).toFixed(2));
      } else {
        setUsdAmount(opnAmount.toFixed(2));
      }
    }
  }, [percentage, isWeightedModel, propertyData.totalValue, lastEditedField, currencyDisplay]);
  
  // Quick select options based on model
  const quickSelectOptions = useMemo(() => {
    if (isWeightedModel) {
      const options = [];
      const maxPct = propertyData.maxWeight || 100;
      
      if (maxPct >= 0.1) options.push(0.1);
      if (maxPct >= 0.5) options.push(0.5);
      if (maxPct >= 1) options.push(1);
      if (maxPct >= 5) options.push(5);
      if (maxPct >= 10) options.push(10);
      if (maxPct >= 25) options.push(25);
      
      return options;
    } else {
      const minShares = propertyData.minPurchaseAmount || 1;
      const maxShares = Math.min(
        propertyData.availableShares,
        propertyData.maxPurchaseAmount > 0 
          ? Math.max(0, propertyData.maxPurchaseAmount - userCurrentShares)
          : propertyData.availableShares
      );
      
      const options = [];
      if (maxShares >= minShares) options.push(minShares);
      if (maxShares >= minShares * 5) options.push(minShares * 5);
      if (maxShares >= minShares * 10) options.push(minShares * 10);
      if (maxShares >= minShares * 25) options.push(minShares * 25);
      
      return options.filter((val, idx, arr) => arr.indexOf(val) === idx && val <= maxShares);
    }
  }, [isWeightedModel, propertyData, userCurrentShares]);
  
  // Calculate total cost and property values
  const totalValue = isWeightedModel 
    ? propertyData.totalValue 
    : propertyData.totalShares * propertyData.pricePerShare;
    
  const totalCost = isWeightedModel 
    ? (percentage / 100) * propertyData.totalValue
    : shareCount * propertyData.pricePerShare;
  
  const soldPercentage = isWeightedModel 
    ? 0 
    : ((propertyData.totalShares - propertyData.availableShares) / propertyData.totalShares) * 100;
  
  // Handle percentage select (WEIGHTED)
  const handlePercentageSelect = (value) => {
    setPercentage(value);
    setCustomInput(value.toString());
    setInputMode('buttons');
    setLastEditedField('percentage');
    
    // Calculate equivalent OPN/USD amount
    const opnAmount = (value / 100) * propertyData.totalValue;
    if (currencyDisplay === 'USD') {
      setUsdAmount((opnAmount * OPN_USD_RATE).toFixed(2));
    } else {
      setUsdAmount(opnAmount.toFixed(2));
    }
  };
  
  // Handle share select (FIXED)
  const handleShareSelect = (value) => {
    setShareCount(value);
    setCustomInput(value.toString());
    setInputMode('buttons');
  };
  
  // Handle custom input change
  const handleCustomInputChange = (e) => {
    const value = e.target.value;
    setCustomInput(value);
    setInputMode('custom');
    setLastEditedField('percentage');
    
    if (isWeightedModel) {
      const numValue = parseFloat(value) || 0;
      setPercentage(numValue);
      
      // Update OPN/USD field to show equivalent amount
      const opnAmount = (numValue / 100) * propertyData.totalValue;
      if (currencyDisplay === 'USD') {
        setUsdAmount((opnAmount * OPN_USD_RATE).toFixed(2));
      } else {
        setUsdAmount(opnAmount.toFixed(2));
      }
    } else {
      const numValue = parseInt(value) || 0;
      setShareCount(numValue);
    }
  };
  
  // NEW: Handle OPN/USD input change (WEIGHTED ONLY)
  const handleUSDInputChange = (e) => {
    const value = e.target.value;
    setUsdAmount(value);
    setInputMode('custom');
    setLastEditedField('amount');
    
    if (value && !isNaN(value)) {
      const inputValue = parseFloat(value);
      let opnValue;
      
      if (currencyDisplay === 'USD') {
        // User entered USD, convert to OPN
        opnValue = inputValue / OPN_USD_RATE;
      } else {
        // User entered OPN directly
        opnValue = inputValue;
      }
      
      // Calculate percentage and update both percentage and customInput
      const calculatedPercentage = (opnValue / propertyData.totalValue) * 100;
      setPercentage(calculatedPercentage);
      setCustomInput(calculatedPercentage.toFixed(3));
    } else {
      setPercentage(0);
      setCustomInput('0');
    }
  };
  
  // Handle purchase
  const handlePurchase = async () => {
    if (!address) {
      showNotification('Please connect your wallet', 'error');
      return;
    }
    
    if (userKYCStatus !== 'verified') {
      showNotification('Please complete KYC verification first', 'error');
      return;
    }
    
    setLoading(true);
    
    if (isWeightedModel) {
      // WEIGHTED MODEL PURCHASE
      if (!percentage || percentage <= 0) {
        showNotification('Please select a valid ownership percentage', 'error');
        setLoading(false);
        return;
      }

      if (percentage < propertyData.minWeight) {
        showNotification(
          `Minimum purchase is ${propertyData.minWeight}%`, 
          'error'
        );
        setLoading(false);
        return;
      }
      
      if (percentage > propertyData.maxWeight) {
        showNotification(
          `Maximum purchase is ${propertyData.maxWeight}%`, 
          'error'
        );
        setLoading(false);
        return;
      }

      try {
        const weightWeiUnits = ethers.BigNumber.from(Math.floor(percentage * 1e16).toString());
        const costInWei = ethers.utils.parseEther((totalCost * 1.025).toString());
        
        console.log('Purchasing weighted:', {
          assetId: property.assetId,
          percentage: percentage + '%',
          weightWeiUnits: weightWeiUnits.toString(),
          totalPayment: (totalCost * 1.025) + ' OPN'
        });
        
        const tx = await primaryMarket.purchaseWeighted(
          property.assetId,
          weightWeiUnits,
          { value: costInWei }
        );
        
        await tx.wait();
        
        showNotification(
          `✅ Successfully acquired ${formatPercentage(percentage)}% ownership of ${property.assetName}!`,
          'success'
        );
        
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }
        
        onClose();
      } catch (error) {
        console.error('Weighted purchase error:', error);
        showNotification('Transaction failed: ' + (error.message || 'Unknown error'), 'error');
      } finally {
        setLoading(false);
      }
      
    } else {
      // FIXED MODEL PURCHASE
      if (!shareCount || shareCount <= 0) {
        showNotification('Please select a valid amount to purchase', 'error');
        setLoading(false);
        return;
      }

      if (shareCount < propertyData.minPurchaseAmount) {
        showNotification(
          `Minimum purchase is ${propertyData.minPurchaseAmount} shares`, 
          'error'
        );
        setLoading(false);
        return;
      }
      
      if (shareCount > propertyData.availableShares) {
        showNotification(
          `Only ${propertyData.availableShares} shares available`, 
          'error'
        );
        setLoading(false);
        return;
      }

      if (propertyData.maxPurchaseAmount > 0 && 
          (userCurrentShares + shareCount) > propertyData.maxPurchaseAmount) {
        showNotification(
          `You can only purchase ${propertyData.maxPurchaseAmount - userCurrentShares} more shares`, 
          'error'
        );
        setLoading(false);
        return;
      }

      try {
        const costInWei = ethers.utils.parseEther((totalCost * 1.025).toString());
        
        console.log('Purchasing fixed:', {
          assetId: property.assetId,
          shares: shareCount,
          totalPayment: (totalCost * 1.025) + ' OPN'
        });
        
        const tx = await primaryMarket.purchaseFixed(
          property.assetId,
          shareCount,
          { value: costInWei }
        );
        
        await tx.wait();
        
        showNotification(
          `✅ Successfully purchased ${shareCount} share${shareCount > 1 ? 's' : ''} of ${property.assetName}!`,
          'success'
        );
        
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }
        
        onClose();
      } catch (error) {
        console.error('Fixed purchase error:', error);
        showNotification('Transaction failed: ' + (error.message || 'Unknown error'), 'error');
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Check if user has reached max limit (FIXED only)
  const hasReachedLimit = !isWeightedModel && 
    propertyData.maxPurchaseAmount > 0 && 
    userCurrentShares >= propertyData.maxPurchaseAmount;
  
  // Format numbers
  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };
  
  const formatPercentage = (num) => {
    return parseFloat(num || 0).toLocaleString('en-US', { 
      minimumFractionDigits: 3, 
      maximumFractionDigits: 3 
    });
  };
  
  // Determine property type icon
  const getPropertyTypeIcon = () => {
    const type = property.assetType?.toLowerCase() || '';
    if (type.includes('vehicle')) return Car;
    if (type.includes('art')) return Palette;
    if (type.includes('collectible')) return Package;
    if (type.includes('commercial')) return Building2;
    if (type.includes('land')) return Trees;
    return Home;
  };

  const PropertyTypeIcon = getPropertyTypeIcon();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-black border border-neutral-900 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-black z-10 flex items-center justify-between p-4 border-b border-neutral-900 flex-shrink-0">
          <h2 className="text-xl font-light text-white">
            {property.assetType?.toLowerCase().includes('vehicle') ? 'Vehicle Details' : 
             property.assetType?.toLowerCase().includes('art') ? 'Art Details' :
             property.assetType?.toLowerCase().includes('collectible') ? 'Collectible Details' :
             'Property Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-900 transition-colors rounded-lg"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {/* UPDATED: Added relative positioning and vertical divider */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
              
              {/* VERTICAL DIVIDER - Only visible on large screens */}
              <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-neutral-800" />
              
              {/* Left Column - Property Info */}
              <div className="space-y-4 lg:pr-6">
                <div className="aspect-video w-full bg-neutral-900 rounded-lg overflow-hidden">
                  <img 
                    src={property.assetImageUrl || '/placeholder-property.jpg'} 
                    alt={property.assetName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1.5">
                    <PropertyTypeIcon className="w-3.5 h-3.5" />
                    <span>{property.assetType || 'Real Estate'}</span>
                  </div>
                  <h3 className="text-xl font-light text-white mb-2">{property.assetName}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {property.assetDescription}
                  </p>
                </div>

                {/* Investment Overview */}
                <div className="p-3 bg-neutral-950 rounded-lg">
                  <h4 className="text-xs font-semibold text-white mb-2">Investment Overview</h4>
                  
                  <div className="space-y-2">
                    {isWeightedModel ? (
                      // WEIGHTED MODEL OVERVIEW
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Total Asset Value</span>
                          <span className="text-white">{formatNumber(propertyData.totalValue)} OPN</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Min Purchase</span>
                          <span className="text-white">{propertyData.minWeight}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Max Purchase</span>
                          <span className="text-white">{propertyData.maxWeight}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Purchase Model</span>
                          <span className="text-green-400">Weighted (Percentage-based)</span>
                        </div>
                      </>
                    ) : (
                      // FIXED MODEL OVERVIEW
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Total Property Value</span>
                          <span className="text-white">{formatNumber(totalValue)} OPN</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Price per Share</span>
                          <span className="text-white">{formatNumber(propertyData.pricePerShare)} OPN</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Total Shares</span>
                          <span className="text-white">{formatNumber(propertyData.totalShares)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Available Shares</span>
                          <span className="text-green-400">{formatNumber(propertyData.availableShares)}</span>
                        </div>
                        <div className="pt-2 border-t border-neutral-800">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-neutral-400">Percentage Sold</span>
                            <span className="text-white font-semibold">{soldPercentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-neutral-900 rounded-full h-1.5">
                            <div 
                              className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${soldPercentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Purchase Model</span>
                          <span className="text-blue-400">Fixed (Token-based)</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Purchase Section */}
              <div className="space-y-4 lg:pl-6">
                {/* Purchase Requirements Info Box - Only for FIXED */}
                {!isWeightedModel && propertyData.maxPurchaseAmount > 0 && (
                  <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg">
                    <p className="text-xs text-white mb-1.5">Purchase Requirements</p>
                    <div className="space-y-0.5 text-xs text-neutral-400">
                      <p>• Max per user: {propertyData.maxPurchaseAmount} shares</p>
                      <p>• Your holdings: {userCurrentShares} shares</p>
                      <p className="text-green-400">
                        • Available: {Math.max(0, propertyData.maxPurchaseAmount - userCurrentShares)} shares
                      </p>
                    </div>
                  </div>
                )}

                {/* Purchase Interface - REMOVED BOX (bg-neutral-900 border) */}
                {!hasReachedLimit ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-light text-white">
                      {isWeightedModel ? 'Purchase Ownership' : 'Purchase Shares'}
                    </h3>

                    {/* Quick Select Buttons */}
                    <div>
                      <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
                        {isWeightedModel ? 'Quick Select Ownership' : 'Quick Select Shares'}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {quickSelectOptions.map((value) => (
                          <button
                            key={value}
                            onClick={() => isWeightedModel ? handlePercentageSelect(value) : handleShareSelect(value)}
                            className={`px-4 py-2 text-sm font-light transition-colors border rounded-lg ${
                              (isWeightedModel 
                                ? (percentage === value && inputMode === 'buttons')
                                : (shareCount === value && inputMode === 'buttons')
                              )
                                ? 'bg-white text-black border-white'
                                : 'bg-neutral-900 text-white border-neutral-800 hover:bg-neutral-800'
                            }`}
                            disabled={loading || fetchingShares}
                          >
                            {isWeightedModel ? `${value}%` : `${value} share${value > 1 ? 's' : ''}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Amount Input */}
                    <div>
                      <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
                        {isWeightedModel ? 'Custom Percentage' : 'Custom Amount'}
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={customInput}
                          onChange={handleCustomInputChange}
                          step={isWeightedModel ? "0.001" : "1"}
                          min="0"
                          placeholder={isWeightedModel ? "Enter %" : "Enter shares"}
                          className="flex-1 bg-black border border-neutral-800 rounded-lg px-4 py-2.5 text-white 
                                   focus:outline-none focus:border-white transition-colors"
                          disabled={loading || fetchingShares}
                        />
                        <button
                          onClick={() => {
                            if (isWeightedModel) {
                              const maxPct = Math.min(propertyData.maxWeight, 100);
                              setPercentage(maxPct);
                              setCustomInput(maxPct.toString());
                              setLastEditedField('percentage');
                              
                              // Update OPN/USD field
                              const opnAmount = (maxPct / 100) * propertyData.totalValue;
                              if (currencyDisplay === 'USD') {
                                setUsdAmount((opnAmount * OPN_USD_RATE).toFixed(2));
                              } else {
                                setUsdAmount(opnAmount.toFixed(2));
                              }
                            } else {
                              const maxShares = Math.min(
                                propertyData.availableShares,
                                propertyData.maxPurchaseAmount > 0 
                                  ? Math.max(0, propertyData.maxPurchaseAmount - userCurrentShares)
                                  : propertyData.availableShares
                              );
                              setShareCount(maxShares);
                              setCustomInput(maxShares.toString());
                            }
                          }}
                          className="px-6 py-2.5 bg-neutral-900 text-white font-light hover:bg-neutral-800 
                                   transition-colors border border-neutral-800 rounded-lg"
                          disabled={loading || fetchingShares}
                        >
                          MAX
                        </button>
                      </div>
                      
                      {/* NEW: Single OPN/USD Input with Toggle - WEIGHTED ONLY */}
                      {isWeightedModel && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-neutral-400 uppercase tracking-wider">
                              Or Enter Amount
                            </p>
                            {/* Currency Toggle */}
                            <div className="flex bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
                              <button
                                onClick={() => {
                                  setCurrencyDisplay('OPN');
                                  if (percentage > 0) {
                                    const opnAmount = (percentage / 100) * propertyData.totalValue;
                                    setUsdAmount(opnAmount.toFixed(2));
                                  }
                                }}
                                className={`px-3 py-1 text-xs transition-colors ${
                                  currencyDisplay === 'OPN'
                                    ? 'bg-white text-black'
                                    : 'text-neutral-400 hover:text-white'
                                }`}
                              >
                                OPN
                              </button>
                              <button
                                onClick={() => {
                                  setCurrencyDisplay('USD');
                                  if (percentage > 0) {
                                    const opnAmount = (percentage / 100) * propertyData.totalValue;
                                    setUsdAmount((opnAmount * OPN_USD_RATE).toFixed(2));
                                  }
                                }}
                                className={`px-3 py-1 text-xs transition-colors ${
                                  currencyDisplay === 'USD'
                                    ? 'bg-white text-black'
                                    : 'text-neutral-400 hover:text-white'
                                }`}
                              >
                                USD
                              </button>
                            </div>
                          </div>
                          <input
                            type="number"
                            value={usdAmount}
                            onChange={handleUSDInputChange}
                            step="0.01"
                            min="0"
                            placeholder={currencyDisplay === 'OPN' ? 'Enter OPN amount' : 'Enter USD amount'}
                            className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2.5 text-white 
                                     focus:outline-none focus:border-white transition-colors"
                            disabled={loading || fetchingShares}
                          />
                        </div>
                      )}
                    </div>

                    {/* Transaction Summary - COMPACT */}
                    <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-lg">
                      <h3 className="text-xs font-light uppercase tracking-wider text-neutral-400 mb-3">
                        Transaction Summary
                      </h3>
                      
                      <div className="space-y-2">
                        {isWeightedModel ? (
                          // WEIGHTED MODEL SUMMARY
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-light text-neutral-400">Ownership</span>
                              <span className="text-sm font-semibold text-white">{formatPercentage(percentage)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-light text-neutral-400">Investment</span>
                              <span className="text-xs font-light text-neutral-300">
                                {currencyDisplay === 'USD' 
                                  ? `$${formatNumber(totalCost * OPN_USD_RATE)} USD`
                                  : `${formatNumber(totalCost)} OPN`
                                }
                              </span>
                            </div>
                          </>
                        ) : (
                          // FIXED MODEL SUMMARY
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-light text-neutral-400">Shares</span>
                              <span className="text-sm font-semibold text-white">{shareCount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-light text-neutral-400">Ownership</span>
                              <span className="text-xs font-light text-neutral-300">
                                {((shareCount / propertyData.totalShares) * 100).toFixed(3)}%
                              </span>
                            </div>
                          </>
                        )}
                        
                        <div className="pt-2 border-t border-neutral-800 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-light text-neutral-400">Subtotal</span>
                            <span className="text-xs font-light text-white">
                              {isWeightedModel && currencyDisplay === 'USD'
                                ? `$${formatNumber(totalCost * OPN_USD_RATE)} USD`
                                : `${formatNumber(totalCost)} OPN`
                              }
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-light text-neutral-400">Fee (2.5%)</span>
                            <span className="text-xs font-light text-neutral-400">
                              {isWeightedModel && currencyDisplay === 'USD'
                                ? `$${formatNumber(totalCost * 0.025 * OPN_USD_RATE)} USD`
                                : `${formatNumber(totalCost * 0.025)} OPN`
                              }
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-neutral-800">
                            <span className="text-sm font-semibold text-white">Total</span>
                            <span className="text-sm font-semibold text-white">
                              {isWeightedModel && currencyDisplay === 'USD'
                                ? `$${formatNumber(totalCost * 1.025 * OPN_USD_RATE)} USD`
                                : `${formatNumber(totalCost * 1.025)} OPN`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Purchase Button */}
                    <div>
                      <button
                        onClick={handlePurchase}
                        disabled={loading || fetchingShares || 
                                 (isWeightedModel ? percentage <= 0 : shareCount <= 0)}
                        className="w-full bg-white text-black py-3 rounded-lg font-light 
                                 hover:bg-neutral-200 transition-colors disabled:opacity-50 
                                 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <TrendingUp className="w-4 h-4" />
                            <span>
                              {isWeightedModel 
                                ? `Acquire ${formatPercentage(percentage)}%`
                                : `Acquire ${shareCount} Share${shareCount > 1 ? 's' : ''}`
                              }
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  // Reached limit message
                  <div className="bg-red-900/10 border border-red-900/30 p-6 text-center rounded-lg">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Purchase Limit Reached</h3>
                    <p className="text-sm text-neutral-400">
                      You have reached the maximum allowed {propertyData.maxPurchaseAmount} shares for this asset.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyModal;