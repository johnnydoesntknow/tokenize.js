// src/components/marketplace/AssetCard.jsx
// FIXED - Corrected for 1e18 precision (not basis points)
import React from 'react';
import { Shield, TrendingUp, Check } from 'lucide-react';
import { ethers } from 'ethers';

const AssetCard = ({ asset, onBuyClick, viewMode = 'grid' }) => {
  const isWeighted = asset.model === 1;
  
  // Calculate availability
  const availability = (() => {
    if (isWeighted) {
      // ✅ FIXED: availablePercentage and soldPercentage are already percentages (0-100)
      // They were calculated in useMarketplace.js by dividing wei-units by 1e16
      const availablePercent = asset.availablePercentage || 0;
      const soldPercent = asset.soldPercentage || 0;
      
      return {
        available: availablePercent.toFixed(2) + '%',
        sold: soldPercent.toFixed(2) + '%',
        soldNumber: soldPercent
      };
    } else {
      // FIXED MODEL - unchanged
      const available = asset.availableShares 
        ? parseFloat(ethers.utils.formatUnits(asset.availableShares, 0))
        : 0;
      const total = asset.totalSupply 
        ? parseFloat(ethers.utils.formatUnits(asset.totalSupply, 0))
        : 0;
      const sold = total - available;
      const soldPercent = total > 0 ? (sold / total) * 100 : 0;
      
      return {
        available: available.toLocaleString(),
        sold: soldPercent.toFixed(2) + '%',
        soldNumber: soldPercent
      };
    }
  })();

  // Format prices
  const pricing = (() => {
    if (isWeighted) {
      const totalValue = asset.totalValue 
        ? parseFloat(ethers.utils.formatEther(asset.totalValue))
        : 0;
      const pricePerPercent = totalValue / 100;
      
      return {
        label1: 'Total Value',
        value1: totalValue.toFixed(2),
        label2: 'Available',
        value2: availability.available
      };
    } else {
      const pricePerShare = asset.pricePerShare 
        ? parseFloat(ethers.utils.formatEther(asset.pricePerShare))
        : 0;
      const totalValue = asset.totalSupply && asset.pricePerShare
        ? parseFloat(ethers.utils.formatEther(asset.totalSupply.mul(asset.pricePerShare)))
        : 0;
      
      return {
        label1: 'Price per Share',
        value1: pricePerShare.toFixed(2),
        label2: 'Total Value',
        value2: totalValue.toFixed(2)
      };
    }
  })();

  const formatNumber = (num) => {
    return parseFloat(num).toFixed(2);
  };

  if (viewMode === 'list') {
    // List View - Horizontal Layout
    return (
      <div 
        onClick={() => onBuyClick(asset)}
        className="bg-black border border-neutral-900 hover:border-neutral-700 transition-all cursor-pointer p-6"
      >
        <div className="flex flex-col md:flex-row gap-6">
          {/* Image */}
          <div className="w-full md:w-48 h-32 bg-neutral-900 rounded-lg overflow-hidden flex-shrink-0 relative">
            {asset.assetImageUrl ? (
              <img
                src={asset.assetImageUrl}
                alt={asset.assetName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-neutral-700" />
              </div>
            )}
            
            {/* Badges overlay */}
            <div className="absolute top-2 left-2">
              <span className="px-2 py-1 bg-black/90 backdrop-blur-sm text-white text-xs font-semibold rounded-sm border border-white/20">
                {asset.assetType}
              </span>
            </div>
            
            <div className="absolute top-2 right-2 flex gap-1">
              <span className="px-2 py-1 bg-black/90 backdrop-blur-sm text-white text-xs font-semibold rounded-sm border border-white/20 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Verified
              </span>
              <span className={`px-2 py-1 backdrop-blur-sm text-xs font-semibold rounded-sm border ${
                isWeighted 
                  ? 'bg-black/90 text-green-400 border-green-400/30' 
                  : 'bg-black/90 text-blue-400 border-blue-400/30'
              }`}>
                {isWeighted ? 'Weighted' : 'Fixed'}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1 truncate">
                {asset.assetName || 'Unnamed Asset'}
              </h3>
              <p className="text-sm text-neutral-400 mb-4 line-clamp-2">
                {asset.assetDescription || 'Premium tokenized asset'}
              </p>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-neutral-500 mb-1">{pricing.label1}</p>
                <p className="text-sm text-white font-normal">{pricing.value1} OPN</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">{pricing.label2}</p>
                <p className="text-sm text-white font-normal">
                  {isWeighted ? pricing.value2 : `${pricing.value2} OPN`}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">Available</p>
                <p className="text-sm text-white font-normal">{availability.available}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">Ownership Sold</p>
                <p className="text-sm text-white font-normal">{availability.sold}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-1 bg-neutral-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-white to-neutral-400 transition-all duration-500"
                  style={{ width: `${availability.soldNumber}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid View - Vertical Card Layout
  return (
    <div 
      onClick={() => onBuyClick(asset)}
      className="bg-black border border-neutral-900 overflow-hidden hover:border-neutral-700 transition-all group cursor-pointer flex flex-col h-full"
    >
      {/* Image - Fixed Height */}
      <div className="aspect-video bg-neutral-900 overflow-hidden relative flex-shrink-0">
        {asset.assetImageUrl ? (
          <img
            src={asset.assetImageUrl}
            alt={asset.assetName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Shield className="w-12 h-12 text-neutral-700" />
          </div>
        )}
        
        {/* Asset Type Badge - Top Left with enhanced visibility */}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 bg-black/90 backdrop-blur-sm text-xs font-semibold text-white rounded-sm border border-white/20 shadow-lg">
            {asset.assetType}
          </span>
        </div>
        
        {/* Status Badges - Top Right with enhanced visibility */}
        <div className="absolute top-3 right-3 flex gap-2">
          <span className="px-2 py-1 bg-black/90 backdrop-blur-sm text-xs font-semibold text-white border border-white/20 rounded-sm flex items-center gap-1 shadow-lg">
            <Check className="w-3 h-3" />
            Verified
          </span>
          <span className={`px-3 py-1 backdrop-blur-sm text-xs font-semibold rounded-sm shadow-lg border ${
            isWeighted 
              ? 'bg-black/90 text-green-400 border-green-400/30' 
              : 'bg-black/90 text-blue-400 border-blue-400/30'
          }`}>
            {isWeighted ? 'Weighted' : 'Fixed'}
          </span>
        </div>
      </div>

      {/* Content - Flexible with minimum height */}
      <div className="p-6 flex flex-col flex-1">
        {/* Title - Fixed Height with Ellipsis */}
        <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1 min-h-[28px]">
          {asset.assetName || 'Unnamed Asset'}
        </h3>
        
        {/* Description - Fixed 2 Lines */}
        <p className="text-sm font-light text-neutral-400 mb-4 line-clamp-2 min-h-[40px]">
          {asset.assetDescription || 'Premium tokenized asset'}
        </p>
        
        {/* Metrics Grid - Fixed Height */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs font-light text-neutral-500 mb-1 truncate">{pricing.label1}</p>
            <p className="text-sm font-normal text-white truncate">{pricing.value1} OPN</p>
          </div>
          <div>
            <p className="text-xs font-light text-neutral-500 mb-1 truncate">{pricing.label2}</p>
            <p className="text-sm font-normal text-white truncate">
              {isWeighted ? pricing.value2 : `${pricing.value2} OPN`}
            </p>
          </div>
          <div>
            <p className="text-xs font-light text-neutral-500 mb-1">Available</p>
            <p className="text-sm font-normal text-white truncate">
              {isWeighted 
                ? availability.available
                : `${availability.available} shares`
              }
            </p>
          </div>
          <div>
            <p className="text-xs font-light text-neutral-500 mb-1">Ownership Sold</p>
            <p className="text-sm font-normal text-white">{availability.sold}</p>
          </div>
        </div>

        {/* Progress Bar - Fixed Height */}
        <div className="mb-6">
          <div className="h-1 bg-neutral-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-white to-neutral-400 transition-all duration-500"
              style={{ width: `${availability.soldNumber}%` }}
            />
          </div>
        </div>

        {/* Button - Pushed to Bottom */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBuyClick(asset);
          }}
          className="w-full py-3 bg-white text-black font-normal text-sm hover:bg-neutral-200 transition-all duration-200 flex items-center justify-center gap-2 mt-auto"
        >
          View Details
          <TrendingUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AssetCard;