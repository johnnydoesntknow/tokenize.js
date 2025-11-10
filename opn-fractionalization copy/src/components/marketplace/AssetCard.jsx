// src/components/marketplace/AssetCard.jsx
import React from 'react';
import { Shield, Activity, ArrowUpRight } from 'lucide-react';

const AssetCard = ({ asset, onBuyClick }) => {
  // Fixed property names to match useMarketplace
  const totalShares = parseInt(asset.totalShares || 0);
  const availableShares = parseInt(asset.availableShares || 0);
  const soldShares = totalShares - availableShares;
  const ownershipPercentage = totalShares > 0 ? ((soldShares / totalShares) * 100).toFixed(1) : '0.0';
  const totalValue = (parseFloat(asset.pricePerShare || 0) * totalShares).toFixed(2);
  
  // Format large numbers professionally
  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString('en-US');
  };

  return (
    <div className="group relative bg-black border border-neutral-900 rounded-sm overflow-hidden transition-all duration-500 hover:border-neutral-800">
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-950">
        <img 
          src={asset.assetImageUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80'} 
          alt={asset.assetName}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Asset Type Badge */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-black/60 backdrop-blur-sm text-xs font-normal text-white/80 rounded-sm">
            {asset.assetType || 'Asset'}
          </span>
        </div>
        
        {/* Verification Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-sm">
          <Shield className="w-3 h-3 text-green-400" />
          <span className="text-xs font-light text-green-400">Verified</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">
          {asset.assetName || 'Unnamed Asset'}
        </h3>
        
        {/* Description */}
        <p className="text-sm font-light text-neutral-500 mb-6 line-clamp-1">
          {asset.assetDescription || 'Premium Asset'}
        </p>
        
        {/* Metrics Grid - Updated property names */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs font-light text-neutral-500 mb-1">Price per Share</p>
            <p className="text-sm font-normal text-white">{formatNumber(asset.pricePerShare)} OPN</p>
          </div>
          <div>
            <p className="text-xs font-light text-neutral-500 mb-1">Total Value</p>
            <p className="text-sm font-normal text-white">{formatNumber(totalValue)} OPN</p>
          </div>
          <div>
            <p className="text-xs font-light text-neutral-500 mb-1">Available</p>
            <p className="text-sm font-normal text-white">
              {formatNumber(availableShares)} / {formatNumber(totalShares)}
            </p>
          </div>
          <div>
            <p className="text-xs font-light text-neutral-500 mb-1">Ownership Sold</p>
            <p className="text-sm font-normal text-white">{ownershipPercentage}%</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden mb-6">
          <div 
            className="h-full bg-gradient-to-r from-neutral-700 to-neutral-600 transition-all duration-500"
            style={{ width: `${ownershipPercentage}%` }}
          />
        </div>
        
        {/* Action Button */}
        <button
          onClick={() => onBuyClick(asset)}
          className="w-full py-3 bg-white text-black font-normal text-sm rounded-sm 
                     transition-all duration-300 hover:bg-neutral-100 
                     flex items-center justify-center gap-2 group/btn"
        >
          <span>View Details</span>
          <ArrowUpRight className="w-3 h-3 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
        </button>
      </div>
      
      {/* Activity Indicator */}
      <div className="absolute bottom-6 right-6 flex gap-2">
        
        {asset.totalInvestors && parseInt(asset.totalInvestors) > 0 && (
          <div className="text-xs text-neutral-500">
            {asset.totalInvestors} investors
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetCard;