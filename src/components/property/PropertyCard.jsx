// src/components/property/PropertyCard.jsx
import React, { useState } from 'react';
import { Shield, Activity, ArrowUpRight, X } from 'lucide-react';

const PropertyCard = ({ property, onViewDetails }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  // Truncate description to 150 characters for card display
  const maxDescriptionLength = 150;
  const needsTruncation = property.assetDescription && property.assetDescription.length > maxDescriptionLength;
  const truncatedDescription = needsTruncation 
    ? property.assetDescription.slice(0, maxDescriptionLength) + '...'
    : property.assetDescription;

  return (
    <>
      <div className="card-hover group h-full flex flex-col">
        {/* Image Section */}
        <div className="relative aspect-[4/3] bg-neutral-950 overflow-hidden">
          <img 
            src={property.assetImageUrl} 
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
              <p className="text-xs text-neutral-500 mb-1">PRICE PER SHARE</p>
              <p className="text-white font-light">{property.pricePerShare} OPN</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">AVAILABLE</p>
              <p className="text-white font-light">
                {property.availableShares}/{property.totalShares}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 mb-6">
            <div className="h-1 bg-neutral-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-white to-neutral-400 transition-all duration-500"
                style={{ 
                  width: `${(parseInt(property.availableShares || 0) / parseInt(property.totalShares || 1)) * 100}%` 
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setShowFullDescription(false)}
        >
          <div 
            className="bg-neutral-950 border border-neutral-800 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <h3 className="text-lg font-light text-white">{property.assetName}</h3>
              <button
                onClick={() => setShowFullDescription(false)}
                className="p-2 hover:bg-neutral-900 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {property.assetDescription}
              </p>
            </div>
            
            {/* Modal Footer */}
            <div className="flex gap-4 p-6 border-t border-neutral-800">
              <button
                onClick={() => setShowFullDescription(false)}
                className="flex-1 py-3 border border-neutral-800 text-white hover:bg-neutral-900 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowFullDescription(false);
                  onViewDetails(property);
                }}
                className="flex-1 py-3 bg-white text-black hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
              >
                View Full Details
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PropertyCard;