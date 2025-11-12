// src/components/property/PropertyDetailView.jsx
import React, { useState } from 'react';
import { ArrowLeft, MapPin, Home, Building, Calendar, Users, Shield, Activity, ChevronLeft, ChevronRight, Expand, Car, Package, Palette } from 'lucide-react';
import PropertyModal from './PropertyModal';

const PropertyDetailView = ({ property, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showModal, setShowModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  
  // Get additional images from the property object (parsed from description)
  const additionalImages = property.additionalImages || [];
  const allImages = [property.assetImageUrl, ...additionalImages].filter(Boolean);
  
  const totalValue = parseFloat(property.pricePerShare || 0) * parseInt(property.totalShares || 0);
  const availablePercentage = (parseInt(property.availableShares || 0) / parseInt(property.totalShares || 1)) * 100;
  const soldPercentage = 100 - availablePercentage;

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

// Render asset-specific information
const renderAssetInformation = () => {
  const assetType = property.assetType?.toLowerCase() || '';
  
  // Vehicle Information
  if (assetType.includes('vehicle') || assetType.includes('car')) {
    const vehicleData = property.vehicleData || {};
    return (
      <div className="bg-neutral-950 border border-neutral-800 p-6">
        <h3 className="text-lg font-light text-white mb-4">Vehicle Details</h3>
        <div className="grid grid-cols-2 gap-6">
          {vehicleData.year && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">Year</p>
              <p className="text-white">{vehicleData.year}</p>
            </div>
          )}
          {vehicleData.make && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">Make</p>
              <p className="text-white">{vehicleData.make}</p>
            </div>
          )}
          {vehicleData.model && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">Model</p>
              <p className="text-white">{vehicleData.model}</p>
            </div>
          )}
          {vehicleData.vin && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">VIN</p>
              <p className="text-white font-mono text-sm">{vehicleData.vin}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Art or Collectibles
  if (assetType.includes('art') || assetType.includes('collectible')) {
    return (
      <div className="bg-neutral-950 border border-neutral-800 p-6">
        <h3 className="text-lg font-light text-white mb-4">Asset Details</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-neutral-500 mb-1">Asset Type</p>
            <p className="text-white">{property.assetType}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Token ID</p>
            <p className="text-white">#{property.tokenId}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Status</p>
            <p className="text-white">Active</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Verified</p>
            <p className="text-white">Yes</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Real Estate Information (only for actual properties)
  if (assetType.includes('real estate') || 
      assetType.includes('property') || 
      assetType.includes('residential') ||
      assetType.includes('commercial') ||
      assetType.includes('land')) {
    const propertyData = property.propertyData || {};
    return (
      <div className="bg-neutral-950 border border-neutral-800 p-6">
        <h3 className="text-lg font-light text-white mb-4">Property Information</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-neutral-500 mb-1">Location</p>
            <p className="text-white">{propertyData.location || 'Dubai, United Arab Emirates'}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Property Type</p>
            <p className="text-white">{propertyData.propertyType || property.assetType || 'Residential'}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Size</p>
            <p className="text-white">{propertyData.size || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Year Built</p>
            <p className="text-white">{propertyData.yearBuilt || 'Not specified'}</p>
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
          <p className="text-xs text-neutral-500 mb-1">Token ID</p>
          <p className="text-white">#{property.tokenId}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Status</p>
          <p className="text-white">Active</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Created</p>
          <p className="text-white">Recently</p>
        </div>
      </div>
   
        
        {/* Additional details for longer descriptions */}
        {property.assetDescription && property.assetDescription.length > 200 && !additionalImages.length && (
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <h4 className="text-sm font-light text-white mb-3">Additional Details</h4>
            <p className="text-sm text-neutral-400 leading-relaxed">
              This property offers excellent investment potential in one of Dubai's most sought-after locations.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
  <>
    {/* Back Button Bar - Add this BEFORE the min-h-screen div */}
<div className="bg-black px-4 sm:px-6 lg:px-8 py-4 border-b border-neutral-900">
  <button
    onClick={onBack}
    className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-light pl-14 lg:pl-0"
  >
    <ArrowLeft className="w-4 h-4" />
    <span>Back to Properties</span>
  </button>
</div>
    
    <div className="min-h-screen bg-black">
        {/* Hero Section with Property Image */}
        <div className="relative h-[40vh] sm:h-[50vh] bg-neutral-950 overflow-hidden">
          <img 
            src={property.assetImageUrl} 
            alt={property.assetName}
            className="w-full h-full object-cover opacity-90"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          
         
          
          {/* Property Info Overlay */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="max-w-7xl mx-auto">
              <span className="inline-block px-3 py-1 bg-black/80 backdrop-blur-sm text-white text-xs uppercase tracking-wider rounded-sm mb-3">
                {property.assetType}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white mb-3">
                {property.assetName}
              </h1>
              <div className="flex items-center text-white/80">
                <MapPin className="w-4 h-4 mr-2" />
                <span className="text-sm">
                  {property.vehicleData?.make && property.vehicleData?.model 
                    ? `${property.vehicleData.year || ''} ${property.vehicleData.make} ${property.vehicleData.model}`.trim()
                    : property.propertyData?.location || 'Dubai, United Arab Emirates'
                  }
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
                      {/* Clean description - remove the metadata parts */}
                      {property.assetDescription?.split('\n\n')[0] || 'No description available for this asset.'}
                    </p>
                  </div>

                  {/* Photo Gallery - Only show if there are additional images */}
                  {additionalImages.length > 0 && (
                    <div>
                      <h2 className="text-xl font-light text-white mb-4">Gallery</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {allImages.map((image, index) => (
                          <div 
                            key={index}
                            className="relative aspect-[4/3] bg-neutral-950 overflow-hidden cursor-pointer group"
                            onClick={() => {
                              setCurrentImageIndex(index);
                              setShowImageModal(true);
                            }}
                          >
                            <img 
                              src={image} 
                              alt={`${property.assetName} - Image ${index + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Expand className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Asset Information - Shows property or vehicle specific data */}
                  {renderAssetInformation()}

                  {/* Investment Metrics */}
                  <div>
                    <h2 className="text-xl font-light text-white mb-4">Investment Metrics</h2>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-neutral-950 border border-neutral-800 p-4">
                        <p className="text-xs text-neutral-500 mb-2">Price per 1%</p>
                        <p className="text-lg font-light text-white">{property.pricePerShare} OPN</p>
                      </div>
                      <div className="bg-neutral-950 border border-neutral-800 p-4">
                        <p className="text-xs text-neutral-500 mb-2">Holders</p>
                        <p className="text-lg font-light text-white">1</p>
                      </div>
                      <div className="bg-neutral-950 border border-neutral-800 p-4">
                        <p className="text-xs text-neutral-500 mb-2">Min. Investment</p>
                        <p className="text-lg font-light text-white">0.001%</p>
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
                        <span className="text-neutral-400">Token ID</span>
                        <span className="text-white">{property.tokenId}</span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-neutral-800">
                        <span className="text-neutral-400">Request ID</span>
                        <span className="text-white">{property.requestId}</span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-neutral-800">
                        <span className="text-neutral-400">Creator</span>
                        <span className="text-white font-mono text-sm">
                          {property.creator?.slice(0, 6)}...{property.creator?.slice(-4)}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-neutral-800">
                        <span className="text-neutral-400">Total Shares</span>
                        <span className="text-white">{property.totalShares}</span>
                      </div>
                      <div className="flex justify-between py-3">
                        <span className="text-neutral-400">KYC Required</span>
                        <span className="text-white">{property.requiresPurchaserKYC ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="text-center py-12">
                  <p className="text-neutral-500">No documents available yet</p>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="text-center py-12">
                  <p className="text-neutral-500">No recent activity</p>
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
                          className="h-full bg-gradient-to-r from-green-500 to-green-400"
                          style={{ width: `${availablePercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs text-neutral-500 mb-2">Price per Share</p>
                    <p className="text-2xl font-light text-white">{property.pricePerShare} OPN</p>
                  </div>

                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full py-3 bg-white text-black font-light hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                  >
                    Acquire Ownership
                  </button>

                  <div className="mt-6 space-y-2">
                    <div className="flex items-center text-xs text-neutral-400">
                      <Shield className="w-4 h-4 mr-2" />
                      Verified on OPN Chain
                    </div>
                    <div className="flex items-center text-xs text-neutral-400">
                      <Activity className="w-4 h-4 mr-2" />
                      Smart Contract Secured
                    </div>
                    <div className="flex items-center text-xs text-neutral-400">
                      <Users className="w-4 h-4 mr-2" />
                      24/7 Trading Available
                    </div>
                  </div>
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
        />
      )}
    </>
  );
};

export default PropertyDetailView;