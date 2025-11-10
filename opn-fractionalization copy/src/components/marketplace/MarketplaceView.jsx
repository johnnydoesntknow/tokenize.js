// src/components/marketplace/MarketplaceView.jsx
import React, { useState } from 'react';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useWeb3 } from '../../contexts/Web3Context';
import AssetCard from './AssetCard';
import AssetDetailView from './AssetDetailView';
import { Loader2, Home, Car, Palette, Package, AlertCircle } from 'lucide-react';

const MarketplaceView = () => {
  const { assets, loading, error } = useMarketplace();
  const { isConnected } = useWeb3();
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  
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
  // If an asset is selected, show the detail view
  if (selectedAsset) {
    return (
      <AssetDetailView 
        asset={selectedAsset} 
        onBack={() => setSelectedAsset(null)}
      />
    );
  }
  
  // Asset categories with icons
  const categories = [
    { id: 'all', label: 'All Assets', icon: null },
    { id: 'real-estate', label: 'Real Estate', icon: Home },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'art', label: 'Art', icon: Palette },
    { id: 'collectibles', label: 'Collectibles', icon: Package },
  ];
  
  // Filter assets based on selected category
  const filteredAssets = activeCategory === 'all' 
    ? assets 
    : assets.filter(asset => {
        const categoryMap = {
          'real-estate': ['REAL_ESTATE', 'Real Estate', 'Property'],
          'vehicles': ['VEHICLE', 'Vehicle', 'Car', 'Automobile'],
          'art': ['ART', 'Art', 'Artwork', 'Painting'],
          'collectibles': ['COLLECTIBLE', 'Collectibles', 'LUXURY_WATCH', 'Luxury Watch']
        };
        
        const assetType = asset.assetType || '';
        return categoryMap[activeCategory]?.some(type => 
          assetType.toUpperCase().includes(type.toUpperCase())
        );
      });
  
  // Calculate metrics based on filtered assets
  const totalValue = filteredAssets.reduce((sum, a) => {
  const price = parseFloat(a.pricePerShare || 0);
  const total = parseInt(a.totalShares || 0);
  const available = parseInt(a.availableShares || 0);
  const sold = total - available;
  return sum + (price * sold);
}, 0);

const totalFractions = filteredAssets.reduce((sum, a) => {
  return sum + parseInt(a.totalShares || 0);
}, 0);

const totalVolume = filteredAssets.reduce((sum, a) => {
  return sum + parseFloat(a.totalRevenue || 0);
}, 0);


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
  <h1 className="text-4xl font-light text-white mb-2 pl-14 lg:pl-0">Asset Marketplace</h1>
  <p className="text-neutral-400 font-light pl-14 lg:pl-0">
    Discover premium tokenized assets verified through ATLAS protocol
  </p>
</div>

         

          {/* Professional Category Navigation - Horizontal scroll on mobile */}
          <div className="mb-4 sm:mb-6 md:mb-12 -mx-3 sm:mx-0">
            <div className="border-b" style={{borderColor: 'rgba(34, 128, 205, 0.3)'}}>
              <nav className="flex overflow-x-auto scrollbar-hide px-3 sm:px-0">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const isActive = activeCategory === category.id;
                  const count = category.id === 'all' 
                    ? assets.length 
                    : filteredAssets.filter(asset => {
                        const categoryMap = {
                          'real-estate': ['REAL_ESTATE', 'Real Estate', 'Property'],
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
                {totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[9px] sm:text-[10px] md:text-xs font-light text-neutral-500 mt-0.5 sm:mt-1">OPN</p>
            </div>
            
            <div className="bg-black/50 backdrop-blur-sm p-3 sm:p-4 md:p-6 border" style={{borderColor: 'rgba(34, 128, 205, 0.3)'}}>
              <p className="text-[9px] sm:text-[10px] md:text-xs font-light uppercase tracking-widest text-neutral-500 mb-0.5 sm:mb-1">
                Total Fractions
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-light text-white">
                {totalFractions.toLocaleString('en-US')}
              </p>
              <p className="text-[9px] sm:text-[10px] md:text-xs font-light text-neutral-500 mt-0.5 sm:mt-1">Minted</p>
            </div>
            
            <div className="bg-black/50 backdrop-blur-sm p-3 sm:p-4 md:p-6 border sm:col-span-2 md:col-span-1" style={{borderColor: 'rgba(34, 128, 205, 0.3)'}}>
              <p className="text-[9px] sm:text-[10px] md:text-xs font-light uppercase tracking-widest text-neutral-500 mb-0.5 sm:mb-1">
                Trading Volume
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-light text-white">
                {totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <p className="text-neutral-500 font-light text-sm md:text-base">Unable to load assets</p>
              <p className="text-[10px] md:text-xs text-neutral-600 mt-2 break-words overflow-wrap-anywhere max-w-full">
                {error}
              </p>
            </div>
          )}

          {/* Assets Grid - Responsive: 1 col mobile, 2 col tablet, 3 col desktop */}
          {!loading && !error && filteredAssets.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {filteredAssets.map(asset => (
  <AssetCard 
    key={asset.assetId}  // Changed from asset.tokenId
    asset={asset}
    onBuyClick={(asset) => setSelectedAsset(asset)}
  />
))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredAssets.length === 0 && (
            <div className="text-center py-12 sm:py-20 md:py-32">
              <p className="text-neutral-500 font-light text-sm sm:text-base md:text-lg">
                No assets available in this category
              </p>
              <p className="text-neutral-600 font-light text-xs md:text-sm mt-2">
                Check back soon for new listings
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceView;