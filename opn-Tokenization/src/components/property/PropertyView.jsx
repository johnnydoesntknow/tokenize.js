// src/components/property/PropertiesView.jsx
// FIXED VERSION - Correct Marketplace Layout Order + IPFS Folder Fetching
import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';
import PropertyDetailView from './PropertyDetailView';
import { 
  Building, Loader2, AlertCircle, Search, SlidersHorizontal, 
  Grid, List, ChevronLeft, ChevronRight, Home, MapPin
} from 'lucide-react';
import { ethers } from 'ethers';

// ============================================================================
// IMPROVED IPFS IMAGE FETCHING - Works with Pinata folders
// ============================================================================
const fetchIPFSImages = async (mainImageUrl) => {
  if (!mainImageUrl) return [mainImageUrl];

  console.log('🔍 Fetching images from:', mainImageUrl);

  // Extract CID from URL
  const getCID = (url) => {
    if (!url) return null;
    const patterns = [
      /ipfs:\/\/([a-zA-Z0-9]+)/,
      /\/ipfs\/([a-zA-Z0-9]+)/,
      /gateway\.pinata\.cloud\/ipfs\/([a-zA-Z0-9]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const cid = getCID(mainImageUrl);
  if (!cid) {
    console.log('❌ No CID found, using original URL');
    return [mainImageUrl];
  }

  console.log('📦 CID extracted:', cid);

  try {
    // Try multiple IPFS gateways for better reliability
    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`
    ];

    for (const gatewayUrl of gateways) {
      try {
        console.log('🌐 Trying gateway:', gatewayUrl);
        
        // Fetch the directory listing
        const response = await fetch(gatewayUrl);
        const contentType = response.headers.get('content-type');
        
        // If it's a single image file, return it
        if (contentType && contentType.startsWith('image/')) {
          console.log('✅ Single image detected');
          return [gatewayUrl];
        }

        // Try to parse as directory listing
        const text = await response.text();
        
        // Look for image file links in the HTML
        const imageFiles = [];
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        // Match href attributes with image extensions
        const hrefRegex = /href="([^"]+)"/gi;
        const matches = [...text.matchAll(hrefRegex)];
        
        for (const match of matches) {
          const filename = match[1];
          const extension = filename.split('.').pop()?.toLowerCase();
          
          if (extension && imageExtensions.includes(extension)) {
            // Clean up the filename (remove ./ or leading slashes)
            const cleanFilename = filename.replace(/^\.\//, '').replace(/^\//, '');
            const imageUrl = `${gatewayUrl}/${cleanFilename}`;
            imageFiles.push(imageUrl);
            console.log('📸 Found image:', cleanFilename);
          }
        }

        if (imageFiles.length > 0) {
          console.log(`✅ Found ${imageFiles.length} images in folder`);
          return imageFiles;
        }

      } catch (err) {
        console.log(`⚠️ Gateway ${gatewayUrl} failed:`, err.message);
        continue;
      }
    }

    // If no images found in directory, return the CID as a single image
    console.log('⚠️ No images found in directory, using CID as single image');
    return [`https://gateway.pinata.cloud/ipfs/${cid}`];

  } catch (error) {
    console.error('❌ Error fetching IPFS images:', error);
    return [mainImageUrl];
  }
};

// ============================================================================
// PROPERTY CARD WITH IMAGE CAROUSEL
// ============================================================================
const PropertyCard = ({ property, onViewDetails, images }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const isWeighted = property.model === 1;
  
  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Calculate stats
  const getStats = () => {
    if (isWeighted) {
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
        label1: 'Total Value',
        value1: `${totalValue.toFixed(2)} OPN`,
        label2: 'Available',
        value2: `${availablePercentage}%`,
        soldPercentage: parseFloat(soldPercentage)
      };
    } else {
      const pricePerShare = property.pricePerShare 
        ? (ethers.BigNumber.isBigNumber(property.pricePerShare)
            ? parseFloat(ethers.utils.formatEther(property.pricePerShare))
            : parseFloat(property.pricePerShare))
        : 0;
      
      const totalShares = property.totalSupply
        ? (ethers.BigNumber.isBigNumber(property.totalSupply)
            ? parseFloat(ethers.utils.formatUnits(property.totalSupply, 0))
            : parseFloat(property.totalSupply))
        : 0;
      
      const availableShares = property.availableShares
        ? (ethers.BigNumber.isBigNumber(property.availableShares)
            ? parseFloat(ethers.utils.formatUnits(property.availableShares, 0))
            : parseFloat(property.availableShares))
        : 0;
      
      const soldShares = Math.max(0, totalShares - availableShares);
      const soldPercentage = totalShares > 0 ? ((soldShares / totalShares) * 100) : 0;
      
      return {
        label1: 'Price per Share',
        value1: `${pricePerShare.toFixed(2)} OPN`,
        label2: 'Available',
        value2: `${Math.floor(availableShares)}/${Math.floor(totalShares)}`,
        soldPercentage
      };
    }
  };

  const stats = getStats();

  return (
    <div 
      className="bg-black border border-neutral-900 rounded-lg overflow-hidden hover:border-neutral-700 transition-all group cursor-pointer flex flex-col h-full"
      onClick={() => onViewDetails(property)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Image with Carousel */}
      <div className="aspect-video bg-neutral-900 overflow-hidden relative flex-shrink-0">
        <img
          src={images[currentImageIndex]}
          alt={`${property.assetName} - Image ${currentImageIndex + 1}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';
          }}
        />
        
        {/* Property Type Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 bg-black/90 backdrop-blur-sm text-xs font-semibold text-white rounded-lg border border-white/20 uppercase">
            {property.propertyData?.propertyType || property.assetType}
          </span>
        </div>

        {/* Model Badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 backdrop-blur-sm text-xs font-semibold rounded-lg border ${
            isWeighted 
              ? 'bg-black/90 text-green-400 border-green-400/30' 
              : 'bg-black/90 text-blue-400 border-blue-400/30'
          }`}>
            {isWeighted ? 'Weighted' : 'Fixed'}
          </span>
        </div>

        {/* Image Navigation - Show only if multiple images */}
        {images.length > 1 && isHovering && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/80 hover:bg-black rounded-full transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/80 hover:bg-black rounded-full transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </>
        )}

        {/* Image Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(index);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  index === currentImageIndex 
                    ? 'bg-white w-4' 
                    : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="text-lg font-light text-white mb-2 line-clamp-1">
          {property.assetName}
        </h3>
        
        {property.propertyData?.location && (
          <div className="flex items-center gap-1 text-neutral-500 text-xs mb-3">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{property.propertyData.location}</span>
          </div>
        )}

        <p className="text-sm text-neutral-400 font-light mb-4 line-clamp-2 flex-grow">
          {property.assetDescription}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-neutral-500 mb-1">{stats.label1}</p>
            <p className="text-sm text-white font-normal">{stats.value1}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">{stats.label2}</p>
            <p className="text-sm text-white font-normal">{stats.value2}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-neutral-500 mb-2">
            <span>Ownership Sold</span>
            <span>{stats.soldPercentage.toFixed(2)}%</span>
          </div>
          <div className="h-1 bg-neutral-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-white to-neutral-400 transition-all duration-500"
              style={{ width: `${stats.soldPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PROPERTIES VIEW COMPONENT
// ============================================================================
const PropertiesView = () => {
  const { isConnected } = useWeb3();
  const { assetRegistry } = useContract();
  const { showNotification } = useApp();
  
  const [properties, setProperties] = useState([]);
  const [propertyImages, setPropertyImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingImages, setLoadingImages] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [filter, setFilter] = useState('all');
  
  // Marketplace-style filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');

  // Fetch properties
  const fetchProperties = useCallback(async () => {
    if (!assetRegistry || !isConnected) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const result = await assetRegistry.getActiveAssets(0, 100);
      const activeAssetIds = result.ids || result[0] || [];
      
      console.log('📋 Found active assets:', activeAssetIds.length);
      
      if (activeAssetIds.length === 0) {
        setProperties([]);
        setLoading(false);
        return;
      }
      
      const propertyPromises = activeAssetIds.map(async (assetId) => {
        try {
          const asset = await assetRegistry.assets(assetId);
          
          const assetTypeLower = asset.assetType.toLowerCase();
          
          // Exclude vehicles
          const isVehicle = assetTypeLower.includes('vehicle') || assetTypeLower.includes('car');
          if (isVehicle) {
            console.log(`❌ Excluding vehicle: ${asset.assetName}`);
            return null;
          }
          
          // Include property-related assets
          const propertyKeywords = [
            'property', 'real estate', 'land', 'commercial', 'residential', 
            'apartment', 'house', 'building', 'estate', 'condo', 'office'
          ];
          
          const isProperty = propertyKeywords.some(keyword => assetTypeLower.includes(keyword));
          if (!isProperty) {
            console.log(`❌ Excluding non-property: ${asset.assetName}`);
            return null;
          }
          
          console.log(`✅ Including property: ${asset.assetName}`);
          
          const isWeighted = asset.model === 1;
          
          // Parse additional images from description
          const parseAdditionalImages = (description) => {
            const images = [];
            if (!description) return images;
            
            const match = description.match(/Additional Images:([\s\S]*?)(?:\n\n|Documents:|$)/);
            if (match && match[1]) {
              const imageMatches = match[1].matchAll(/Image \d+: (https?:\/\/[^\s\n]+)/g);
              for (const m of imageMatches) {
                if (m[1]) images.push(m[1]);
              }
            }
            return images;
          };

          // Parse property data
          const parsePropertyData = (description) => {
            const data = { location: '', propertyType: '', size: '' };
            if (!description) return data;
            
            const locationMatch = description.match(/Location: ([^\n]+)/i);
            if (locationMatch) data.location = locationMatch[1].trim();
            
            const sizeMatch = description.match(/Size: ([\d,.]+ (?:sq\.?\s*ft|sqft|square feet|acres))/i);
            if (sizeMatch) data.size = sizeMatch[1].trim();
            
            if (description.includes('Residential')) data.propertyType = 'Residential';
            else if (description.includes('Commercial')) data.propertyType = 'Commercial';
            else if (description.includes('Land')) data.propertyType = 'Land';
            
            return data;
          };
          
          const baseAsset = {
            assetId: assetId.toString(),
            assetType: asset.assetType,
            assetName: asset.assetName,
            assetDescription: asset.assetDescription,
            assetImageUrl: asset.mainImageUrl,
            model: asset.model,
            isActive: asset.isActive,
            createdAt: asset.createdAt.toString(),
            additionalImages: parseAdditionalImages(asset.assetDescription),
            propertyData: parsePropertyData(asset.assetDescription),
            
            ...(isWeighted ? {
              // WEIGHTED MODEL - properties are directly on asset
              totalValue: asset.totalValue,
              soldWeight: asset.soldWeight,
              availableWeight: ethers.BigNumber.from(10000).sub(asset.soldWeight),
              minPurchaseWeight: asset.minPurchaseAmount,
              maxPurchaseWeight: asset.maxPurchaseAmount
            } : {
              // FIXED MODEL - properties are directly on asset
              pricePerShare: asset.pricePerToken,
              totalSupply: asset.totalSupply,
              availableShares: asset.totalSupply.sub(asset.soldTokens),
              minPurchaseAmount: asset.minPurchaseAmount,
              maxPurchaseAmount: asset.maxPurchaseAmount
            })
          };
          
          return baseAsset;
        } catch (error) {
          console.error(`Error fetching asset ${assetId}:`, error);
          return null;
        }
      });
      
      const fetchedProperties = (await Promise.all(propertyPromises)).filter(Boolean);
      console.log(`✅ Fetched ${fetchedProperties.length} properties`);
      setProperties(fetchedProperties);
      
      // Fetch IPFS images for each property
      setLoadingImages(true);
      console.log('🖼️ Starting IPFS image fetch for all properties...');
      
      const imagePromises = fetchedProperties.map(async (property) => {
        console.log(`\n📦 Fetching images for: ${property.assetName}`);
        console.log(`   Main Image URL: ${property.assetImageUrl}`);
        
        const allImages = await fetchIPFSImages(property.assetImageUrl);
        
        // Add additional images if they exist
        const additionalImages = property.additionalImages || [];
        console.log(`   Additional images from description: ${additionalImages.length}`);
        
        const finalImages = [...allImages, ...additionalImages].filter(Boolean);
        console.log(`   ✅ Total images for ${property.assetName}: ${finalImages.length}`);
        
        return {
          assetId: property.assetId,
          images: finalImages
        };
      });
      
      const imagesData = await Promise.all(imagePromises);
      const imagesMap = {};
      imagesData.forEach(({ assetId, images }) => {
        imagesMap[assetId] = images;
      });
      
      console.log('✅ All images fetched:', imagesMap);
      setPropertyImages(imagesMap);
      setLoadingImages(false);
      
    } catch (error) {
      console.error('Error fetching properties:', error);
      showNotification('Failed to load properties', 'error');
    } finally {
      setLoading(false);
    }
  }, [assetRegistry, isConnected, showNotification]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Calculate metrics
  const totalProperties = properties.length;
  const availableProperties = properties.filter(p => {
    if (p.model === 1) {
      const soldWeight = p.soldWeight ? parseFloat(ethers.utils.formatUnits(p.soldWeight, 0)) : 0;
      return soldWeight < 10000;
    } else {
      const available = p.availableShares 
        ? parseFloat(ethers.utils.formatUnits(p.availableShares, 0)) 
        : 0;
      return available > 0;
    }
  }).length;

  const totalValue = properties.reduce((sum, p) => {
    if (p.model === 1) {
      const value = p.totalValue 
        ? parseFloat(ethers.utils.formatEther(p.totalValue)) 
        : 0;
      return sum + value;
    } else {
      const price = p.pricePerShare 
        ? parseFloat(ethers.utils.formatEther(p.pricePerShare)) 
        : 0;
      const total = p.totalSupply 
        ? parseFloat(ethers.utils.formatUnits(p.totalSupply, 0)) 
        : 0;
      return sum + (price * total);
    }
  }, 0);

  // Filter properties
  const filteredProperties = properties
    .filter(property => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = property.assetName?.toLowerCase().includes(query);
        const matchesType = property.assetType?.toLowerCase().includes(query);
        const matchesLocation = property.propertyData?.location?.toLowerCase().includes(query);
        if (!matchesName && !matchesType && !matchesLocation) return false;
      }

      // Category filter
      if (filter !== 'all') {
        const type = property.assetType?.toLowerCase() || '';
        const propertyType = property.propertyData?.propertyType?.toLowerCase() || '';
        
        switch(filter) {
          case 'residential':
            return type.includes('residential') || propertyType.includes('residential');
          case 'commercial':
            return type.includes('commercial') || propertyType.includes('commercial');
          case 'land':
            return type.includes('land') || propertyType.includes('land');
          default:
            return true;
        }
      }

      return true;
    })
    .sort((a, b) => {
      switch(sortBy) {
        case 'newest':
          return parseInt(b.createdAt) - parseInt(a.createdAt);
        case 'oldest':
          return parseInt(a.createdAt) - parseInt(b.createdAt);
        case 'priceHigh':
          const priceA = a.model === 1 
            ? parseFloat(ethers.utils.formatEther(a.totalValue || '0'))
            : parseFloat(ethers.utils.formatEther(a.pricePerShare || '0'));
          const priceB = b.model === 1 
            ? parseFloat(ethers.utils.formatEther(b.totalValue || '0'))
            : parseFloat(ethers.utils.formatEther(b.pricePerShare || '0'));
          return priceB - priceA;
        case 'priceLow':
          const priceA2 = a.model === 1 
            ? parseFloat(ethers.utils.formatEther(a.totalValue || '0'))
            : parseFloat(ethers.utils.formatEther(a.pricePerShare || '0'));
          const priceB2 = b.model === 1 
            ? parseFloat(ethers.utils.formatEther(b.totalValue || '0'))
            : parseFloat(ethers.utils.formatEther(b.pricePerShare || '0'));
          return priceA2 - priceB2;
        default:
          return 0;
      }
    });

  // Show detail view
  if (selectedProperty) {
    return (
      <PropertyDetailView 
        property={selectedProperty}
        onBack={() => {
          setSelectedProperty(null);
          fetchProperties();
        }}
        onPurchaseSuccess={async () => {
          await fetchProperties();
        }}
      />
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <p className="text-neutral-500 font-light mb-2">Connect your wallet</p>
          <p className="text-neutral-600 text-sm font-light">
            Please connect your wallet to view properties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-light text-white mb-2">Real Estate Properties</h1>
          <p className="text-neutral-500 font-light">
            Discover and invest in fractional real estate ownership
          </p>
        </div>

        {/* CORRECT ORDER: Search + Controls Row (like marketplace screenshot 4) */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
            />
          </div>

          {/* Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border border-neutral-800 rounded-lg bg-neutral-950 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors flex items-center gap-2"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="hidden md:inline">Filters</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex border border-neutral-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-3 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-black text-neutral-500 hover:text-white'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-3 transition-colors ${
                viewMode === 'list'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-black text-neutral-500 hover:text-white'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-neutral-700"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priceHigh">Price: High to Low</option>
            <option value="priceLow">Price: Low to High</option>
          </select>
        </div>

        {/* Category Tabs (AFTER search row, BEFORE stats) */}
        <div className="mb-8">
          <nav className="flex items-center gap-6 border-b border-neutral-900">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-3 text-sm font-light transition-all duration-200 border-b-2 flex items-center gap-2 ${
                filter === 'all' 
                  ? 'text-white border-white' 
                  : 'text-neutral-500 border-transparent hover:text-neutral-300'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>All Properties</span>
              <span className={`px-2 py-0.5 text-xs rounded-lg ${
                filter === 'all' ? 'bg-neutral-900/50 text-white' : 'bg-neutral-900 text-neutral-600'
              }`}>
                {totalProperties}
              </span>
            </button>
            <button
              onClick={() => setFilter('residential')}
              className={`px-4 py-3 text-sm font-light transition-all duration-200 border-b-2 flex items-center gap-2 ${
                filter === 'residential' 
                  ? 'text-white border-white' 
                  : 'text-neutral-500 border-transparent hover:text-neutral-300'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Residential</span>
            </button>
            <button
              onClick={() => setFilter('commercial')}
              className={`px-4 py-3 text-sm font-light transition-all duration-200 border-b-2 flex items-center gap-2 ${
                filter === 'commercial' 
                  ? 'text-white border-white' 
                  : 'text-neutral-500 border-transparent hover:text-neutral-300'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Commercial</span>
            </button>
            <button
              onClick={() => setFilter('land')}
              className={`px-4 py-3 text-sm font-light transition-all duration-200 border-b-2 flex items-center gap-2 ${
                filter === 'land' 
                  ? 'text-white border-white' 
                  : 'text-neutral-500 border-transparent hover:text-neutral-300'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Land</span>
            </button>
          </nav>
        </div>

        {/* Stats Cards (AFTER tabs, like marketplace) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-black/50 backdrop-blur-sm p-6 border rounded-lg" style={{borderColor: 'rgba(34, 128, 205, 0.3)'}}>
            <p className="text-xs font-light uppercase tracking-widest text-neutral-500 mb-1">
              Total Value Locked
            </p>
            <p className="text-2xl font-light text-white">
              {totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs font-light text-neutral-500 mt-1">OPN</p>
          </div>

          <div className="bg-black/50 backdrop-blur-sm p-6 border rounded-lg" style={{borderColor: 'rgba(34, 128, 205, 0.3)'}}>
            <p className="text-xs font-light uppercase tracking-widest text-neutral-500 mb-1">
              Total Shares
            </p>
            <p className="text-2xl font-light text-white">
              {totalProperties}
            </p>
            <p className="text-xs font-light text-neutral-500 mt-1">Minted</p>
          </div>

          <div className="bg-black/50 backdrop-blur-sm p-6 border rounded-lg" style={{borderColor: 'rgba(34, 128, 205, 0.3)'}}>
            <p className="text-xs font-light uppercase tracking-widest text-neutral-500 mb-1">
              Trading Volume
            </p>
            <p className="text-2xl font-light text-white">
              {availableProperties.toLocaleString()}
            </p>
            <p className="text-xs font-light text-neutral-500 mt-1">OPN</p>
          </div>
        </div>

        {/* Loading State */}
        {(loading || loadingImages) && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {/* Properties Grid */}
        {!loading && !loadingImages && filteredProperties.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(property => (
              <PropertyCard
                key={property.assetId}
                property={property}
                images={propertyImages[property.assetId] || [property.assetImageUrl]}
                onViewDetails={setSelectedProperty}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !loadingImages && filteredProperties.length === 0 && (
          <div className="text-center py-32">
            <Building className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-500 text-lg font-light">
              {searchQuery || filter !== 'all'
                ? 'No properties match your filters'
                : 'No properties available'}
            </p>
            <p className="text-neutral-600 text-sm mt-2">
              {searchQuery || filter !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Check back later or try a different filter'}
            </p>
            {(searchQuery || filter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                }}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesView;