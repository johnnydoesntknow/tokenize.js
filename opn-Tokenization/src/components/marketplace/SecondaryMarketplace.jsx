// src/components/marketplace/SecondaryMarketplace.jsx
// ENHANCED VERSION - Better UX with search, filters, sorting
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';
import { 
  ShoppingCart, Loader2, AlertCircle, TrendingUp, 
  Package, User, Clock, X, Check, Filter, Search,
  SlidersHorizontal, ArrowUpDown, Grid, List
} from 'lucide-react';

const SecondaryMarketplace = () => {
  const { isConnected, address } = useWeb3();
  const { secondaryMarket, assetRegistry, positionNFT } = useContract();
  const { showNotification } = useApp();
  
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [buying, setBuying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssetType, setFilterAssetType] = useState('all');
  const [filterOwnership, setFilterOwnership] = useState('all'); // all, partial, full
  const [filterModel, setFilterModel] = useState('all'); // all, weighted, fixed
  const [showMyListings, setShowMyListings] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  // Sorting
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, price-low, price-high, ownership-high, ownership-low
  
  // View mode
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  
  // Show filters panel
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all active listings
  const fetchListings = useCallback(async () => {
    if (!secondaryMarket || !assetRegistry || !isConnected) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const result = await secondaryMarket.getActiveListings(0, 100);
      const rawListings = result[0] || result;
      
      if (!rawListings || rawListings.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }

      const enrichedListings = await Promise.all(
        rawListings.map(async (listing) => {
          try {
            const asset = await assetRegistry.assets(listing.assetId);
            const isWeighted = (asset.model || asset[7]) === 1;
            
            let displayAmount, displayPercentage, ownershipPercent;
            
        if (isWeighted) {
  // ✅ FIXED: Convert wei-units to percentage (1e18 = 100%)
  ownershipPercent = parseFloat(ethers.utils.formatUnits(listing.amountListed, 16));
  displayPercentage = ownershipPercent.toFixed(3) + '%';
  displayAmount = displayPercentage;
            } else {
              const totalSupply = asset.totalSupply || asset[8];
              if (totalSupply.gt(0)) {
                ownershipPercent = listing.amountListed.mul(10000).div(totalSupply).toNumber() / 100;
                displayPercentage = ownershipPercent.toFixed(3) + '%';
              } else {
                ownershipPercent = 0;
                displayPercentage = '0%';
              }
              displayAmount = listing.amountListed.toString() + ' shares';
            }

            const priceInEth = parseFloat(ethers.utils.formatEther(listing.price));

            return {
              listingId: listing.listingId.toString(),
              positionId: listing.positionId.toString(),
              seller: listing.seller,
              assetId: listing.assetId.toString(),
              assetName: asset.assetName || asset[3] || 'Unnamed Asset',
              assetType: asset.assetType || asset[2] || 'Other',
              assetImageUrl: asset.mainImageUrl || asset[5] || '',
              amountListed: listing.amountListed.toString(),
              displayAmount,
              displayPercentage,
              ownershipPercent,
              price: ethers.utils.formatEther(listing.price),
              priceNumber: priceInEth,
              isPartialSale: listing.isPartialSale,
              isActive: listing.isActive,
              createdAt: listing.createdAt.toNumber(),
              isWeighted,
              model: asset.model || asset[7]
            };
          } catch (error) {
            console.error('Error enriching listing:', error);
            return null;
          }
        })
      );

      const validListings = enrichedListings.filter(l => l !== null && l.isActive);
      setListings(validListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
      showNotification('Failed to load marketplace listings', 'error');
    } finally {
      setLoading(false);
    }
  }, [secondaryMarket, assetRegistry, isConnected, showNotification]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Handle purchase
  const handleBuy = async (listing) => {
    if (!secondaryMarket) return;

    setBuying(true);
    try {
      const price = ethers.utils.parseEther(listing.price);
      const fee = price.mul(200).div(10000);
      const totalCost = price.add(fee);

      const tx = await secondaryMarket.buyPosition(listing.listingId, {
        value: totalCost
      });

      showNotification('Transaction submitted...', 'info');
      await tx.wait();

      showNotification(
        `Successfully purchased ${listing.displayAmount} of ${listing.assetName}!`,
        'success'
      );

      setSelectedListing(null);
      await fetchListings();
    } catch (error) {
      console.error('Error buying position:', error);
      showNotification('Failed to purchase: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setBuying(false);
    }
  };

  // Handle cancel listing
  const handleCancelListing = async (listing) => {
    if (!secondaryMarket) return;

    setCancelling(true);
    try {
      const tx = await secondaryMarket.cancelListing(listing.listingId);

      showNotification('Cancelling listing...', 'info');
      await tx.wait();

      showNotification('Listing cancelled successfully!', 'success');

      setSelectedListing(null);
      await fetchListings();
    } catch (error) {
      console.error('Error cancelling listing:', error);
      showNotification('Failed to cancel listing: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setCancelling(false);
    }
  };

  // Apply filters and search
  const filteredAndSortedListings = useMemo(() => {
    let filtered = [...listings];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l => 
        l.assetName.toLowerCase().includes(query) ||
        l.assetType.toLowerCase().includes(query) ||
        l.seller.toLowerCase().includes(query)
      );
    }

    // Asset type filter
    if (filterAssetType !== 'all') {
      filtered = filtered.filter(l => 
        l.assetType.toLowerCase() === filterAssetType.toLowerCase()
      );
    }

    // Ownership filter
    if (filterOwnership === 'partial') {
      filtered = filtered.filter(l => l.isPartialSale);
    } else if (filterOwnership === 'full') {
      filtered = filtered.filter(l => !l.isPartialSale);
    }

    // Model filter
    if (filterModel === 'weighted') {
      filtered = filtered.filter(l => l.isWeighted);
    } else if (filterModel === 'fixed') {
      filtered = filtered.filter(l => !l.isWeighted);
    }

    // My listings filter
    if (showMyListings && address) {
      filtered = filtered.filter(l => 
        l.seller.toLowerCase() === address.toLowerCase()
      );
    }

    // Price range filter
    if (priceRange.min) {
      filtered = filtered.filter(l => l.priceNumber >= parseFloat(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter(l => l.priceNumber <= parseFloat(priceRange.max));
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'price-low':
          return a.priceNumber - b.priceNumber;
        case 'price-high':
          return b.priceNumber - a.priceNumber;
        case 'ownership-high':
          return b.ownershipPercent - a.ownershipPercent;
        case 'ownership-low':
          return a.ownershipPercent - b.ownershipPercent;
        default:
          return 0;
      }
    });

    return filtered;
  }, [listings, searchQuery, filterAssetType, filterOwnership, filterModel, showMyListings, priceRange, sortBy, address]);

  // Get unique asset types for filter
  const assetTypes = useMemo(() => 
    ['all', ...new Set(listings.map(l => l.assetType))],
    [listings]
  );

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterAssetType('all');
    setFilterOwnership('all');
    setFilterModel('all');
    setShowMyListings(false);
    setPriceRange({ min: '', max: '' });
    setSortBy('newest');
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (filterAssetType !== 'all') count++;
    if (filterOwnership !== 'all') count++;
    if (filterModel !== 'all') count++;
    if (showMyListings) count++;
    if (priceRange.min || priceRange.max) count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [searchQuery, filterAssetType, filterOwnership, filterModel, showMyListings, priceRange, sortBy]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-xl font-light text-white mb-2">Wallet Not Connected</h2>
          <p className="text-neutral-400 font-light">Please connect your wallet to view the marketplace</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full border border-white/10"
          style={{ animation: 'pulseSlow 4s ease-in-out infinite' }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-light text-white mb-2">P2P Marketplace</h1>
          <p className="text-neutral-400 font-light">
            Buy and sell tokenized assets with other users
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-black border border-neutral-900 p-4">
            <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
              Active Listings
            </p>
            <p className="text-2xl font-semibold text-white">{listings.length}</p>
          </div>

          <div className="bg-black border border-neutral-900 p-4">
            <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
              Showing
            </p>
            <p className="text-2xl font-semibold text-white">{filteredAndSortedListings.length}</p>
          </div>

          <div className="bg-black border border-neutral-900 p-4">
            <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
              Unique Assets
            </p>
            <p className="text-2xl font-semibold text-white">
              {new Set(listings.map(l => l.assetId)).size}
            </p>
          </div>

          <div className="bg-black border border-neutral-900 p-4">
            <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
              Total Volume
            </p>
            <p className="text-2xl font-semibold text-white">
              {listings.reduce((sum, l) => sum + parseFloat(l.price), 0).toFixed(2)} OPN
            </p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 space-y-4">
          {/* Top Row: Search, Filter Toggle, View Toggle, Sort */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, type, or seller address..."
                className="w-full pl-10 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="hidden md:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 bg-white text-blue-600 text-xs font-semibold rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle */}
            <div className="flex border border-neutral-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-neutral-800 text-white'
                    : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-900'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-neutral-800 text-white'
                    : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-900'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-neutral-700"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="ownership-high">Ownership: High to Low</option>
              <option value="ownership-low">Ownership: Low to High</option>
            </select>
          </div>

          {/* Filter Panel */}
          {showFilters && (
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
                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-neutral-700"
                  >
                    {assetTypes.map(type => (
                      <option key={type} value={type}>
                        {type === 'all' ? 'All Types' : type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ownership Type */}
                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                    Sale Type
                  </label>
                  <select
                    value={filterOwnership}
                    onChange={(e) => setFilterOwnership(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-neutral-700"
                  >
                    <option value="all">All Sales</option>
                    <option value="partial">Partial Only</option>
                    <option value="full">Full Position Only</option>
                  </select>
                </div>

                {/* Purchase Model */}
                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                    Model Type
                  </label>
                  <select
                    value={filterModel}
                    onChange={(e) => setFilterModel(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-neutral-700"
                  >
                    <option value="all">All Models</option>
                    <option value="weighted">Weighted Only</option>
                    <option value="fixed">Fixed Only</option>
                  </select>
                </div>

                {/* My Listings */}
                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                    Filter by Seller
                  </label>
                  <button
                    onClick={() => setShowMyListings(!showMyListings)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors ${
                      showMyListings
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-black border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {showMyListings ? 'Showing My Listings' : 'Show My Listings'}
                  </button>
                </div>
              </div>

              {/* Price Range */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                    Min Price (OPN)
                  </label>
                  <input
                    type="number"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                    Max Price (OPN)
                  </label>
                  <input
                    type="number"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    placeholder="999.99"
                    step="0.01"
                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-neutral-700"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              {activeFilterCount > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Listings Grid/List */}
        {filteredAndSortedListings.length === 0 ? (
          <div className="text-center py-32">
            <Package className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-light text-white mb-2">No Listings Found</h3>
            <p className="text-neutral-500 font-light mb-4">
              {activeFilterCount > 0 
                ? 'Try adjusting your filters or search query' 
                : 'Be the first to list an asset for sale!'}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedListings.map((listing) => (
              <div
                key={listing.listingId}
                className="bg-black border border-neutral-900 overflow-hidden hover:border-neutral-700 transition-all group cursor-pointer flex flex-col h-full"
                onClick={() => setSelectedListing(listing)}
              >
                {/* Image - Fixed Height */}
                <div className="aspect-video bg-neutral-900 overflow-hidden relative flex-shrink-0">
                  {listing.assetImageUrl ? (
                    <img
                      src={listing.assetImageUrl}
                      alt={listing.assetName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-neutral-700" />
                    </div>
                  )}
                  
                  {/* Badges - Fixed Position */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {listing.isPartialSale && (
                      <div className="px-3 py-1 bg-blue-600 text-white text-xs font-normal rounded-sm">
                        Partial
                      </div>
                    )}
                    {listing.isWeighted && (
                      <div className="px-3 py-1 bg-purple-600 text-white text-xs font-normal rounded-sm">
                        Weighted
                      </div>
                    )}
                  </div>

                  {listing.seller.toLowerCase() === address?.toLowerCase() && (
                    <div className="absolute top-3 right-3 px-3 py-1 bg-green-600 text-white text-xs font-normal rounded-sm">
                      Your Listing
                    </div>
                  )}
                </div>

                {/* Content - Flexible with Fixed Sections */}
                <div className="p-6 flex flex-col flex-1">
                  {/* Type and Title - Fixed Height */}
                  <div className="mb-4">
                    <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1 truncate">
                      {listing.assetType}
                    </p>
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1 min-h-[28px]">{listing.assetName}</h3>
                    <p className="text-sm font-light text-neutral-400 truncate">
                      {listing.displayAmount} ({listing.displayPercentage} ownership)
                    </p>
                  </div>

                  {/* Metrics - Fixed Height */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-xs font-normal text-neutral-500">Price</span>
                      <span className="text-sm font-normal text-white truncate ml-2">{listing.price} OPN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-normal text-neutral-500">Fee (2%)</span>
                      <span className="text-sm font-normal text-neutral-400 truncate ml-2">
                        {(parseFloat(listing.price) * 0.02).toFixed(2)} OPN
                      </span>
                    </div>
                    <div className="pt-2 border-t border-neutral-800 flex justify-between">
                      <span className="text-xs font-normal text-white">Total Cost</span>
                      <span className="text-sm font-semibold text-white truncate ml-2">
                        {(parseFloat(listing.price) * 1.02).toFixed(2)} OPN
                      </span>
                    </div>
                  </div>

                  {/* Seller Info - Fixed Height */}
                  <div className="flex items-center justify-between text-xs text-neutral-500 mb-3 min-h-[20px]">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <Clock className="w-3 h-3" />
                      <span className="whitespace-nowrap">{new Date(listing.createdAt * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Cancel button for own listings - Pushed to Bottom */}
                  {listing.seller.toLowerCase() === address?.toLowerCase() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelListing(listing);
                      }}
                      disabled={cancelling}
                      className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-400 text-sm font-normal rounded-lg transition-colors flex items-center justify-center gap-2 mt-auto"
                    >
                      {cancelling ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          Cancel Listing
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedListings.map((listing) => (
              <div
                key={listing.listingId}
                className="bg-black border border-neutral-900 p-6 hover:border-neutral-700 transition-all cursor-pointer"
                onClick={() => setSelectedListing(listing)}
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Image - Fixed Size */}
                  <div className="w-full md:w-48 h-32 bg-neutral-900 rounded-lg overflow-hidden flex-shrink-0 relative">
                    {listing.assetImageUrl ? (
                      <img
                        src={listing.assetImageUrl}
                        alt={listing.assetName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-neutral-700" />
                      </div>
                    )}
                    
                    {listing.seller.toLowerCase() === address?.toLowerCase() && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-green-600 text-white text-xs rounded-sm">
                        Yours
                      </div>
                    )}
                  </div>

                  {/* Details - Flexible */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3 gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1 truncate">
                          {listing.assetType}
                        </p>
                        <h3 className="text-xl font-semibold text-white mb-1 truncate">{listing.assetName}</h3>
                        <div className="flex items-center gap-3 text-sm text-neutral-400 flex-wrap">
                          <span className="truncate">{listing.displayAmount}</span>
                          <span>•</span>
                          <span className="truncate">{listing.displayPercentage} ownership</span>
                          {listing.isPartialSale && (
                            <>
                              <span>•</span>
                              <span className="text-blue-400">Partial Sale</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-normal text-neutral-500 mb-1 whitespace-nowrap">Total Cost</p>
                        <p className="text-2xl font-semibold text-white whitespace-nowrap">
                          {(parseFloat(listing.price) * 1.02).toFixed(2)} OPN
                        </p>
                        <p className="text-xs text-neutral-500 whitespace-nowrap">
                          ({listing.price} + {(parseFloat(listing.price) * 0.02).toFixed(2)} fee)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4 text-xs text-neutral-500">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{listing.seller.slice(0, 8)}...{listing.seller.slice(-6)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="whitespace-nowrap">{new Date(listing.createdAt * 1000).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {listing.seller.toLowerCase() === address?.toLowerCase() ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelListing(listing);
                          }}
                          disabled={cancelling}
                          className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-400 text-sm rounded-lg transition-colors whitespace-nowrap"
                        >
                          {cancelling ? 'Cancelling...' : 'Cancel Listing'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedListing(listing);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchase/Cancel Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedListing(null)} />
          
          <div className="relative bg-black border border-neutral-800 rounded-lg max-w-lg w-full">
            <div className="p-6 border-b border-neutral-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  {selectedListing.seller.toLowerCase() === address?.toLowerCase() 
                    ? 'Your Listing' 
                    : 'Confirm Purchase'}
                </h2>
                <button
                  onClick={() => setSelectedListing(null)}
                  className="p-2 hover:bg-neutral-900 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Asset Info */}
              <div>
                <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
                  {selectedListing.assetType}
                </p>
                <h3 className="text-lg font-semibold text-white">{selectedListing.assetName}</h3>
              </div>

              {/* Purchase Details */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-400">Amount</span>
                  <span className="text-sm text-white">{selectedListing.displayAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-400">Ownership</span>
                  <span className="text-sm text-white">{selectedListing.displayPercentage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-400">Listing Price</span>
                  <span className="text-sm text-white">{selectedListing.price} OPN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-400">Marketplace Fee (2%)</span>
                  <span className="text-sm text-neutral-400">
                    {(parseFloat(selectedListing.price) * 0.02).toFixed(2)} OPN
                  </span>
                </div>
                <div className="pt-3 border-t border-neutral-800 flex justify-between">
                  <span className="text-white font-medium">Total Cost</span>
                  <span className="text-white font-semibold text-lg">
                    {(parseFloat(selectedListing.price) * 1.02).toFixed(2)} OPN
                  </span>
                </div>
              </div>

              {/* Seller Info */}
              <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-4">
                <p className="text-xs font-normal text-neutral-500 mb-1">Seller</p>
                <p className="text-sm text-white font-mono">{selectedListing.seller}</p>
              </div>

              {/* Info message */}
              {selectedListing.seller.toLowerCase() === address?.toLowerCase() ? (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                    <p className="text-sm text-blue-400">
                      This is your listing. You can cancel it below.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Action Buttons */}
              {selectedListing.seller.toLowerCase() === address?.toLowerCase() ? (
                <button
                  onClick={() => handleCancelListing(selectedListing)}
                  disabled={cancelling}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling Listing...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      Cancel Listing
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleBuy(selectedListing)}
                  disabled={buying}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {buying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing Purchase...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Buy Now
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecondaryMarketplace;