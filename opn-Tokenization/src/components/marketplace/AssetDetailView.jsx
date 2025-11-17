// src/components/marketplace/AssetDetailView.jsx
// FINAL FIX - getUserPositions now takes BOTH parameters (address, assetId)
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { 
  ArrowLeft, Shield, MapPin, Calendar, Users, Activity, 
  TrendingUp, FileText, Home, Maximize, DollarSign,
  Clock, CheckCircle, AlertCircle, Loader2, Expand, ChevronLeft, ChevronRight, Car
} from 'lucide-react';
import { useContract } from '../../hooks/useContract';
import { ethers } from 'ethers';
import PropertyModal from '../property/PropertyModal';

// ============================================================================
// HELPER FUNCTIONS - OUTSIDE COMPONENT
// ============================================================================

const parseAdditionalImages = (description) => {
  const images = [];
  if (!description) return images;
  
  const additionalImagesMatch = description.match(/Additional Images:([\s\S]*?)(?:\n\n|Documents:|$)/);
  
  if (additionalImagesMatch && additionalImagesMatch[1]) {
    const imagesSection = additionalImagesMatch[1];
    const imageMatches = imagesSection.matchAll(/Image \d+: (https?:\/\/[^\s\n]+)/g);
    
    for (const match of imageMatches) {
      if (match[1]) {
        images.push(match[1]);
      }
    }
  }
  return images;
};

const parseRealEstateData = (description) => {
  const data = {
    location: 'Dubai, United Arab Emirates',
    propertyType: null,
    size: null,
    yearBuilt: null
  };
  
  if (!description) return data;
  
  const locationMatch = description.match(/Location: ([^\n]+)/i);
  if (locationMatch) data.location = locationMatch[1].trim();
  
  const sizeMatch = description.match(/Size: ([\d,.]+ (?:sq\.?\s*ft|sqft|square feet|acres))/i);
  if (sizeMatch) data.size = sizeMatch[1].trim();
  
  if (description.includes('Residential Property')) data.propertyType = 'Residential';
  else if (description.includes('Commercial Property')) data.propertyType = 'Commercial';
  else if (description.includes('Land')) data.propertyType = 'Land';
  
  return data;
};

const parseVehicleData = (description) => {
  const data = {
    year: null,
    make: null,
    model: null,
    vin: null
  };
  
  if (!description) return data;
  
  const vehicleMatch = description.match(/Vehicle Details:([\s\S]*?)(?:\n\n|Additional Images:|Documents:|$)/);
  
  if (vehicleMatch && vehicleMatch[1]) {
    const vehicleSection = vehicleMatch[1];
    
    const yearMatch = vehicleSection.match(/Year: (\d{4})/);
    if (yearMatch) data.year = yearMatch[1];
    
    const makeMatch = vehicleSection.match(/Make: ([^\n]+)/);
    if (makeMatch) data.make = makeMatch[1].trim();
    
    const modelMatch = vehicleSection.match(/Model: ([^\n]+)/);
    if (modelMatch) data.model = modelMatch[1].trim();
    
    const vinMatch = vehicleSection.match(/VIN: ([^\n]+)/);
    if (vinMatch) data.vin = vinMatch[1].trim();
  }
  
  return data;
};

const cleanDescription = (description) => {
  if (!description) return '';
  
  const parts = description.split('\n\n');
  const mainDescription = parts[0] || description;
  
  return mainDescription
    .replace(/Property Details:[\s\S]*?(?=\n\n|$)/, '')
    .replace(/Vehicle Details:[\s\S]*?(?=\n\n|$)/, '')
    .replace(/Additional Images:[\s\S]*?(?=\n\n|$)/, '')
    .replace(/Documents:[\s\S]*?(?=\n\n|$)/, '')
    .trim();
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AssetDetailView = ({ asset, onBack }) => {
  // ============================================================================
  // CRITICAL: ALL HOOKS MUST BE CALLED FIRST, UNCONDITIONALLY
  // ============================================================================
  
  // Custom hooks - MUST be called first
  const { assetRegistry, positionNFT } = useContract();
  
  // State hooks - ALL must be declared before any conditional logic
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const { address } = useWeb3();
  const [holders, setHolders] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  
  // Effect hooks - ALL must be declared before any conditional logic
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!assetRegistry || !positionNFT || !asset?.assetId) {
        setLoadingTransactions(false);
        return;
      }
      
      try {
        setLoadingTransactions(true);
        console.log('🔍 Fetching transaction history for asset:', asset.assetId);
        
        // Get all position holders for this asset
        const assetData = await assetRegistry.assets(asset.assetId);
        
        // Track unique holders
        const uniqueHolders = new Set();
        
        // For WEIGHTED assets, check soldWeight
        if (assetData.model === 1) {
          const soldWeight = assetData.soldWeight ? assetData.soldWeight.toNumber() / 100 : 0;
          
          if (soldWeight > 0) {
            const txList = [];
            
            if (address) {
              try {
                // FIXED: getUserPositions takes TWO parameters (address, assetId)
                const userPositions = await positionNFT.getUserPositions(address, asset.assetId);
                
                console.log('✅ Found', userPositions.length, 'positions for user');
                
                if (userPositions.length > 0) {
                  uniqueHolders.add(address.toLowerCase());
                }
                
                for (const positionId of userPositions) {
                  const position = await positionNFT.positions(positionId);
                  
                  const ownershipPercent = position.amount.toNumber() / 100;
                  const totalValue = assetData.totalValue 
                    ? parseFloat(ethers.utils.formatEther(assetData.totalValue))
                    : 0;
                  const purchaseValue = (totalValue * ownershipPercent) / 100;
                  
                  txList.push({
                    type: 'purchase',
                    amount: `${ownershipPercent.toFixed(3)}%`,
                    value: purchaseValue.toFixed(2),
                    date: new Date().toLocaleDateString(),
                    buyer: `${address.slice(0, 6)}...${address.slice(-4)}`,
                    fullBuyer: address.toLowerCase(),
                    txHash: '0x...',
                    blockNumber: 0,
                    isCurrentUser: true,
                    total: purchaseValue,
                    price: purchaseValue / ownershipPercent
                  });
                }
              } catch (err) {
                console.error('❌ Error fetching user positions:', err);
              }
            }
            
            setTransactions(txList);
            setHolders(Array.from(uniqueHolders));
          } else {
            setTransactions([]);
            setHolders([]);
          }
        } 
        // For FIXED assets
        else {
          const totalSupply = assetData.totalSupply || ethers.BigNumber.from(0);
          const availableShares = assetData.availableShares || ethers.BigNumber.from(0);
          const soldShares = totalSupply.sub(availableShares);
          
          if (soldShares.gt(0)) {
            const txList = [];
            
            if (address) {
              try {
                // FIXED: getUserPositions takes TWO parameters (address, assetId)
                const userPositions = await positionNFT.getUserPositions(address, asset.assetId);
                
                console.log('✅ Found', userPositions.length, 'positions for user');
                
                if (userPositions.length > 0) {
                  uniqueHolders.add(address.toLowerCase());
                }
                
                for (const positionId of userPositions) {
                  const position = await positionNFT.positions(positionId);
                  
                  const shares = position.amount;
                  const pricePerToken = assetData.pricePerToken || ethers.BigNumber.from(0);
                  const purchaseValue = shares.mul(pricePerToken);
                  
                  const sharesFormatted = parseFloat(ethers.utils.formatUnits(shares, 0));
                  const ownershipPercent = totalSupply.gt(0) 
                    ? (shares.mul(10000).div(totalSupply).toNumber() / 100)
                    : 0;
                  
                  const pricePerShare = parseFloat(ethers.utils.formatEther(pricePerToken));
                  const totalPurchase = parseFloat(ethers.utils.formatEther(purchaseValue));
                  
                  txList.push({
                    type: 'purchase',
                    amount: `${sharesFormatted} shares (${ownershipPercent.toFixed(3)}%)`,
                    value: ethers.utils.formatEther(purchaseValue),
                    date: new Date().toLocaleDateString(),
                    buyer: `${address.slice(0, 6)}...${address.slice(-4)}`,
                    fullBuyer: address.toLowerCase(),
                    txHash: '0x...',
                    blockNumber: 0,
                    isCurrentUser: true,
                    total: totalPurchase,
                    price: pricePerShare
                  });
                }
              } catch (err) {
                console.error('❌ Error fetching user positions:', err);
              }
            }
            
            setTransactions(txList);
            setHolders(Array.from(uniqueHolders));
          } else {
            setTransactions([]);
            setHolders([]);
          }
        }
        
        console.log('📊 Total unique holders:', uniqueHolders.size);
      } catch (error) {
        console.error('❌ Error fetching transaction history:', error);
        setTransactions([]);
        setHolders([]);
      } finally {
        setLoadingTransactions(false);
      }
    };
    
    fetchTransactions();
  }, [assetRegistry, positionNFT, asset?.assetId, address]);

  
  // ============================================================================
  // NOW IT'S SAFE TO CHECK CONDITIONS AND RETURN EARLY
  // ============================================================================
  
  if (!asset) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-500 font-normal mb-4">Asset not found</p>
          <button 
            onClick={onBack}
            className="text-white hover:text-neutral-300 font-normal transition-colors"
          >
            Return to Marketplace
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SAFE TO PARSE DATA AND RENDER
  // ============================================================================

  // Parse the asset data
  const additionalImages = parseAdditionalImages(asset.assetDescription);
  const allImages = [asset.assetImageUrl, ...additionalImages].filter(Boolean);
  const cleanedDescription = cleanDescription(asset.assetDescription);

  // Parse type-specific data
  let propertyData = null;
  let vehicleData = null;
  const assetType = asset.assetType?.toLowerCase() || '';

  if (assetType.includes('vehicle')) {
    vehicleData = parseVehicleData(asset.assetDescription);
  } else if (
    assetType.includes('real estate') || 
    assetType.includes('property') || 
    assetType.includes('land') ||
    assetType.includes('residential') ||
    assetType.includes('commercial')
  ) {
    propertyData = parseRealEstateData(asset.assetDescription);
  }

  // Get location display text for hero
  const getLocationDisplay = () => {
    if (vehicleData && vehicleData.year && vehicleData.make && vehicleData.model) {
      return `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`;
    }
    if (propertyData && propertyData.location) {
      return propertyData.location;
    }
    return 'Dubai, United Arab Emirates';
  };
  
  // Calculate metrics - Handle both WEIGHTED and FIXED models
  const isWeighted = asset.model === 1;
  
  let totalValue, soldPercentage, availablePercentage, pricePerShare, displayStats;
  
 if (isWeighted) {
  // ✅ WEIGHTED MODEL - FIXED for 1e18 precision
  totalValue = asset.totalValue 
    ? (ethers.BigNumber.isBigNumber(asset.totalValue)
        ? parseFloat(ethers.utils.formatEther(asset.totalValue))
        : parseFloat(asset.totalValue))
    : 0;
  
  // ✅ FIXED: Use already-converted percentage values from useMarketplace
  soldPercentage = asset.soldPercentage || 0;
  availablePercentage = asset.availablePercentage || 100;
  pricePerShare = totalValue / 100;
  
  displayStats = {
    label1: 'Total Value',
    value1: totalValue.toFixed(2) + ' OPN',
    label2: 'Available',
    value2: availablePercentage.toFixed(2) + '%',
    soldLabel: 'Sold',
    soldValue: soldPercentage.toFixed(2) + '%',
    availableLabel: 'Available',
    availableValue: availablePercentage.toFixed(2) + '%',
    pricePer1Label: 'Price per 1%',
    pricePer1Value: pricePerShare.toFixed(2) + ' OPN'
  };

  } else {
    // FIXED MODEL  
    let totalShares = 0;
    let availableShares = 0;
    let pricePerToken = 0;
    
    if (asset.totalSupply) {
      totalShares = ethers.BigNumber.isBigNumber(asset.totalSupply)
        ? parseFloat(ethers.utils.formatUnits(asset.totalSupply, 0))
        : parseFloat(asset.totalSupply);
    }
    
    if (asset.availableShares) {
      availableShares = ethers.BigNumber.isBigNumber(asset.availableShares)
        ? parseFloat(ethers.utils.formatUnits(asset.availableShares, 0))
        : parseFloat(asset.availableShares);
    }
    
    if (asset.pricePerShare) {
      pricePerToken = ethers.BigNumber.isBigNumber(asset.pricePerShare)
        ? parseFloat(ethers.utils.formatEther(asset.pricePerShare))
        : parseFloat(asset.pricePerShare);
    }
    
    const soldShares = totalShares - availableShares;
    totalValue = pricePerToken * totalShares;
    soldPercentage = totalShares > 0 ? (soldShares / totalShares) * 100 : 0;
    availablePercentage = totalShares > 0 ? (availableShares / totalShares) * 100 : 0;
    pricePerShare = pricePerToken;
    
    displayStats = {
      label1: 'Total Value',
      value1: totalValue.toFixed(2) + ' OPN',
      label2: 'Available',
      value2: availableShares.toFixed(0) + ' / ' + totalShares.toFixed(0),
      soldLabel: 'Sold',
      soldValue: soldPercentage.toFixed(2) + '%',
      availableLabel: 'Available',
      availableValue: availablePercentage.toFixed(2) + '%',
      pricePer1Label: 'Price per Share',
      pricePer1Value: pricePerShare.toFixed(2) + ' OPN'
    };
  }
  
  const formatNumber = (num) => parseFloat(num).toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'documents', label: 'Documents', icon: Shield },
    { id: 'activity', label: 'Activity', icon: Activity }
  ];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-black">
      {/* Header Navigation */}
      <div className="border-b border-neutral-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-neutral-400 hover:text-white font-normal transition-colors pl-14 lg:pl-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketplace</span>
          </button>
        </div>
      </div>
      
      {/* Hero Section */}
      <div className="relative h-[300px] sm:h-[400px] overflow-hidden">
        <img 
          src={asset.assetImageUrl} 
          alt={asset.assetName}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        {/* Asset Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="px-3 py-1 bg-white/10 backdrop-blur-sm text-xs font-normal text-white/80 rounded-sm">
                    {asset.assetType}
                  </span>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-green-400" />
                    <span className="text-xs font-light text-green-400">Verified Asset</span>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-4xl font-semibold text-white mb-2">{asset.assetName}</h1>
                <div className="flex items-center gap-2 text-neutral-300">
                  {vehicleData ? <Car className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                  <span className="font-normal text-sm sm:text-base">{getLocationDisplay()}</span>
                </div>
              </div>
              
              {allImages.length > 1 && (
                <button
                  onClick={() => setShowImageModal(true)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-light rounded-sm transition-colors flex items-center gap-2"
                >
                  <Expand className="w-4 h-4" />
                  View Gallery ({allImages.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="border-b border-neutral-900">
              <div className="flex gap-8 overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 pb-4 px-2 border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-white text-white'
                        : 'border-transparent text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="font-light text-sm">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">About This Asset</h2>
                  <p className="text-neutral-300 font-light leading-relaxed">
                    {cleanedDescription || 'No description available'}
                  </p>
                </div>

                {/* Asset Highlights */}
                <div className="bg-neutral-950 border border-neutral-900 p-6 rounded-sm">
                  <h3 className="text-lg font-semibold text-white mb-4">Asset Highlights</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {vehicleData && vehicleData.year && (
                      <>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-normal text-white">Year & Make</p>
                            <p className="text-xs font-light text-neutral-400">{vehicleData.year} {vehicleData.make}</p>
                          </div>
                        </div>
                        {vehicleData.model && (
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-normal text-white">Model</p>
                              <p className="text-xs font-light text-neutral-400">{vehicleData.model}</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    {propertyData && propertyData.size && (
                      <>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-normal text-white">Property Size</p>
                            <p className="text-xs font-light text-neutral-400">{propertyData.size}</p>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-normal text-white">Blockchain Verified</p>
                        <p className="text-xs font-light text-neutral-400">Secured on OPN Network</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-normal text-white">Ownership Model</p>
                        <p className="text-xs font-light text-neutral-400">
                          {isWeighted ? 'Weighted Percentage' : 'Fixed Token'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="bg-neutral-950 border border-neutral-900 p-6 rounded-sm">
                  <h3 className="text-lg font-semibold text-white mb-4">Asset Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-neutral-900">
                      <span className="text-sm font-light text-neutral-400">Asset Type</span>
                      <span className="text-sm font-normal text-white">{asset.assetType}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-900">
                      <span className="text-sm font-light text-neutral-400">Ownership Model</span>
                      <span className="text-sm font-normal text-white">
                        {isWeighted ? 'Weighted Percentage' : 'Fixed Token'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-900">
                      <span className="text-sm font-light text-neutral-400">Total Holders</span>
                      <span className="text-sm font-normal text-white">{holders.length}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm font-light text-neutral-400">Asset ID</span>
                      <span className="text-sm font-mono text-white">#{asset.assetId}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="bg-neutral-950 border border-neutral-900 p-8 rounded-sm text-center">
                  <Shield className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Verification Documents</h3>
                  <p className="text-sm font-light text-neutral-400">
                    All assets are verified and documented on the OPN blockchain
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Transaction History</h3>
                
                {loadingTransactions ? (
                  <div className="bg-neutral-950 border border-neutral-900 p-8 rounded-sm text-center">
                    <Loader2 className="w-6 h-6 text-neutral-400 animate-spin mx-auto mb-2" />
                    <p className="text-neutral-400 font-light">Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="bg-neutral-950 border border-neutral-900 p-8 rounded-sm text-center">
                    <Activity className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                    <p className="text-neutral-400 font-light">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx, idx) => (
                      <div key={idx} className="bg-neutral-950 border border-neutral-900 p-4 rounded-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-500/10 rounded-sm">
                              <TrendingUp className="w-4 h-4 text-green-400" />
                            </div>
                            <div>
                              <p className="text-sm font-normal text-white">Purchase</p>
                              <p className="text-xs font-light text-neutral-400 mt-1">
                                {tx.buyer} bought {tx.amount}
                              </p>
                              <p className="text-xs font-light text-neutral-500 mt-1">{tx.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">{tx.total.toFixed(2)} OPN</p>
                            <p className="text-xs font-light text-neutral-400">
                              @ {tx.price.toFixed(2)} OPN each
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Purchase Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-neutral-950 border border-neutral-900 p-6 rounded-sm">
              <div className="mb-6">
                <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                  {displayStats.pricePer1Label}
                </p>
                <p className="text-2xl font-semibold text-white">{displayStats.pricePer1Value}</p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-sm font-light text-neutral-400">{displayStats.label1}</span>
                  <span className="text-sm font-normal text-white">{displayStats.value1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-light text-neutral-400">{displayStats.label2}</span>
                  <span className="text-sm font-normal text-white">{displayStats.value2}</span>
                </div>
                
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs text-neutral-500 mb-2">
                    <span>{displayStats.availableLabel}</span>
                    <span>{displayStats.availableValue}</span>
                  </div>
                  <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-white to-neutral-400"
                      style={{ 
                        width: `${parseFloat(displayStats.soldValue)}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500 mt-2">
                    <span>{displayStats.soldLabel}</span>
                    <span>{displayStats.soldValue}</span>
                  </div>
                </div>
              </div>
              
              {asset.requiresPurchaserKYC && (
                <div className="flex items-start gap-2 p-3 bg-amber-900/10 border border-amber-900/30 rounded-sm mb-6">
                  <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-400">KYC Required</p>
                    <p className="text-xs font-light text-amber-400/70 mt-1">
                      Identity verification required for this asset
                    </p>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setShowBuyModal(true)}
                className="w-full py-3 bg-white text-black font-normal rounded-sm
                         hover:bg-neutral-100 transition-all duration-300
                         flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Acquire Ownership</span>
              </button>
              
              <div className="pt-4 space-y-3 text-xs text-neutral-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  <span className="font-light">Verified on OPN Chain</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  <span className="font-light">Smart Contract Secured</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  <span className="font-light">24/7 Trading Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <button
            onClick={prevImage}
            className="absolute left-6 p-3 bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          <img 
            src={allImages[currentImageIndex]}
            alt={`${asset.assetName} - Image ${currentImageIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
          
          <button
            onClick={nextImage}
            className="absolute right-6 p-3 bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
          
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
            {allImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentImageIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Buy Modal */}
      {showBuyModal && (
        <PropertyModal 
          property={asset}
          onClose={() => setShowBuyModal(false)}
        />
      )}
    </div>
  );
};

export default AssetDetailView;