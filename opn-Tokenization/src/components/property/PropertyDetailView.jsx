// src/components/property/PropertyDetailView.jsx
// COMPLETE FIX - Supports both WEIGHTED and FIXED models with correct calculations + Activity Tab
import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Home, Building, Calendar, Users, Shield, Activity, ChevronLeft, ChevronRight, Expand, Car, Package, Palette } from 'lucide-react';
import { ethers } from 'ethers';
import { useContract } from '../../hooks/useContract';
import PropertyModal from './PropertyModal';

const PropertyDetailView = ({ property, onBack, onPurchaseSuccess }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showModal, setShowModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  
  const { positionNFT } = useContract();
  
  // Early return if no property
  if (!property) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-500 font-light mb-4">Property not found</p>
          <button 
            onClick={onBack}
            className="text-white hover:text-neutral-300 font-light transition-colors"
          >
            Return to Properties
          </button>
        </div>
      </div>
    );
  }
  
  // Fetch transaction history
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!positionNFT || !property.assetId) return;
      
      try {
        setLoadingActivity(true);
        
        // Get current block
        const currentBlock = await positionNFT.provider.getBlockNumber();
        
        // Query last 5000 blocks to stay under the 10000 block limit
        const fromBlock = Math.max(0, currentBlock - 5000);
        
        // Query PositionMinted events for this asset
        const filter = positionNFT.filters.PositionMinted(null, property.assetId);
        const events = await positionNFT.queryFilter(filter, fromBlock, currentBlock);
        
        if (events.length === 0) {
          setTransactions([]);
          setLoadingActivity(false);
          return;
        }
        
        const txList = await Promise.all(
          events.map(async (event) => {
            try {
              const block = await event.getBlock();
              const isWeighted = property.model === 1;
              
              return {
                type: 'Purchase',
                user: event.args.owner,
                amount: isWeighted 
                  ? `${(event.args.amount / 100).toFixed(2)}%`
                  : `${event.args.amount.toString()} shares`,
                timestamp: new Date(block.timestamp * 1000).toLocaleString(),
                txHash: event.transactionHash
              };
            } catch (err) {
              console.error('Error processing event:', err);
              return null;
            }
          })
        );
        
        // Filter out any null results and reverse for most recent first
        setTransactions(txList.filter(tx => tx !== null).reverse());
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setTransactions([]);
      } finally {
        setLoadingActivity(false);
      }
    };
    
    if (activeTab === 'activity') {
      fetchTransactions();
    }
  }, [positionNFT, property.assetId, property.model, activeTab]);
  
  // Get additional images from the property object (parsed from description)
  const additionalImages = property.additionalImages || [];
  const allImages = [property.assetImageUrl, ...additionalImages].filter(Boolean);
  
  // ============================================================================
  // FIXED CALCULATIONS - Support both WEIGHTED and FIXED models
  // ============================================================================
  
  const isWeighted = property.model === 1;
  
  let totalValue, availablePercentage, soldPercentage, pricePerShare;
  
  if (isWeighted) {
    // WEIGHTED MODEL
    totalValue = property.totalValue 
      ? parseFloat(ethers.utils.formatEther(property.totalValue))
      : 0;
    
    const soldWeight = property.soldWeight || 0;
    const availableWeight = property.availableWeight || (10000 - soldWeight);
    
    soldPercentage = (soldWeight / 100); // Convert basis points to percentage
    availablePercentage = (availableWeight / 100);
    pricePerShare = totalValue / 100; // Price per 1%
  } else {
    // FIXED MODEL - Use correct field names
    pricePerShare = property.pricePerToken 
      ? parseFloat(ethers.utils.formatEther(property.pricePerToken))
      : 0;
    
    const totalShares = property.totalSupply 
      ? parseFloat(property.totalSupply.toString())
      : 0;
    
    const availableShares = property.availableShares
      ? parseFloat(property.availableShares.toString())
      : 0;
    
    const soldShares = totalShares - availableShares;
    totalValue = pricePerShare * totalShares;
    soldPercentage = totalShares > 0 ? (soldShares / totalShares) * 100 : 0;
    availablePercentage = totalShares > 0 ? (availableShares / totalShares) * 100 : 0;
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  // Determine asset type and get appropriate icon
  const getAssetIcon = () => {
    const type = property.assetType?.toLowerCase() || '';
    if (type.includes('vehicle')) return Car;
    if (type.includes('art')) return Palette;
    if (type.includes('collectible')) return Package;
    return Building; // Default for real estate
  };

  const AssetIcon = getAssetIcon();

  // Render asset-specific details based on type
  const renderAssetDetails = () => {
    const type = property.assetType?.toLowerCase() || '';
    
    // Vehicle-specific details
    if (type.includes('vehicle') && property.vehicleData) {
      const { year, make, model: vehicleModel, vin } = property.vehicleData;
      
      return (
        <div className="bg-neutral-950 border border-neutral-800 p-6">
          <h3 className="text-lg font-light text-white mb-4">Vehicle Information</h3>
          <div className="grid grid-cols-2 gap-6">
            {year && (
              <div>
                <p className="text-xs text-neutral-500 mb-1">Year</p>
                <p className="text-white">{year}</p>
              </div>
            )}
            {make && (
              <div>
                <p className="text-xs text-neutral-500 mb-1">Make</p>
                <p className="text-white">{make}</p>
              </div>
            )}
            {vehicleModel && (
              <div>
                <p className="text-xs text-neutral-500 mb-1">Model</p>
                <p className="text-white">{vehicleModel}</p>
              </div>
            )}
            {vin && (
              <div className="col-span-2">
                <p className="text-xs text-neutral-500 mb-1">VIN</p>
                <p className="text-white font-mono text-sm">{vin}</p>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Real estate-specific details
    if (property.propertyData) {
      const { location, propertyType, size, yearBuilt } = property.propertyData;
      
      return (
        <div className="bg-neutral-950 border border-neutral-800 p-6">
          <h3 className="text-lg font-light text-white mb-4">Property Information</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-neutral-500 mb-1">Location</p>
              <p className="text-white">{location || 'Dubai, United Arab Emirates'}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Property Type</p>
              <p className="text-white">{propertyType || 'Real Estate'}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Size</p>
              <p className="text-white">{size || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Year Built</p>
              <p className="text-white">{yearBuilt || 'Not specified'}</p>
            </div>
          </div>
        </div>
      );
    }
    
    // Default for any other asset type
    return (
      <div className="bg-neutral-950 border border-neutral-800 p-6">
        <h3 className="text-lg font-light text-white mb-4">Asset Details</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-neutral-500 mb-1">Asset Type</p>
            <p className="text-white">{property.assetType}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Asset ID</p>
            <p className="text-white">#{property.assetId}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-neutral-900">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-neutral-400 hover:text-white font-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Properties</span>
          </button>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative h-96 bg-neutral-950">
        <img 
          src={property.assetImageUrl || property.mainImageUrl} 
          alt={property.assetName}
          className="w-full h-full object-cover opacity-80"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        {/* Property Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-3">
              <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-sm">
                {property.assetType || 'REAL ESTATE'}
              </span>
            </div>
            <h1 className="text-4xl font-light text-white mb-2">{property.assetName}</h1>
            <div className="flex items-center gap-2 text-neutral-300">
              <div className="flex items-center gap-2">
                <AssetIcon className="w-4 h-4" />
                <span className="font-light">
                  {(() => {
                    if (property.vehicleData && property.vehicleData.year && property.vehicleData.make && property.vehicleData.model) {
                      return `${property.vehicleData.year} ${property.vehicleData.make} ${property.vehicleData.model}`;
                    }
                    if (property.propertyData && property.propertyData.location) {
                      return property.propertyData.location;
                    }
                    return 'Dubai, United Arab Emirates';
                  })()}
                </span>
              </div>
            </div>
          </div>
          
          {/* Stats Overlay */}
          <div className="absolute top-6 right-6 flex gap-4">
            <div className="bg-black/50 backdrop-blur-sm px-4 py-2">
              <p className="text-xs text-white/60">Total Value</p>
              <p className="text-lg font-light text-white">{totalValue.toFixed(2)} OPN</p>
            </div>
            <div className="bg-black/50 backdrop-blur-sm px-4 py-2">
              <p className="text-xs text-white/60">Available</p>
              <p className="text-lg font-light text-green-400">{availablePercentage.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="border-b border-neutral-800 mb-8">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-4 text-sm font-light transition-colors ${
                    activeTab === 'overview' 
                      ? 'text-white border-b-2 border-white' 
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-4 text-sm font-light transition-colors ${
                    activeTab === 'details' 
                      ? 'text-white border-b-2 border-white' 
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`pb-4 text-sm font-light transition-colors ${
                    activeTab === 'documents' 
                      ? 'text-white border-b-2 border-white' 
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  Documents
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`pb-4 text-sm font-light transition-colors ${
                    activeTab === 'activity' 
                      ? 'text-white border-b-2 border-white' 
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  Activity
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* About this Asset */}
                <div>
                  <h2 className="text-xl font-light text-white mb-4">About this Asset</h2>
                  <p className="text-neutral-400 leading-relaxed">
                    {property.assetDescription?.split('\n\n')[0] || 'No description available for this asset.'}
                  </p>
                </div>

                {/* Asset-specific details */}
                {renderAssetDetails()}

                {/* Investment Metrics */}
                <div className="bg-neutral-950 border border-neutral-800 p-6">
                  <h3 className="text-lg font-light text-white mb-4">Investment Metrics</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">
                        {isWeighted ? 'Price per 1%' : 'Price per Share'}
                      </p>
                      <p className="text-white">{pricePerShare.toFixed(2)} OPN</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Holders</p>
                      <p className="text-white">1</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Min. Investment</p>
                      <p className="text-white">
                        {isWeighted 
                          ? `${(property.minPurchaseWeight || 0) / 100}%`
                          : `${property.minPurchaseAmount || 0} shares`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="bg-neutral-950 border border-neutral-800 p-6">
                  <h3 className="text-lg font-light text-white mb-4">Asset Details</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between py-3 border-b border-neutral-800">
                      <span className="text-neutral-400">Asset ID</span>
                      <span className="text-white">#{property.assetId}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-neutral-800">
                      <span className="text-neutral-400">Ownership Model</span>
                      <span className="text-white">
                        {isWeighted ? 'Weighted Percentage' : 'Fixed Token'}
                      </span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-neutral-800">
                      <span className="text-neutral-400">Total Value</span>
                      <span className="text-white">{totalValue.toFixed(2)} OPN</span>
                    </div>
                    {!isWeighted && (
                      <div className="flex justify-between py-3">
                        <span className="text-neutral-400">Total Supply</span>
                        <span className="text-white">
                          {property.totalSupply ? property.totalSupply.toString() : '0'} shares
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-500">No documents available yet</p>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                {loadingActivity ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    <p className="text-neutral-500 mt-4">Loading activity...</p>
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="bg-neutral-950 border border-neutral-800">
                    <div className="p-4 border-b border-neutral-800">
                      <h3 className="text-lg font-light text-white">Purchase History</h3>
                    </div>
                    <div className="divide-y divide-neutral-800">
                      {transactions.map((tx, index) => (
                        <div key={index} className="p-4 hover:bg-neutral-900/50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span className="text-white font-medium">{tx.type}</span>
                            </div>
                            <span className="text-sm text-neutral-500">{tx.timestamp}</span>
                          </div>
                          <div className="ml-4 space-y-1">
                            <p className="text-sm text-neutral-400">
                              Amount: <span className="text-white">{tx.amount}</span>
                            </p>
                            <p className="text-sm text-neutral-400">
                              Buyer:{' '}
                              <span className="text-white font-mono text-xs">
                                {tx.user.slice(0, 6)}...{tx.user.slice(-4)}
                              </span>
                            </p>
                            <a
                              href={`https://explorer.opn.network/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              View Transaction →
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                    <p className="text-neutral-500">No recent activity</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Purchase Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-neutral-950 border border-neutral-800 p-6">
                <h3 className="text-lg font-light text-white mb-6">Ownership Distribution</h3>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-neutral-400">Sold</span>
                      <span className="text-white">{soldPercentage.toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-neutral-600 to-neutral-500"
                        style={{ width: `${soldPercentage}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-neutral-400">Available</span>
                      <span className="text-green-400">{availablePercentage.toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-600 to-green-400"
                        style={{ width: `${availablePercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-6 p-4 bg-black rounded-sm">
                  <p className="text-xs text-neutral-500 mb-2">
                    {isWeighted ? 'Price per 1%' : 'Price per Share'}
                  </p>
                  <p className="text-2xl font-light text-white">{pricePerShare.toFixed(2)} OPN</p>
                </div>

                <button
                  onClick={() => setShowModal(true)}
                  className="w-full bg-white hover:bg-neutral-100 text-black py-3 font-light transition-colors flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Acquire Ownership</span>
                </button>

                <div className="mt-6 pt-6 border-t border-neutral-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <Shield className="w-3 h-3" />
                    <span>Verified on OPN Chain</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <Users className="w-3 h-3" />
                    <span>Smart Contract Secured</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <Activity className="w-3 h-3" />
                    <span>24/7 Trading Available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      {showImageModal && allImages.length > 1 && (
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
            alt={`${property.assetName} - Image ${currentImageIndex + 1}`}
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

      {/* Purchase Modal */}
      {showModal && (
        <PropertyModal 
          property={property}
          onClose={() => setShowModal(false)}
          onPurchaseSuccess={() => {
            setShowModal(false);
            if (onPurchaseSuccess) {
              onPurchaseSuccess();
            }
          }}
        />
      )}
    </div>
  );
};

export default PropertyDetailView;