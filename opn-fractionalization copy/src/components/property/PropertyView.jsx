// src/components/property/PropertyView.jsx
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';
import PropertyCard from './PropertyCard';
import PropertyDetailView from './PropertyDetailView';
import { Building, Loader2, Home, AlertCircle } from 'lucide-react';
import { ethers } from 'ethers';
// Parsing functions for asset data
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

const parseAssetData = (asset) => {
  const { assetDescription: description, assetType } = asset;
  
  // Base parsed data
  const parsedData = {
    ...asset,
    additionalImages: parseAdditionalImages(description),
    propertyData: parseRealEstateData(description)
  };
  
  return parsedData;
};

const PropertyView = () => {
  const { isConnected } = useWeb3();
  const { fractionalization } = useContract();
  const { showNotification } = useApp();
  
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchProperties = async () => {
      if (!fractionalization || !isConnected) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const result = await fractionalization.getActiveAssets(0, 100);
        const activeAssetIds = result.assetIds || result[0];
        
        const propertyPromises = activeAssetIds.map(async (tokenId) => {
          const assetDetails = await fractionalization.assetDetails(tokenId);
          const request = await fractionalization.requests(assetDetails.requestId);
          
          // STRICT FILTER: Only real estate assets - NO VEHICLES
          const allowedTypes = [
            'Real Estate', 
            'Property', 
            'Land', 
            'Commercial Property', 
            'Residential Property',
            'Commercial',
            'Residential'
          ];
          
          // Check if asset type is real estate related
          const isRealEstateAsset = allowedTypes.some(type => {
            const assetTypeLower = request.assetType.toLowerCase();
            const allowedTypeLower = type.toLowerCase();
            return assetTypeLower.includes(allowedTypeLower) || 
                   allowedTypeLower.includes(assetTypeLower);
          });
          
          // EXCLUDE vehicles explicitly
          const isVehicle = request.assetType.toLowerCase().includes('vehicle') || 
                           request.assetType.toLowerCase().includes('car');
          
          // Only include if it's real estate AND not a vehicle
          if (!isRealEstateAsset || isVehicle) return null;
          
          const baseAsset = {
            tokenId: tokenId.toString(),
            requestId: assetDetails.requestId.toString(),
            assetType: request.assetType,
            assetName: request.assetName,
            assetDescription: request.assetDescription,
            assetImageUrl: request.assetImageUrl,
            totalShares: assetDetails.totalShares?.toString() || '0',
            availableShares: assetDetails.availableShares?.toString() || '0',
            pricePerShare: ethers.utils.formatEther(assetDetails.pricePerShare),
            requiresPurchaserKYC: assetDetails.requiresPurchaserKYC,
            minPurchaseAmount: assetDetails.minPurchaseAmount?.toString() || '1',
            maxPurchaseAmount: assetDetails.maxPurchaseAmount?.toString() || '0',
          };
          
          // Parse additional data
          return parseAssetData(baseAsset);
        });
        
        const results = await Promise.all(propertyPromises);
        const validProperties = results.filter(p => p !== null);
        
        setProperties(validProperties);
      } catch (error) {
        console.error('Error fetching properties:', error);
        showNotification('Failed to load properties', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [fractionalization, isConnected, showNotification]);

  // Filter properties based on selected filter
  const filteredProperties = filter === 'all' 
    ? properties
    : properties.filter(property => {
        const type = property.assetType?.toLowerCase() || '';
        
        switch(filter) {
          case 'residential':
            return type.includes('residential');
          case 'commercial':
            return type.includes('commercial');
          case 'land':
            return type.includes('land');
          default:
            return true;
        }
      });

  // Show detail view if property is selected
  if (showDetailView && selectedProperty) {
    return (
      <PropertyDetailView 
        property={selectedProperty}
        onBack={() => {
          setShowDetailView(false);
          setSelectedProperty(null);
        }}
      />
    );
  }


  // Check wallet connection
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-xl font-light text-white mb-2">Wallet Not Connected</h2>
          <p className="text-neutral-400 font-light">Please connect your wallet to view property investments</p>
        </div>
      </div>
    );
  }

  // Calculate metrics for display
  const totalValue = properties.reduce((sum, p) => {
    return sum + (parseFloat(p.pricePerShare) * parseInt(p.totalShares));
  }, 0);
  
  const totalProperties = properties.length;
  const availableProperties = properties.filter(p => parseInt(p.availableShares) > 0).length;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white mb-2">
            Real Estate Properties
          </h1>
          <p className="text-neutral-500 text-sm sm:text-base">
            Discover and invest in fractional real estate ownership
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="bg-neutral-950 border border-neutral-900 p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-neutral-500 mb-1 sm:mb-2">Total Properties</p>
            <p className="text-2xl sm:text-3xl font-light text-white">{totalProperties}</p>
          </div>
          <div className="bg-neutral-950 border border-neutral-900 p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-neutral-500 mb-1 sm:mb-2">Available</p>
            <p className="text-2xl sm:text-3xl font-light text-white">{availableProperties}</p>
          </div>
          <div className="bg-neutral-950 border border-neutral-900 p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-neutral-500 mb-1 sm:mb-2">Total Value</p>
            <p className="text-2xl sm:text-3xl font-light text-white">
              {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} OPN
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Filters - NO VEHICLES TAB */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-light transition-all duration-200 whitespace-nowrap border-b-2 ${
                  filter === 'all' 
                    ? 'text-white border-white' 
                    : 'text-neutral-500 hover:text-white border-transparent'
                }`}
              >
                All Properties
              </button>
              <button
                onClick={() => setFilter('residential')}
                className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-light transition-all duration-200 whitespace-nowrap border-b-2 ${
                  filter === 'residential' 
                    ? 'text-white border-white' 
                    : 'text-neutral-500 hover:text-white border-transparent'
                }`}
              >
                Residential
              </button>
              <button
                onClick={() => setFilter('commercial')}
                className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-light transition-all duration-200 whitespace-nowrap border-b-2 ${
                  filter === 'commercial' 
                    ? 'text-white border-white' 
                    : 'text-neutral-500 hover:text-white border-transparent'
                }`}
              >
                Commercial
              </button>
              <button
                onClick={() => setFilter('land')}
                className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-light transition-all duration-200 whitespace-nowrap border-b-2 ${
                  filter === 'land' 
                    ? 'text-white border-white' 
                    : 'text-neutral-500 hover:text-white border-transparent'
                }`}
              >
                Land
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20 sm:py-32">
              <Loader2 className="w-6 sm:w-8 h-6 sm:h-8 text-white animate-spin" />
            </div>
          )}

          {/* Properties Grid */}
          {!loading && filteredProperties.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredProperties.map(property => (
                <PropertyCard
                  key={property.tokenId}
                  property={property}
                  onViewDetails={(property) => {
                    setSelectedProperty(property);
                    setShowDetailView(true);
                  }}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredProperties.length === 0 && (
            <div className="text-center py-20 sm:py-32">
              <Building className="w-12 sm:w-16 h-12 sm:h-16 text-neutral-500 mx-auto mb-4" />
              <p className="text-neutral-500 text-base sm:text-lg font-light">
                No properties available in this category
              </p>
              <p className="text-neutral-600 text-xs sm:text-sm mt-2">
                Check back later or try a different filter
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyView;