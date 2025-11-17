// src/components/property/PropertyCard.jsx
// FIXED VERSION - Properly converts ALL BigNumbers before rendering
import React, { useState } from 'react';
import { Shield, Activity, ArrowUpRight, X } from 'lucide-react';
import { ethers } from 'ethers';

const PropertyCard = ({ property, onViewDetails }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  // Helper to safely convert any value to a number
  const toNumber = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (ethers.BigNumber.isBigNumber(value)) {
      // For share counts, use formatUnits with 0 decimals
      // For prices, use formatEther
      try {
        return parseFloat(ethers.utils.formatUnits(value, 0));
      } catch {
        return parseFloat(ethers.utils.formatEther(value));
      }
    }
    return parseFloat(value.toString());
  };
  
  // Detect model type
  const isWeighted = property.model === 1 || property.model === 'WEIGHTED';
  
  // Truncate description to 150 characters for card display
  const maxDescriptionLength = 150;
  const needsTruncation = property.assetDescription && property.assetDescription.length > maxDescriptionLength;
  const truncatedDescription = needsTruncation 
    ? property.assetDescription.slice(0, maxDescriptionLength) + '...'
    : property.assetDescription;

  // Calculate stats based on model - SAFELY CONVERTING ALL BIGNUMBERS
  const getStats = () => {
    if (isWeighted) {
      // WEIGHTED MODEL
      const totalValue = property.totalValue 
        ? (ethers.BigNumber.isBigNumber(property.totalValue)
            ? parseFloat(ethers.utils.formatEther(property.totalValue))
            : parseFloat(property.totalValue))
        : 0;
      
      const soldWeight = property.soldWeight || 0;
      const availableWeight = property.availableWeight || (10000 - soldWeight);
      const soldPercentage = (soldWeight / 100).toFixed(2);
      const availablePercentage = (availableWeight / 100).toFixed(2);
      
      return {
        label1: 'TOTAL VALUE',
        value1: `${totalValue.toFixed(2)} OPN`,
        label2: 'AVAILABLE',
        value2: `${availablePercentage}%`,
        soldPercentage: parseFloat(soldPercentage),
        availablePercent: (availableWeight / 10000) * 100
      };
    } else {
      // FIXED MODEL - CAREFULLY CONVERT EACH VALUE
      let pricePerShare = 0;
      let totalShares = 0;
      let availableShares = 0;
      
      // Convert price per share
      if (property.pricePerToken) {
        pricePerShare = ethers.BigNumber.isBigNumber(property.pricePerToken)
          ? parseFloat(ethers.utils.formatEther(property.pricePerToken))
          : parseFloat(property.pricePerToken);
      } else if (property.pricePerShare) {
        pricePerShare = ethers.BigNumber.isBigNumber(property.pricePerShare)
          ? parseFloat(ethers.utils.formatEther(property.pricePerShare))
          : parseFloat(property.pricePerShare);
      }
      
      // Convert total shares/supply
      if (property.totalSupply) {
        totalShares = toNumber(property.totalSupply);
      } else if (property.totalShares) {
        totalShares = toNumber(property.totalShares);
      }
      
      // Convert available shares
      if (property.availableShares) {
        availableShares = toNumber(property.availableShares);
      }
      
      const soldShares = Math.max(0, totalShares - availableShares);
      const soldPercentage = totalShares > 0 ? ((soldShares / totalShares) * 100).toFixed(2) : '0';
      const availablePercent = totalShares > 0 ? (availableShares / totalShares) * 100 : 0;
      
      return {
        label1: 'PRICE PER SHARE',
        value1: `${pricePerShare.toFixed(2)} OPN`,
        label2: 'AVAILABLE',
        value2: `${Math.floor(availableShares)}/${Math.floor(totalShares)}`, // ✅ NOW BOTH ARE NUMBERS
        soldPercentage: parseFloat(soldPercentage),
        availablePercent: availablePercent
      };
    }
  };

  const stats = getStats();

  return (
    <>
      <div className="card-hover group h-full flex flex-col">
        {/* Image Section */}
        <div className="relative aspect-[4/3] bg-neutral-950 overflow-hidden">
          <img 
            src={property.assetImageUrl || property.mainImageUrl} 
            alt={property.assetName}
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';
            }}
          />
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-black/80 backdrop-blur-sm text-white text-xs uppercase tracking-wider rounded-sm">
              {property.assetType}
            </span>
          </div>
          {property.requiresPurchaserKYC && (
            <div className="absolute top-4 right-4">
              <div className="p-2 bg-black/80 backdrop-blur-sm rounded-sm">
                <Shield className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
          {/* Model indicator badge */}
          <div className="absolute bottom-4 left-4">
            <span className={`px-2 py-1 text-xs font-light rounded-sm ${
              isWeighted 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              {isWeighted ? 'Weighted' : 'Fixed'}
            </span>
          </div>
        </div>

        {/* Content Section - Flex grow to push button down */}
        <div className="p-6 flex flex-col flex-grow">
          {/* Title */}
          <h3 className="text-xl font-light text-white mb-3">{property.assetName}</h3>
          
          {/* Description Section */}
          <div className="mb-4 flex-grow">
            <p className="text-sm text-neutral-400 leading-relaxed">
              {truncatedDescription}
            </p>
            {needsTruncation && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullDescription(true);
                }}
                className="text-xs text-white hover:text-neutral-300 mt-2 underline underline-offset-2 transition-colors"
              >
                more
              </button>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 py-4 border-y border-neutral-900">
            <div>
              <p className="text-xs text-neutral-500 mb-1">{stats.label1}</p>
              <p className="text-white font-light">{stats.value1}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">{stats.label2}</p>
              <p className="text-white font-light">{stats.value2}</p>
            </div>
          </div>

          {/* Ownership Sold Indicator */}
          <div className="mt-3 mb-2">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-neutral-500">Ownership Sold</span>
              <span className="text-white font-light">{stats.soldPercentage}%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-1 bg-neutral-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-white to-neutral-400 transition-all duration-500"
                style={{ 
                  width: `${stats.soldPercentage}%` 
                }}
              />
            </div>
          </div>

          {/* View Details Button - Always at bottom */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(property);
            }}
            className="w-full py-3 bg-white text-black font-light text-sm hover:bg-neutral-200 transition-all duration-200 flex items-center justify-center gap-2 group/btn"
          >
            View Details
            <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Full Description Modal */}
      {showFullDescription && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullDescription(false)}
        >
          <div 
            className="bg-neutral-950 border border-neutral-800 rounded-sm p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-light text-white">{property.assetName}</h3>
              <button
                onClick={() => setShowFullDescription(false)}
                className="p-2 hover:bg-neutral-900 rounded-sm transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap">
              {property.assetDescription}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default PropertyCard;