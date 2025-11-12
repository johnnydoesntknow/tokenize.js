// src/components/property/PropertyModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, MapPin, Home, Maximize, Calendar, Users, Shield, Loader2, 
  Percent, TrendingUp, AlertCircle, Car, Palette, Package,
  Building2, Trees, Bed, Bath
} from 'lucide-react';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useWeb3 } from '../../contexts/Web3Context';
import { useApp } from '../../contexts/AppContext';

const PropertyModal = ({ property, onClose }) => {
  const { purchaseShares, getUserShares } = useMarketplace();
  const { address } = useWeb3();
  const { showNotification, userKYCStatus } = useApp();
  const [loading, setLoading] = useState(false);
  const [percentage, setPercentage] = useState(0.1);
  const [customInput, setCustomInput] = useState('0.1');
  const [inputMode, setInputMode] = useState('buttons');
  const [userCurrentShares, setUserCurrentShares] = useState(0);
  const [fetchingShares, setFetchingShares] = useState(true);
  
  // Fetch user's current shares on mount
  useEffect(() => {
    const fetchUserShares = async () => {
      if (!address || !property) {
        setFetchingShares(false);
        return;
      }
      
      try {
        setFetchingShares(true);
        const assetId = property.assetId || property.tokenId;
        const shares = await getUserShares(address, assetId);
        setUserCurrentShares(parseInt(shares || 0));
      } catch (error) {
        console.error('Error fetching user shares:', error);
        setUserCurrentShares(0);
      } finally {
        setFetchingShares(false);
      }
    };
    
    fetchUserShares();
  }, [address, property?.assetId, property?.tokenId]);
  
  // Calculate purchase limits
  const maxPurchaseAmount = parseInt(property.maxPurchaseAmount || 0);
  const minPurchaseAmount = parseInt(property.minPurchaseAmount || 1);
  const availableShares = parseInt(property.availableShares || 0);
  
  // Calculate remaining allowed shares for this user
  const remainingAllowed = useMemo(() => {
    if (maxPurchaseAmount > 0) {
      return Math.max(0, maxPurchaseAmount - userCurrentShares);
    }
    return availableShares;
  }, [maxPurchaseAmount, userCurrentShares, availableShares]);
  
  // Calculate maximum percentage user can buy
  const maxPercentage = useMemo(() => {
    const total = parseInt(property.totalShares || 1);
    const maxSharesUserCanBuy = Math.min(availableShares, remainingAllowed);
    return total > 0 ? (maxSharesUserCanBuy / total) * 100 : 0;
  }, [property.totalShares, availableShares, remainingAllowed]);
  
  // Calculate share amount from percentage
  const shareAmount = useMemo(() => {
    const total = parseInt(property.totalShares || 0);
    return Math.floor((percentage / 100) * total);
  }, [percentage, property.totalShares]);
  
  // Calculate total cost
  const totalCost = useMemo(() => {
    return parseFloat(property.pricePerShare || 0) * shareAmount;
  }, [property.pricePerShare, shareAmount]);
  
  const totalValue = parseFloat(property.pricePerShare) * parseInt(property.totalShares);
  const soldPercentage = ((parseInt(property.totalShares) - parseInt(property.availableShares)) / parseInt(property.totalShares)) * 100;
  
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
  
  // Quick percentage options
  const quickPercentages = useMemo(() => {
    const options = [];
    const max = maxPercentage > 0 ? maxPercentage : 100;
    
    if (max >= 0.1) options.push(0.1);
    if (max >= 0.5) options.push(0.5);
    if (max >= 1) options.push(1);
    if (max >= 5) options.push(5);
    if (max >= 10) options.push(10);
    if (max >= 25) options.push(25);
    
    return options;
  }, [maxPercentage]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);
  
  const handlePercentageSelect = (value) => {
    setPercentage(value);
    setCustomInput(value.toString());
    setInputMode('buttons');
  };
  
  const handleSliderChange = (e) => {
    const value = parseFloat(e.target.value);
    const maxAllowed = maxPercentage > 0 ? maxPercentage : 100;
    const cappedValue = Math.min(value, maxAllowed);
    setPercentage(cappedValue);
    setCustomInput(cappedValue.toString());
    setInputMode('slider');
  };
  
  const handleCustomInputChange = (e) => {
    const value = e.target.value;
    setCustomInput(value);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      const clampedValue = Math.min(maxPercentage, Math.max(0.001, numValue));
      setPercentage(clampedValue);
    }
  };
  
  const meetsKYCRequirement = useMemo(() => {
    if (!property.requiresPurchaserKYC) return true;
    return userKYCStatus === true;
  }, [property.requiresPurchaserKYC, userKYCStatus]);
  
  const handlePurchase = async () => {
    // Validation checks
    if (!shareAmount || shareAmount <= 0) {
      showNotification('Please select a valid percentage to purchase', 'error');
      return;
    }

    if (shareAmount < minPurchaseAmount) {
      showNotification(
        `Minimum purchase requirement is ${minPurchaseAmount} share${minPurchaseAmount > 1 ? 's' : ''}. You selected ${shareAmount} share${shareAmount > 1 ? 's' : ''}.`, 
        'error'
      );
      return;
    }

    if (shareAmount > availableShares) {
      showNotification(
        `Only ${availableShares} shares are available, but you're trying to buy ${shareAmount} shares.`, 
        'error'
      );
      return;
    }

    if (maxPurchaseAmount > 0) {
      if (fetchingShares) {
        showNotification('Please wait while we check your current holdings...', 'info');
        return;
      }
      
      const totalAfterPurchase = userCurrentShares + shareAmount;
      
      if (userCurrentShares >= maxPurchaseAmount) {
        showNotification(
          `❌ Purchase Limit Reached: You already own the maximum allowed ${maxPurchaseAmount} shares for this asset.`, 
          'error'
        );
        return;
      }
      
      if (totalAfterPurchase > maxPurchaseAmount) {
        const remainingAllowed = maxPurchaseAmount - userCurrentShares;
        showNotification(
          `❌ Exceeds Purchase Limit: This asset has a maximum of ${maxPurchaseAmount} shares per user. You currently own ${userCurrentShares} shares, so you can only purchase up to ${remainingAllowed} more shares.`, 
          'error'
        );
        return;
      }
    }

    if (!meetsKYCRequirement) {
      showNotification('KYC verification is required to purchase this property', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      const assetId = property.assetId || property.tokenId;
      const tx = await purchaseShares(assetId, shareAmount);
      
      showNotification(
        `✅ Successfully acquired ${formatPercentage(percentage)}% ownership of ${property.assetName}!`, 
        'success'
      );
      
      onClose();
    } catch (error) {
      console.error('Purchase transaction error:', error);
      
      let errorMessage = 'Transaction failed. ';
      
      if (error.code === 'ACTION_REJECTED' || error.message?.includes('rejected')) {
        errorMessage = '❌ Transaction was rejected in your wallet.';
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('insufficient balance')) {
        errorMessage = '❌ Insufficient OPN balance to complete this purchase.';
      } else if (error.message?.includes('ExceedsMaxPurchase')) {
        errorMessage = `❌ Contract Error: Purchase exceeds the maximum allowed ${maxPurchaseAmount} shares per user.`;
      } else if (error.message?.includes('BelowMinPurchase')) {
        errorMessage = `❌ Contract Error: Purchase is below the minimum required ${minPurchaseAmount} shares.`;
      } else if (error.message?.includes('InsufficientShares')) {
        errorMessage = '❌ Contract Error: Not enough shares available.';
      } else if (error.message?.includes('KYCRequired') || error.message?.includes('NotVerified')) {
        errorMessage = '❌ KYC verification required but not completed.';
      } else if (error.reason) {
        errorMessage = `❌ ${error.reason}`;
      } else {
        errorMessage = '❌ Transaction failed. Please check your wallet and try again.';
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Check if user has reached max limit
  const hasReachedLimit = maxPurchaseAmount > 0 && userCurrentShares >= maxPurchaseAmount;

  // Determine property type icon
  const getPropertyTypeIcon = () => {
    const type = property.propertyType || property.propertySubType || '';
    if (type.toLowerCase().includes('commercial')) return Building2;
    if (type.toLowerCase().includes('land')) return Trees;
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
      <div className="relative bg-black border border-neutral-900 rounded-sm max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-black z-10 flex items-center justify-between p-6 border-b border-neutral-900 flex-shrink-0">
          <h2 className="text-2xl font-light text-white">
  {property.assetType?.toLowerCase().includes('vehicle') ? 'Vehicle Details' : 
   property.assetType?.toLowerCase().includes('art') ? 'Art Details' :
   property.assetType?.toLowerCase().includes('collectible') ? 'Collectible Details' :
   'Property Details'}
</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-900 rounded-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Column - Image and Complete Details */}
            <div>
              {/* Main Image */}
              <img 
                src={property.assetImageUrl} 
                alt={property.assetName}
                className="w-full aspect-[4/3] object-cover rounded-sm mb-6"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';
                }}
              />
              
              {/* Additional Images if they exist */}
              {(property.imageUrl2 || property.imageUrl3 || property.imageUrl4 || property.imageUrl5) && (
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {property.imageUrl2 && (
                    <img src={property.imageUrl2} alt="Additional" className="w-full h-20 object-cover rounded-sm" />
                  )}
                  {property.imageUrl3 && (
                    <img src={property.imageUrl3} alt="Additional" className="w-full h-20 object-cover rounded-sm" />
                  )}
                  {property.imageUrl4 && (
                    <img src={property.imageUrl4} alt="Additional" className="w-full h-20 object-cover rounded-sm" />
                  )}
                  {property.imageUrl5 && (
                    <img src={property.imageUrl5} alt="Additional" className="w-full h-20 object-cover rounded-sm" />
                  )}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-neutral-500 font-normal mb-2">
                    {property.assetType || 'REAL_ESTATE'}
                  </p>
                  <h3 className="text-2xl font-semibold text-white">{property.assetName}</h3>
                </div>
                
                <p className="text-neutral-400">{property.assetDescription}</p>
                
                {/* Only show property details for real estate assets */}
{(property.assetType?.toLowerCase().includes('property') || 
  property.assetType?.toLowerCase().includes('real estate') ||
  property.assetType?.toLowerCase().includes('residential') ||
  property.assetType?.toLowerCase().includes('commercial') ||
  property.assetType?.toLowerCase().includes('land')) && (
  <div className="grid grid-cols-2 gap-4 text-sm">
    <div className="flex items-center gap-2">
      <MapPin className="w-4 h-4 text-neutral-500" />
      <div>
        <p className="text-xs text-neutral-500">Location</p>
        <p className="text-white">{property.propertyData?.location || 'Location not specified'}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Maximize className="w-4 h-4 text-neutral-500" />
      <div>
        <p className="text-xs text-neutral-500">Size</p>
        <p className="text-white">{property.propertyData?.size || 'Size not specified'}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Home className="w-4 h-4 text-neutral-500" />
      <div>
        <p className="text-xs text-neutral-500">Type</p>
        <p className="text-white">{property.propertyData?.propertyType || property.assetType}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-neutral-500" />
      <div>
        <p className="text-xs text-neutral-500">Year Built</p>
        <p className="text-white">{property.propertyData?.yearBuilt || 'Year not specified'}</p>
      </div>
    </div>
  </div>
)}

{/* Show vehicle details for vehicles */}
{(property.assetType?.toLowerCase().includes('vehicle') || 
  property.assetType?.toLowerCase().includes('car')) && property.vehicleData && (
  <div className="grid grid-cols-2 gap-4 text-sm">
    {property.vehicleData.year && (
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-neutral-500" />
        <div>
          <p className="text-xs text-neutral-500">Year</p>
          <p className="text-white">{property.vehicleData.year}</p>
        </div>
      </div>
    )}
    {property.vehicleData.make && (
      <div className="flex items-center gap-2">
        <Car className="w-4 h-4 text-neutral-500" />
        <div>
          <p className="text-xs text-neutral-500">Make</p>
          <p className="text-white">{property.vehicleData.make}</p>
        </div>
      </div>
    )}
    {property.vehicleData.model && (
      <div className="flex items-center gap-2">
        <Car className="w-4 h-4 text-neutral-500" />
        <div>
          <p className="text-xs text-neutral-500">Model</p>
          <p className="text-white">{property.vehicleData.model}</p>
        </div>
      </div>
    )}
    {property.vehicleData.vin && (
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-neutral-500" />
        <div>
          <p className="text-xs text-neutral-500">VIN</p>
          <p className="text-white font-mono text-xs">{property.vehicleData.vin}</p>
        </div>
      </div>
    )}
  </div>
)}
                
                {/* Investment Overview */}
                <div className="p-4 bg-neutral-950 rounded-sm">
                  <h4 className="text-sm font-semibold text-white mb-3">Investment Overview</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Total Property Value</span>
                      <span className="text-white">{formatNumber(totalValue)} OPN</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Price per Share</span>
                      <span className="text-white">{property.pricePerShare} OPN</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Total Shares</span>
                      <span className="text-white">{property.totalShares}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Available Shares</span>
                      <span className="text-green-400">{property.availableShares}</span>
                    </div>
                    
                    <div className="pt-3 border-t border-neutral-800">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Percentage Sold</span>
                        <span className="text-white font-semibold">{soldPercentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Purchase Section */}
            <div className="space-y-6">
              {/* Purchase Requirements Info Box */}
              {(maxPurchaseAmount > 0 || minPurchaseAmount > 1) && (
                <div className="bg-neutral-900 border border-neutral-800 p-4">
                  <p className="text-sm text-white mb-2">Purchase Requirements</p>
                  <div className="space-y-1 text-xs text-neutral-400">
                    {maxPurchaseAmount > 0 && (
                      <>
                        <p>• Maximum per user: {maxPurchaseAmount} shares</p>
                        <p>• Your current holdings: {userCurrentShares} shares</p>
                        <p className="text-green-400">
                          • You can buy up to {remainingAllowed} more shares
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Purchase Interface */}
              {!hasReachedLimit ? (
                <div className="bg-neutral-950 border border-neutral-800 rounded-sm p-6">
                  <h3 className="text-lg font-normal text-white mb-6">Purchase Shares</h3>
                  
                  {/* Purchase Limit Information Box */}
                  {maxPurchaseAmount > 0 && (
                    <div className="mb-6 p-4 bg-neutral-900 border border-neutral-800">
                      <p className="text-sm text-white mb-2">
                        Purchase Limit Information
                      </p>
                      <div className="space-y-1 text-xs text-neutral-400">
                        <p>• Maximum allowed per user: <span className="text-white font-semibold">{maxPurchaseAmount} shares</span></p>
                        <p>• You currently own: <span className="text-white font-semibold">{userCurrentShares} shares</span></p>
                        <p>• You can purchase up to: <span className="text-green-400 font-semibold">{remainingAllowed} more shares</span></p>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-6">
                    {/* Quick Select Ownership */}
                    <div>
                      <label className="text-xs font-light uppercase tracking-wider text-neutral-400 block mb-4">
                        Quick Select Ownership
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {quickPercentages.map((pct) => (
                          <button
                            key={pct}
                            onClick={() => handlePercentageSelect(pct)}
                            className={`
                              py-3 px-4 border transition-all duration-200
                              ${percentage === pct 
                                ? 'bg-white text-black border-white' 
                                : 'bg-black text-white border-neutral-800 hover:border-neutral-600'
                              }
                            `}
                            disabled={loading || fetchingShares}
                          >
                            {pct}%
                          </button>
                        ))}
                        <button
                          onClick={() => handlePercentageSelect(maxPercentage > 0 ? maxPercentage : 100)}
                          className={`
                            py-3 px-4 border transition-all duration-200
                            ${percentage === (maxPercentage > 0 ? maxPercentage : 100)
                              ? 'bg-white text-black border-white' 
                              : 'bg-black text-white border-neutral-800 hover:border-neutral-600'
                            }
                          `}
                          disabled={loading || fetchingShares}
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Custom Percentage Slider */}
                    <div>
                      <label className="text-xs font-light uppercase tracking-wider text-neutral-400 block mb-4">
                        Custom Percentage
                      </label>
                      
                      <div className="mb-4">
                        <input
                          type="range"
                          min={0.001}
                          max={maxPercentage > 0 ? maxPercentage : 100}
                          step={0.001}
                          value={percentage}
                          onChange={handleSliderChange}
                          className="w-full accent-blue-500 cursor-pointer"
                          disabled={loading || fetchingShares}
                        />
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-neutral-500">0%</span>
                          <span className="text-xs text-neutral-500">
                            {formatPercentage(maxPercentage > 0 ? maxPercentage : 100)}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Status message */}
                      <div className="text-xs text-center mb-4">
                        {fetchingShares ? (
                          <span className="text-neutral-400">Checking your holdings...</span>
                        ) : (
                          <p className="text-neutral-400">
                            Select your desired ownership percentage
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            value={customInput}
                            onChange={handleCustomInputChange}
                            onFocus={() => setInputMode('custom')}
                            min="0.001"
                            max={maxPercentage > 0 ? maxPercentage : 100}
                            step="0.001"
                            className="w-full px-4 py-3 pr-12 bg-black border border-neutral-800 text-white font-light 
                                     focus:border-neutral-600 focus:outline-none transition-colors"
                            placeholder="Enter percentage"
                            disabled={loading || fetchingShares}
                          />
                          <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        </div>
                        <button
                          onClick={() => {
                            const maxAllowed = maxPercentage > 0 ? maxPercentage : 100;
                            handlePercentageSelect(maxAllowed);
                          }}
                          className="px-6 py-3 bg-neutral-900 text-white font-light hover:bg-neutral-800 
                                   transition-colors border border-neutral-800"
                          disabled={loading || fetchingShares}
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Transaction Summary */}
                    <div className="bg-neutral-950 border border-neutral-900 p-6">
                      <h3 className="text-xs font-light uppercase tracking-wider text-neutral-400 mb-4">
                        Transaction Summary
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-light text-neutral-400">Ownership Percentage</span>
                          <span className="text-lg font-semibold text-white">{formatPercentage(percentage)}%</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-light text-neutral-400">Number of Units</span>
                          <span className="text-sm font-light text-neutral-300">{shareAmount.toLocaleString()}</span>
                        </div>
                        
                        {/* Show position after purchase - ONLY ONCE */}
                        {maxPurchaseAmount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-light text-neutral-400">After Purchase</span>
                            <span className="text-sm font-light text-green-400">
                              {userCurrentShares + shareAmount} / {maxPurchaseAmount} shares
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-light text-neutral-400">Price per Unit</span>
                          <span className="text-sm font-light text-neutral-300">{property.pricePerShare} OPN</span>
                        </div>
                        
                        <div className="h-px bg-neutral-800 my-3"></div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-light text-neutral-400">Platform Fee (2.5%)</span>
                          <span className="text-sm font-normal text-amber-400">
                            {formatNumber(totalCost * 0.025)} OPN
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-base font-normal text-white">Total Cost</span>
                          <span className="text-2xl font-semibold text-white">
                            {formatNumber(totalCost * 1.025)} OPN
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Info Section */}
                    <div className="bg-blue-900/10 border border-blue-900/30 p-4">
                      <div className="text-xs font-light text-neutral-300 space-y-1">
                        <p>• Each unit represents {property.totalShares > 0 ? (100 / parseInt(property.totalShares)).toFixed(6) : '0'}% ownership</p>
                        <p>• Ownership is immediately tradeable on secondary markets</p>
                        <p>• All transactions are recorded immutably on-chain</p>
                        <p>• Fractional owners may receive proportional dividends if applicable</p>
                        {maxPurchaseAmount > 0 && (
                          <p className="text-amber-300">• This asset has a {maxPurchaseAmount} share maximum per user</p>
                        )}
                        {shareAmount < minPurchaseAmount && (
                          <p className="text-yellow-400">• Minimum purchase is {minPurchaseAmount} share{minPurchaseAmount > 1 ? 's' : ''}. Increase percentage.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-900/10 border border-red-900/30 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-normal text-white">Purchase Limit Reached</h3>
                  </div>
                  <p className="text-sm text-neutral-300">
                    You have reached the maximum allowed holdings of {maxPurchaseAmount} shares for this asset.
                  </p>
                  <p className="text-xs text-neutral-400 mt-2">
                    This limit is set by the asset owner to ensure fair distribution.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-3 text-neutral-400 hover:text-white font-light 
                           transition-colors disabled:opacity-50 border border-neutral-800
                           hover:border-neutral-700"
                >
                  Cancel
                </button>
                {!hasReachedLimit && (
                  <button
                    onClick={handlePurchase}
                    disabled={loading || shareAmount < 1 || !meetsKYCRequirement || fetchingShares}
                    className="flex-1 py-3 bg-white text-black font-light 
                             hover:bg-neutral-100 transition-all duration-300
                             disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Transaction...</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4 ml-2 sm:ml-0" />
                        <span>Acquire {formatPercentage(percentage)}% Ownership</span>
                      </>
                    )}
                  </button>
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