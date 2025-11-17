// src/components/marketplace/MarketplaceView.jsx
// SAFE VERSION - Your working design + minimal search/filter UI
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useWeb3 } from '../../contexts/Web3Context';
import AssetCard from './AssetCard';
import AssetDetailView from './AssetDetailView';
import { 
  Loader2, Home, Car, Palette, Package, AlertCircle,
  Search, SlidersHorizontal, Grid, List, X
} from 'lucide-react';

const MarketplaceView = () => {
  const { assets, loading, error } = useMarketplace();
  const { isConnected } = useWeb3();
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Simple search and view mode
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced Filters
  const [filterAssetType, setFilterAssetType] = useState('all');
  const [filterModel, setFilterModel] = useState('all');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  // Check wallet connection first
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-xl font-light text-white mb-2">Wallet Not Connected</h2>
          <p className="text-neutral-400 font-light">Please connect your wallet to view marketplace assets</p>
        </div>
      </div>
    );
  }

  // FILTER OUT REAL ESTATE - Only keep Vehicles, Art, Collectibles
  const marketplaceAssets = assets.filter(asset => {
    const assetType = (asset.assetType || '').toLowerCase();
    
    // EXCLUDE all real estate types
    const isRealEstate = 
      assetType.includes('real_estate') ||
      assetType.includes('real estate') ||
      assetType.includes('property') ||
      assetType.includes('residential') ||
      assetType.includes('commercial') ||
      assetType.includes('land');
    
    return !isRealEstate; // Only return non-real estate assets
  });
  
  // If an asset is selected, show the detail view
  if (selectedAsset) {
    return (
      <AssetDetailView 
        asset={selectedAsset} 
        onBack={() => setSelectedAsset(null)}
      />
    );
  }
  
  // Asset categories - REMOVED Real Estate
  const categories = [
    { id: 'all', label: 'All Assets', icon: null },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'art', label: 'Art', icon: Palette },
    { id: 'collectibles', label: 'Collectibles', icon: Package },
  ];
  
  // Filter assets based on selected category (using marketplaceAssets, not assets)
  let filteredAssets = activeCategory === 'all' 
    ? marketplaceAssets 
    : marketplaceAssets.filter(asset => {
        const categoryMap = {
          'vehicles': ['VEHICLE', 'Vehicle', 'Car', 'Automobile'],
          'art': ['ART', 'Art', 'Artwork', 'Painting'],
          'collectibles': ['COLLECTIBLE', 'Collectibles', 'LUXURY_WATCH', 'Luxury Watch']
        };
        
        const assetType = asset.assetType || '';
        return categoryMap[activeCategory]?.some(type => 
          assetType.toUpperCase().includes(type.toUpperCase())
        );
      });

  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredAssets = filteredAssets.filter(a => 
      a.assetName?.toLowerCase().includes(query) ||
      a.assetType?.toLowerCase().includes(query) ||
      a.assetDescription?.toLowerCase().includes(query)
    );
  }

  // Apply asset type filter
  if (filterAssetType !== 'all') {
    filteredAssets = filteredAssets.filter(a => 
      a.assetType?.toLowerCase() === filterAssetType.toLowerCase()
    );
  }

  // Apply model filter
  if (filterModel === 'weighted') {
    filteredAssets = filteredAssets.filter(a => a.model === 1);
  } else if (filterModel === 'fixed') {
    filteredAssets = filteredAssets.filter(a => a.model === 0);
  }

  // Apply availability filter
  if (filterAvailability === 'available') {
    filteredAssets = filteredAssets.filter(a => {
      if (a.model === 1) {
        return a.availableWeight > 0;
      } else {
        return a.availableShares && a.availableShares.gt(0);
      }
    });
  } else if (filterAvailability === 'soldout') {
    filteredAssets = filteredAssets.filter(a => {
      if (a.model === 1) {
        return a.availableWeight === 0;
      } else {
        return !a.availableShares || a.availableShares.eq(0);
      }
    });
  }

  // Apply price range filter
  if (priceRange.min || priceRange.max) {
    filteredAssets = filteredAssets.filter(a => {
      let price = 0;
      try {
        if (a.pricePerShare) {
          price = parseFloat(ethers.utils.formatEther(a.pricePerShare));
        }
      } catch {}
      
      const min = priceRange.min ? parseFloat(priceRange.min) : 0;
      const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
      return price >= min && price <= max;
    });
  }

  // Apply sorting
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return (b.assetId || 0) - (a.assetId || 0);
      case 'oldest':
        return (a.assetId || 0) - (b.assetId || 0);
      case 'price-low':
      case 'price-high': {
        const getPrice = (asset) => {
          try {
            if (asset.pricePerShare) {
              return parseFloat(ethers.utils.formatEther(asset.pricePerShare));
            }
          } catch {
            return 0;
          }
          return 0;
        };
        const priceA = getPrice(a);
        const priceB = getPrice(b);
        return sortBy === 'price-low' ? priceA - priceB : priceB - priceA;
      }
      default:
        return 0;
    }
  });
  
  // Calculate metrics based on filtered assets - SAFELY
  const totalValue = sortedAssets.reduce((sum, a) => {
    try {
      if (!a.pricePerShare || !a.totalShares) return sum;
      const price = ethers.BigNumber.from(a.pricePerShare);
      const total = ethers.BigNumber.from(a.totalShares);
      const available = ethers.BigNumber.from(a.availableShares || 0);
      const sold = total.sub(available);
      const value = price.mul(sold);
      return sum.add(value);
    } catch (err) {
      return sum;
    }
  }, ethers.BigNumber.from(0));

  const totalFractions = sortedAssets.reduce((sum, a) => {
    try {
      if (!a.totalShares) return sum;
      return sum.add(ethers.BigNumber.from(a.totalShares));
    } catch (err) {
      return sum;
    }
  }, ethers.BigNumber.from(0));

  const totalVolume = sortedAssets.reduce((sum, a) => {
    try {
      if (!a.totalRevenue) return sum;
      return sum.add(ethers.BigNumber.from(a.totalRevenue));
    } catch (err) {
      return sum;
    }
  }, ethers.BigNumber.from(0));

  return (
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      {/* Animated Background Circles - Fixed position with proper z-index */}
      <div 
        className="fixed inset-0 pointer-events-none overflow-hidden" 
        style={{ zIndex: 0 }}
      >
        {/* Circle 1 - Large, slow pulse */}
        <div 
          className="absolute -top-40 -right-40 w-64 md:w-96 h-64 md:h-96 rounded-full border border-white/10"
          style={{
            animation: 'pulseSlow 4s ease-in-out infinite'
          }}
        />
        
        {/* Circle 2 - Medium, rotating */}
        <div 
          className="absolute top-20 -left-20 w-48 md:w-64 h-48 md:h-64 rounded-full border border-white/5"
          style={{
            animation: 'rotateSlow 20s linear infinite'
          }}
        />
        
        {/* Circle 3 - Small, pulsing gradient - Hidden on mobile */}
        <div 
          className="hidden md:block absolute bottom-20 right-40 w-32 h-32 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        />
        
        {/* Circle 4 - Extra large, reverse rotation */}
        <div 
          className="absolute -bottom-64 -left-64 w-[20rem] md:w-[32rem] h-[20rem] md:h-[32rem] rounded-full border border-white/5"
          style={{
            animation: 'rotateReverse 30s linear infinite'
          }}
        />
        
        {/* Circle 5 - Medium gradient, floating - Hidden on mobile */}
        <div 
          className="hidden lg:block absolute top-1/2 right-1/3 w-48 h-48 rounded-full blur-xl"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)',
            animation: 'floatAnimation 6s ease-in-out infinite'
          }}
        />
        
        {/* Additional decorative circles - Hidden on mobile */}
        <div 
          className="hidden md:block absolute top-1/3 left-1/4 w-24 h-24 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
            animation: 'floatAnimation 8s ease-in-out infinite reverse'
          }}
        />
        
        <div 
          className="hidden md:block absolute bottom-1/3 right-1/4 w-40 h-40 rounded-full border border-white/5"
          style={{
            animation: 'pulseSlow 6s ease-in-out infinite'
          }}
        />
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulseSlow {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.6; 
            transform: scale(1.05); 
          }
        }

        @keyframes rotateSlow {
          from { 
            transform: rotate(0deg); 
          }
          to { 
            transform: rotate(360deg); 
          }
        }

        @keyframes rotateReverse {
          from { 
            transform: rotate(360deg); 
          }
          to { 
            transform: rotate(0deg); 
          }
        }

        @keyframes floatAnimation {
          0%, 100% { 
            transform: translateY(0) translateX(0); 
          }
          25% { 
            transform: translateY(-20px) translateX(10px); 
          }
          50% { 
            transform: translateY(10px) translateX(-10px); 
          }
          75% { 
            transform: translateY(-10px) translateX(20px); 
          }
        }

        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.5; 
            transform: scale(0.95); 
          }
        }

        /* Hide scrollbar on mobile for horizontal scroll */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Main Content - Positioned above background with proper z-index */}
      <div className="relative" style={{ zIndex: 1 }}>
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-12 max-w-[1400px] mx-auto">
          {/* Executive Header */}
          <div className="px-6 lg:px-8 py-4 lg:py-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white mb-2">Asset Marketplace</h1>
            <p className="text-neutral-400 font-light pl-14 lg:pl-0">
              Discover premium tokenized assets verified through ATLAS protocol
            </p>
          </div>

          {/* Search and Controls Bar */}
          <div className="mb-4 sm:mb-6 px-3 sm:px-0">
            <div className="flex flex-col gap-3">
              {/* Main Controls Row */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search with clear button */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search assets..."
                    className="w-full pl-10 pr-10 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter Button with Badge */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 border rounded-lg transition-all flex items-center gap-2 ${
                    showFilters || (filterAssetType !== 'all' || filterModel !== 'all' || filterAvailability !== 'all' || priceRange.min || priceRange.max)
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Filters</span>
                  {(filterAssetType !== 'all' || filterModel !== 'all' || filterAvailability !== 'all' || priceRange.min || priceRange.max) && (
                    <span className="px-2 py-0.5 bg-white text-blue-600 text-xs font-semibold rounded-full min-w-[20px] text-center">
                      {[
                        filterAssetType !== 'all',
                        filterModel !== 'all',
                        filterAvailability !== 'all',
                        priceRange.min || priceRange.max
                      ].filter(Boolean).length}
                    </span>
                  )}
                </button>

                {/* View Mode Toggle */}
                <div className="flex border border-neutral-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-neutral-800 text-white'
                        : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-900'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 transition-colors ${
                      viewMode === 'list'
                        ? 'bg-neutral-800 text-white'
                        : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-900'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-neutral-700"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              {/* Active Filters Pills */}
              {(searchQuery || activeCategory !== 'all' || filterAssetType !== 'all' || filterModel !== 'all' || filterAvailability !== 'all' || priceRange.min || priceRange.max) && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-neutral-500">Active:</span>
                  
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-3 py-1 bg-blue-600/20 border border-blue-600/30 rounded-full text-xs text-blue-400 flex items-center gap-1.5 hover:bg-blue-600/30 transition-colors"
                    >
                      Search: "{searchQuery.slice(0, 20)}{searchQuery.length > 20 ? '...' : ''}"
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {activeCategory !== 'all' && (
                    <button
                      onClick={() => setActiveCategory('all')}
                      className="px-3 py-1 bg-blue-600/20 border border-blue-600/30 rounded-full text-xs text-blue-400 flex items-center gap-1.5 hover:bg-blue-600/30 transition-colors capitalize"
                    >
                      Category: {activeCategory}
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {filterAssetType !== 'all' && (
                    <button
                      onClick={() => setFilterAssetType('all')}
                      className="px-3 py-1 bg-blue-600/20 border border-blue-600/30 rounded-full text-xs text-blue-400 flex items-center gap-1.5 hover:bg-blue-600/30 transition-colors capitalize"
                    >
                      Type: {filterAssetType}
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {filterModel !== 'all' && (
                    <button
                      onClick={() => setFilterModel('all')}
                      className="px-3 py-1 bg-blue-600/20 border border-blue-600/30 rounded-full text-xs text-blue-400 flex items-center gap-1.5 hover:bg-blue-600/30 transition-colors capitalize"
                    >
                      Model: {filterModel}
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {filterAvailability !== 'all' && (
                    <button
                      onClick={() => setFilterAvailability('all')}
                      className="px-3 py-1 bg-blue-600/20 border border-blue-600/30 rounded-full text-xs text-blue-400 flex items-center gap-1.5 hover:bg-blue-600/30 transition-colors capitalize"
                    >
                      {filterAvailability === 'available' ? 'Available Only' : 'Sold Out Only'}
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {(priceRange.min || priceRange.max) && (
                    <button
                      onClick={() => setPriceRange({ min: '', max: '' })}
                      className="px-3 py-1 bg-blue-600/20 border border-blue-600/30 rounded-full text-xs text-blue-400 flex items-center gap-1.5 hover:bg-blue-600/30 transition-colors"
                    >
                      Price: {priceRange.min || '0'} - {priceRange.max || '∞'} OPN
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('all');
                      setFilterAssetType('all');
                      setFilterModel('all');
                      setFilterAvailability('all');
                      setPriceRange({ min: '', max: '' });
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Advanced Filters Panel - Smooth expand/collapse */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Asset Type */}
                    <div>
                      <label className="block text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                        Asset Type
                      </label>
                      <select
                        value={filterAssetType}
                        onChange={(e) => setFilterAssetType(e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      >
                        <option value="all">All Types</option>
                        <option value="vehicle">Vehicle</option>
                        <option value="art">Art</option>
                        <option value="collectible">Collectible</option>
                        <option value="luxury_watch">Luxury Watch</option>
                      </select>
                    </div>

                    {/* Model Type */}
                    <div>
                      <label className="block text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                        Model Type
                      </label>
                      <select
                        value={filterModel}
                        onChange={(e) => setFilterModel(e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      >
                        <option value="all">All Models</option>
                        <option value="weighted">Weighted Only</option>
                        <option value="fixed">Fixed Only</option>
                      </select>
                    </div>

                    {/* Availability */}
                    <div>
                      <label className="block text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                        Availability
                      </label>
                      <select
                        value={filterAvailability}
                        onChange={(e) => setFilterAvailability(e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      >
                        <option value="all">All Assets</option>
                        <option value="available">Available Only</option>
                        <option value="soldout">Sold Out Only</option>
                      </select>
                    </div>

                    {/* Price Range */}
                    <div>
                      <label className="block text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                        Price Range (OPN)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={priceRange.min}
                          onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                          className="w-1/2 px-2 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={priceRange.max}
                          onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                          className="w-1/2 px-2 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Category Navigation - Horizontal scroll on mobile */}
          <div className="mb-4 sm:mb-6 md:mb-12 -mx-3 sm:mx-0">
            <div className="border-b" style={{borderColor: 'rgba(34, 128, 205, 0.3)'}}>
              <nav className="flex overflow-x-auto scrollbar-hide px-3 sm:px-0">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const isActive = activeCategory === category.id;
                  const count = category.id === 'all' 
                    ? marketplaceAssets.length 
                    : filteredAssets.filter(asset => {
                        const categoryMap = {
                          'vehicles': ['VEHICLE', 'Vehicle', 'Car', 'Automobile'],
                          'art': ['ART', 'Art', 'Artwork', 'Painting'],
                          'collectibles': ['COLLECTIBLE', 'Collectibles', 'LUXURY_WATCH', 'Luxury Watch']
                        };
                        const assetType = asset.assetType || '';
                        return categoryMap[category.id]?.some(type => 
                          assetType.toUpperCase().includes(type.toUpperCase())
                        );
                      }).length;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`
                        flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-3 md:px-6 py-2 sm:py-2.5 md:py-4 
                        transition-all duration-200 whitespace-nowrap
                        border-b-2 flex-shrink-0 text-[11px] sm:text-xs md:text-sm min-w-fit
                        ${isActive 
                          ? 'text-white border-white' 
                          : 'text-neutral-500 border-transparent hover:text-neutral-300'}
                      `}
                    >
                      {Icon && <Icon className="w-3 h-3 md:w-4 md:h-4" />}
                      <span className="font-light">{category.label}</span>
                      {count > 0 && (
                        <span className={`
                          px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] md:text-xs rounded-sm
                          ${isActive ? 'bg-neutral-900/50 text-white' : 'bg-neutral-900 text-neutral-600'}
                        `}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Metrics Cards - Stack on mobile, row on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-6 mb-4 sm:mb-6 md:mb-12">
            <div className="bg-black/50 backdrop-blur-sm p-3 sm:p-4 md:p-6 border" style={{borderColor: 'rgba(34, 128, 205, 0.3)'}}>
              <p className="text-[9px] sm:text-[10px] md:text-xs font-light uppercase tracking-widest text-neutral-500 mb-0.5 sm:mb-1">
                Total Value Locked
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-light text-white">
                {parseFloat(ethers.utils.formatEther(totalValue)).toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </p>
              <p className="text-[9px] sm:text-[10px] md:text-xs font-light text-neutral-500 mt-0.5 sm:mt-1">OPN</p>
            </div>
            
            <div className="bg-black/50 backdrop-blur-sm p-3 sm:p-4 md:p-6 border" style={{borderColor: 'rgba(34, 128, 205, 0.3)'}}>
              <p className="text-[9px] sm:text-[10px] md:text-xs font-light uppercase tracking-widest text-neutral-500 mb-0.5 sm:mb-1">
                Total Shares
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-light text-white">
                {parseFloat(ethers.utils.formatUnits(totalFractions, 0)).toLocaleString('en-US', { 
                  minimumFractionDigits: 0, 
                  maximumFractionDigits: 0 
                })}
              </p>
              <p className="text-[9px] sm:text-[10px] md:text-xs font-light text-neutral-500 mt-0.5 sm:mt-1">Minted</p>
            </div>
            
            <div className="bg-black/50 backdrop-blur-sm p-3 sm:p-4 md:p-6 border sm:col-span-2 md:col-span-1" style={{borderColor: 'rgba(34, 128, 205, 0.3)'}}>
              <p className="text-[9px] sm:text-[10px] md:text-xs font-light uppercase tracking-widest text-neutral-500 mb-0.5 sm:mb-1">
                Trading Volume
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-light text-white">
                {parseFloat(ethers.utils.formatEther(totalVolume)).toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </p>
              <p className="text-[9px] sm:text-[10px] md:text-xs font-light text-neutral-500 mt-0.5 sm:mt-1">OPN</p>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12 sm:py-20 md:py-32">
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-500 animate-spin" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12 md:py-32 px-4">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-neutral-500 font-light text-sm md:text-base">Unable to load assets</p>
              <p className="text-[10px] md:text-xs text-neutral-600 mt-2 break-words overflow-wrap-anywhere max-w-full">
                {error}
              </p>
            </div>
          )}

          {/* Assets Grid - Responsive: 1 col mobile, 2 col tablet, 3 col desktop */}
          {!loading && !error && sortedAssets.length > 0 && (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6'
                : 'space-y-4'
            }>
              {sortedAssets.map(asset => (
                <AssetCard 
                  key={asset.assetId}
                  asset={asset}
                  onBuyClick={(asset) => setSelectedAsset(asset)}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && sortedAssets.length === 0 && (
            <div className="text-center py-12 sm:py-20 md:py-32">
              <Package className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-500 font-light text-sm sm:text-base md:text-lg">
                {(searchQuery || filterAssetType !== 'all' || filterModel !== 'all' || filterAvailability !== 'all' || priceRange.min || priceRange.max)
                  ? 'No assets match your filters' 
                  : 'No assets available in this category'}
              </p>
              <p className="text-neutral-600 font-light text-xs md:text-sm mt-2">
                {(searchQuery || filterAssetType !== 'all' || filterModel !== 'all' || filterAvailability !== 'all' || priceRange.min || priceRange.max)
                  ? 'Try adjusting your filters or search query'
                  : 'Check back soon for new listings'}
              </p>
              {(searchQuery || filterAssetType !== 'all' || filterModel !== 'all' || filterAvailability !== 'all' || priceRange.min || priceRange.max) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterAssetType('all');
                    setFilterModel('all');
                    setFilterAvailability('all');
                    setPriceRange({ min: '', max: '' });
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
    </div>
  );
};

export default MarketplaceView;