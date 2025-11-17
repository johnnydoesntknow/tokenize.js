// src/components/portfolio/PortfolioView.jsx
// ENHANCED - Added Cancel P2P Listing functionality
import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';
import { ethers } from 'ethers';
import { 
  TrendingUp, TrendingDown, PieChart, Activity, 
  Package, Clock, Loader2, DollarSign, BarChart3,
  ArrowUpRight, ArrowDownRight, Eye, Shield, AlertCircle, Vote, Plus, X
} from 'lucide-react';
import ProposalCreationModal from '../dao/ProposalCreationModal';
import ProposalVotingCard from '../dao/ProposalVotingCard';
import ProposalIndicator from '../dao/ProposalIndicator';
import SellSharesModal from './SellSharesModal';

// ============================================================================
// CUSTOM HOOK - Check for P2P Listings
// ============================================================================
const usePositionListings = (userAssets, address, secondaryMarket) => {
  const [positionListings, setPositionListings] = useState({});
  const [loadingListings, setLoadingListings] = useState(false);

  useEffect(() => {
    const checkListings = async () => {
      // Check all conditions inside useEffect, not before hook call
      if (!secondaryMarket || !userAssets || userAssets.length === 0 || !address) {
        setPositionListings({});
        setLoadingListings(false);
        return;
      }

      setLoadingListings(true);
      try {
        // Get all active listings
        const result = await secondaryMarket.getActiveListings(0, 100);
        const allListings = result[0] || result;

        if (!allListings || allListings.length === 0) {
          setPositionListings({});
          setLoadingListings(false);
          return;
        }

        // Filter to only user's listings
        const myListings = allListings.filter(
          listing => listing.seller.toLowerCase() === address.toLowerCase()
        );

        // Map listings by assetId
        const listingsByAsset = {};
        myListings.forEach(listing => {
          const assetId = listing.assetId.toString();
          if (!listingsByAsset[assetId]) {
            listingsByAsset[assetId] = [];
          }
          listingsByAsset[assetId].push({
            listingId: listing.listingId.toString(),
            positionId: listing.positionId.toString(),
            price: ethers.utils.formatEther(listing.price),
            amountListed: listing.amountListed.toString(),
            isPartialSale: listing.isPartialSale
          });
        });

        setPositionListings(listingsByAsset);
      } catch (error) {
        console.error('Error checking listings:', error);
        setPositionListings({});
      } finally {
        setLoadingListings(false);
      }
    };

    checkListings();
  }, [secondaryMarket, userAssets, address]);

  return { positionListings, loadingListings };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const PortfolioView = () => {
  const { isConnected, address } = useWeb3();
  const { assetRegistry, positionNFT, primaryMarket, governance, secondaryMarket } = useContract();
  const { showNotification } = useApp();
  
  const [loading, setLoading] = useState(true);
  const [userAssets, setUserAssets] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [proposals, setProposals] = useState([]);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [selectedAssetForProposal, setSelectedAssetForProposal] = useState(null);
  const [showProposals, setShowProposals] = useState(false);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [assetToSell, setAssetToSell] = useState(null);

  // P2P Listing functionality - ALWAYS call hooks before any returns
  const { positionListings, loadingListings } = usePositionListings(userAssets, address, secondaryMarket);
  const [cancellingListing, setCancellingListing] = useState(false);

  // Fetch user's complete position data
  const fetchUserData = useCallback(async () => {
    if (!assetRegistry || !positionNFT || !address || !isConnected) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const result = await assetRegistry.getActiveAssets(0, 100);
      const assetIds = result[0] || result.assetIds || [];
      
      const holdingsPromises = assetIds.map(async (assetId) => {
        try {
          const positionIds = await positionNFT.getUserPositions(address, assetId);
          
          if (!positionIds || positionIds.length === 0) return null;
          
          let totalAmount = ethers.BigNumber.from(0);
          let totalPurchaseValue = ethers.BigNumber.from(0);
          
          for (const posId of positionIds) {
            const position = await positionNFT.positions(posId);
            const amount = position.amount || position[3];
            const purchasePrice = position.purchasePrice || position[4];
            
            totalAmount = totalAmount.add(amount);
            totalPurchaseValue = totalPurchaseValue.add(purchasePrice);
          }
          
          if (totalAmount.isZero()) return null;

          const asset = await assetRegistry.assets(assetId);
          
          let percentageOwned = 0;
          let currentValue;
          let pricePerShare;
          
          if ((asset.model || asset[7]) === 0) {
            // FIXED MODEL
            const totalSupply = asset.totalSupply || asset[8];
            const pricePerToken = asset.pricePerToken || asset[9];
            
            if (totalSupply.gt(0)) {
              percentageOwned = totalAmount.mul(10000).div(totalSupply).toNumber() / 100;
            }
            
            currentValue = ethers.utils.formatEther(pricePerToken.mul(totalAmount));
            pricePerShare = ethers.utils.formatEther(pricePerToken);
          }  else {
  // ✅ WEIGHTED MODEL - FIXED for 1e18 precision
  percentageOwned = parseFloat(ethers.utils.formatUnits(totalAmount, 16));
  
  const totalValue = asset.totalValue || asset[11];
  const weight = parseFloat(ethers.utils.formatUnits(totalAmount, 16)) / 100;
  currentValue = (parseFloat(ethers.utils.formatEther(totalValue)) * weight).toString();
  pricePerShare = ethers.utils.formatEther(totalValue.div(ethers.BigNumber.from("100")));
}
          
          const currentVal = parseFloat(currentValue);
          const purchaseVal = parseFloat(ethers.utils.formatEther(totalPurchaseValue));
          const gain = currentVal - purchaseVal;
          const gainPercentage = purchaseVal > 0 ? (gain / purchaseVal) * 100 : 0;
          
          return {
            assetId: assetId.toString(),
            shares: totalAmount.toString(),
            positionCount: positionIds.length,
            positionIds: positionIds.map(id => id.toString()),
            assetName: asset.assetName || asset[3] || 'Unnamed Asset',
            assetType: asset.assetType || asset[2] || 'Other',
            assetImageUrl: asset.mainImageUrl || asset[5] || '',
            creator: asset.creator || asset[1],
            model: (asset.model || asset[7]),
            location: "Global",
            pricePerShare,
            totalValue: currentValue,
            percentageOwned,
            purchaseValue: purchaseVal,
            gain,
            gainPercentage
          };
        } catch (err) {
          console.error(`Error fetching position for asset ${assetId}:`, err);
          return null;
        }
      });

      const holdings = (await Promise.all(holdingsPromises)).filter(h => h !== null);
      setUserAssets(holdings);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, [assetRegistry, positionNFT, address, isConnected]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Handle cancel P2P listing
  const handleCancelListing = async (assetId) => {
    if (!secondaryMarket) return;

    const listings = positionListings[assetId];
    if (!listings || listings.length === 0) return;

    setCancellingListing(true);
    try {
      const listingId = listings[0].listingId;
      
      const tx = await secondaryMarket.cancelListing(listingId);
      
      showNotification('Cancelling listing...', 'info');
      await tx.wait();
      
      showNotification('Listing cancelled successfully!', 'success');
      
      await fetchUserData();
    } catch (error) {
      console.error('Error cancelling listing:', error);
      showNotification('Failed to cancel listing: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setCancellingListing(false);
    }
  };

  // Fetch proposals from Governance contract
  const fetchProposals = useCallback(async () => {
    if (!governance || !userAssets.length) return;
    
    setLoadingProposals(true);
    try {
      const allProposals = [];
      
      for (const asset of userAssets) {
        try {
          const proposalIds = await governance.getAssetProposals(asset.assetId);
          
          if (proposalIds && proposalIds.length > 0) {
            const assetProposals = [];
            
            for (const proposalId of proposalIds) {
              try {
                const proposal = await governance.proposals(proposalId);
                
                let metadata = {
                  title: proposal.title || proposal[3] || '',
                  description: proposal.description || proposal[4] || '',
                  type: 'General',
                  documentation: '',
                  createdAt: Date.now(),
                  votingPeriodDays: 7
                };
                
                if (proposal.ipfsHash || proposal[5]) {
                  try {
                    const ipfsHash = proposal.ipfsHash || proposal[5];
                    const metadataRes = await fetch(`${import.meta.env.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs/'}${ipfsHash}`);
                    const ipfsData = await metadataRes.json();
                    metadata = { ...metadata, ...ipfsData };
                  } catch (ipfsError) {
                    console.log('Could not fetch IPFS metadata:', ipfsError);
                  }
                }
                
                const hasVoted = await governance.hasUserVoted(proposalId, address);
                
                assetProposals.push({
                  id: proposalId.toString(),
                  assetId: asset.assetId,
                  assetName: asset.assetName,
                  proposer: proposal.proposer || proposal[2],
                  title: metadata.title,
                  description: metadata.description,
                  type: metadata.type,
                  estimatedCost: ethers.utils.formatEther(proposal.estimatedCost || proposal[6] || '0'),
                  documentation: metadata.documentation,
                  votingDeadline: (proposal.votingDeadline || proposal[7]).toNumber(),
                  createdAt: (proposal.createdAt || proposal[12] || ethers.BigNumber.from(Date.now() / 1000)).toNumber(),
                  votingPeriodDays: metadata.votingPeriodDays,
                  votes: {
                    yes: parseFloat(ethers.utils.formatEther(proposal.yesVotes || proposal[8] || '0')),
                    no: parseFloat(ethers.utils.formatEther(proposal.noVotes || proposal[9] || '0')),
                    total: parseFloat(ethers.utils.formatEther(proposal.totalVoted || proposal[10] || '0'))
                  },
                  status: (proposal.status || proposal[11] || 0),
                  hasVoted: hasVoted.voted || hasVoted[0] || false,
                  statusText: proposal.status === 1 ? 'executed' : 
                            proposal.status === 2 ? 'cancelled' :
                            proposal.status === 3 ? 'rejected' :
                            Date.now() > (proposal.votingDeadline.toNumber() * 1000) ? 'expired' : 'active'
                });
              } catch (error) {
                console.error('Error loading proposal:', error);
              }
            }
            
            if (assetProposals.length > 0) {
              allProposals.push({
                assetId: asset.assetId,
                assetName: asset.assetName,
                proposals: assetProposals
              });
            }
          }
        } catch (error) {
          console.error(`Error loading proposals for asset ${asset.assetId}:`, error);
        }
      }
      
      setProposals(allProposals);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoadingProposals(false);
    }
  }, [governance, userAssets, address]);

  useEffect(() => {
    if (showProposals && userAssets.length > 0) {
      fetchProposals();
    }
  }, [showProposals, userAssets, fetchProposals]);

  const handleProposalCreated = () => {
    setShowProposalModal(false);
    setSelectedAssetForProposal(null);
    fetchProposals();
    showNotification('Proposal created successfully', 'success');
  };

  const handleVote = async (proposalId, support) => {
    try {
      const tx = await governance.vote(proposalId, support);
      showNotification('Vote submitted...', 'info');
      await tx.wait();
      showNotification('Vote recorded successfully!', 'success');
      await fetchProposals();
    } catch (error) {
      console.error('Error voting:', error);
      showNotification('Failed to cast vote', 'error');
    }
  };

  const isAssetCreator = (asset) => {
    return asset.creator && asset.creator.toLowerCase() === address?.toLowerCase();
  };

  const activeProposals = proposals.flatMap(p => 
    p.proposals?.filter(prop => prop.statusText === 'active') || []
  );

  useEffect(() => {
    if (!governance || !primaryMarket) return;

    const handleProposalCreatedEvent = async (proposalId, assetId) => {
      console.log('New proposal created:', { proposalId: proposalId.toString(), assetId: assetId.toString() });
      const ownedAsset = userAssets.find(a => a.assetId === assetId.toString());
      if (ownedAsset) {
        await fetchProposals();
      }
    };

    const handleVoteCastEvent = async (proposalId) => {
      console.log('Vote cast:', { proposalId: proposalId.toString() });
      const hasProposal = proposals.some(p => 
        p.proposals?.some(prop => prop.id === proposalId.toString())
      );
      if (hasProposal) {
        await fetchProposals();
      }
    };

    const handlePurchaseEvent = () => {
      fetchUserData();
    };

    try {
      governance.on('ProposalCreated', handleProposalCreatedEvent);
      governance.on('VoteCast', handleVoteCastEvent);
      primaryMarket.on('FractionsPurchased', handlePurchaseEvent);

      return () => {
        governance.off('ProposalCreated', handleProposalCreatedEvent);
        governance.off('VoteCast', handleVoteCastEvent);
        primaryMarket.off('FractionsPurchased', handlePurchaseEvent);
      };
    } catch (error) {
      console.log('Event listeners not set up:', error.message);
    }
  }, [governance, primaryMarket, userAssets, proposals, fetchProposals, fetchUserData]);

  // Calculate stats
  const totalValue = userAssets.reduce((sum, asset) => sum + parseFloat(asset.totalValue), 0);
  const totalGain = userAssets.reduce((sum, asset) => sum + asset.gain, 0);
  const totalPurchaseValue = userAssets.reduce((sum, asset) => sum + asset.purchaseValue, 0);
  const portfolioGainPercentage = totalPurchaseValue > 0 ? (totalGain / totalPurchaseValue) * 100 : 0;
  const totalAssets = userAssets.length;
  const avgOwnership = userAssets.length > 0 
    ? userAssets.reduce((sum, asset) => sum + asset.percentageOwned, 0) / userAssets.length 
    : 0;
  
  const assetAllocation = userAssets.reduce((acc, asset) => {
    const type = asset.assetType || 'Other';
    if (!acc[type]) acc[type] = 0;
    acc[type] += parseFloat(asset.totalValue);
    return acc;
  }, {});

  const portfolioHealth = (() => {
    if (userAssets.length === 0) return 'No Assets';
    if (userAssets.length === 1) return 'Not Diversified';
    
    const diversificationScore = Math.min(userAssets.length / 5, 1) * 50;
    const performanceScore = portfolioGainPercentage > 0 ? 
      Math.min(portfolioGainPercentage / 20, 1) * 50 : 0;
    
    const totalScore = diversificationScore + performanceScore;
    
    if (totalScore >= 75) return 'Excellent';
    if (totalScore >= 50) return 'Good';
    if (totalScore >= 25) return 'Fair';
    return 'Poor';
  })();

  const formatNumber = (num) => {
    return parseFloat(num).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  // NOW check conditions and return early if needed
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-xl font-light text-white mb-2">Wallet Not Connected</h2>
          <p className="text-neutral-400 font-light">Please connect your wallet to view your portfolio</p>
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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'holdings', label: `Holdings (${userAssets.length})` },
    { id: 'proposals', label: `Proposals (${activeProposals.length})` },
    { id: 'analytics', label: 'Analytics' }
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full border border-white/10"
          style={{ animation: 'pulseSlow 4s ease-in-out infinite' }}
        />
        <div 
          className="absolute top-20 -left-20 w-64 h-64 rounded-full border border-white/5"
          style={{ animation: 'rotateSlow 20s linear infinite' }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-light text-white mb-2">Investment Portfolio</h1>
          <p className="text-neutral-400 font-light">
            Track performance and manage your tokenized asset holdings
          </p>
        </div>

        {/* Portfolio Summary */}
        <div className="bg-black border border-neutral-900 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                TOTAL PORTFOLIO VALUE
              </p>
              <p className="text-3xl font-light text-white mb-2">
                {formatNumber(totalValue)} <span className="text-lg text-neutral-400">OPN</span>
              </p>
              <div className="flex items-center gap-2">
                {totalGain >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-normal ${totalGain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {totalGain >= 0 ? '+' : ''}{formatNumber(totalGain)} OPN
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                Total Assets
              </p>
              <p className="text-3xl font-light text-white">{totalAssets}</p>
            </div>

            <div>
              <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-2">
                Avg. Ownership
              </p>
              <p className="text-3xl font-light text-white">{avgOwnership.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-black border border-neutral-900 p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5 text-neutral-500" />
            </div>
            <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
              ASSETS OWNED
            </p>
            <p className="text-2xl font-semibold text-white">{totalAssets}</p>
          </div>

          <div className="bg-black border border-neutral-900 p-6">
            <div className="flex items-center justify-between mb-2">
              {totalGain >= 0 ? (
                <ArrowUpRight className="w-5 h-5 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
              TOTAL GAIN
            </p>
            <p className={`text-2xl font-semibold ${totalGain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {totalGain >= 0 ? '+' : ''}{portfolioGainPercentage.toFixed(2)}%
            </p>
          </div>

          <div className="bg-black border border-neutral-900 p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-neutral-500" />
            </div>
            <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
              PORTFOLIO HEALTH
            </p>
            <p className="text-2xl font-semibold text-white">{portfolioHealth}</p>
          </div>

          <div className="bg-black border border-neutral-900 p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-neutral-500" />
            </div>
            <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
              24H CHANGE
            </p>
            <p className="text-2xl font-semibold text-neutral-400">—</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-900 mb-8">
          <div className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'proposals') {
                    setShowProposals(true);
                  }
                }}
                className={`
                  pb-4 px-1 border-b-2 transition-all font-normal
                  ${activeTab === tab.id
                    ? 'border-white text-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && userAssets.length === 0 && (
            <div className="text-center py-32">
              <Package className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-xl font-light text-white mb-2">No Assets Yet</h3>
              <p className="text-neutral-500 font-light mb-6">
                Start building your portfolio by purchasing tokenized assets
              </p>
            </div>
          )}

          {activeTab === 'overview' && userAssets.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-black border border-neutral-900 p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Asset Allocation</h3>
                <div className="space-y-4">
                  {Object.entries(assetAllocation).map(([type, value]) => {
                    const percentage = (value / totalValue) * 100;
                    return (
                      <div key={type}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-normal text-neutral-400">{type}</span>
                          <span className="text-sm font-normal text-white">{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-black border border-neutral-900 p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Recent Holdings</h3>
                <div className="space-y-4">
                  {userAssets.slice(0, 5).map((asset) => (
                    <div key={asset.assetId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neutral-900 rounded-sm overflow-hidden">
                          {asset.assetImageUrl && (
                            <img
                              src={asset.assetImageUrl}
                              alt={asset.assetName}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-normal text-white">{asset.assetName}</p>
                          <p className="text-xs font-light text-neutral-500">
                            {asset.percentageOwned.toFixed(3)}% owned
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-normal text-white">{formatNumber(asset.totalValue)} OPN</p>
                        <p className={`text-xs font-light ${asset.gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {asset.gain >= 0 ? '+' : ''}{asset.gainPercentage.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'holdings' && (
            <div>
              {userAssets.length === 0 ? (
                <div className="text-center py-32">
                  <Package className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                  <h3 className="text-xl font-light text-white mb-2">No Holdings</h3>
                  <p className="text-neutral-500 font-light">
                    Purchase assets to see them here
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userAssets.map((asset) => (
                    <div
                      key={asset.assetId}
                      className="bg-black border border-neutral-900 overflow-hidden hover:border-neutral-700 transition-all group"
                    >
                      <div className="aspect-video bg-neutral-900 overflow-hidden relative">
                        {asset.assetImageUrl ? (
                          <img
                            src={asset.assetImageUrl}
                            alt={asset.assetName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-neutral-700" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <div className={`px-3 py-1 rounded-sm text-xs font-normal ${
                            asset.gain >= 0 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {asset.gain >= 0 ? '+' : ''}{asset.gainPercentage.toFixed(2)}%
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="mb-4">
                          <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
                            {asset.assetType}
                          </p>
                          <h3 className="text-lg font-semibold text-white mb-1">{asset.assetName}</h3>
                          <p className="text-sm font-light text-neutral-400">
                            {asset.percentageOwned.toFixed(3)}% ownership
                          </p>
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="flex justify-between">
                            <span className="text-xs font-normal text-neutral-500">Current Value</span>
                            <span className="text-sm font-normal text-white">{formatNumber(asset.totalValue)} OPN</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs font-normal text-neutral-500">Purchase Value</span>
                            <span className="text-sm font-normal text-neutral-400">{formatNumber(asset.purchaseValue)} OPN</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs font-normal text-neutral-500">Gain/Loss</span>
                            <span className={`text-sm font-normal ${asset.gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {asset.gain >= 0 ? '+' : ''}{formatNumber(asset.gain)} OPN
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs font-normal text-neutral-500">Positions</span>
                            <span className="text-sm font-normal text-white">{asset.positionCount}</span>
                          </div>
                        </div>

                        {/* Actions - WITH CANCEL P2P LISTING */}
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setAssetToSell(asset);
                                setShowSellModal(true);
                              }}
                              className="flex-1 px-4 py-2 bg-neutral-900 text-white text-sm font-normal hover:bg-neutral-800 transition-colors"
                            >
                              Sell
                            </button>
                            {isAssetCreator(asset) && (
                              <button
                                onClick={() => {
                                  setSelectedAssetForProposal(asset);
                                  setShowProposalModal(true);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-normal hover:bg-blue-700 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Cancel P2P Listing Button */}
                          {positionListings[asset.assetId] && positionListings[asset.assetId].length > 0 && (
                            <button
                              onClick={() => handleCancelListing(asset.assetId)}
                              disabled={cancellingListing}
                              className="w-full py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 rounded-sm text-sm font-normal transition-colors flex items-center justify-center gap-2"
                            >
                              {cancellingListing ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Cancelling...
                                </>
                              ) : (
                                <>
                                  <X className="w-4 h-4" />
                                  Cancel P2P Listing ({positionListings[asset.assetId][0].price} OPN)
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'proposals' && (
            <div>
              {loadingProposals ? (
                <div className="text-center py-12">
                  <Loader2 className="w-6 h-6 text-neutral-500 animate-spin mx-auto" />
                  <p className="text-neutral-500 mt-2">Loading proposals...</p>
                </div>
              ) : activeProposals.length === 0 ? (
                <div className="text-center py-32">
                  <Vote className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                  <p className="text-neutral-500 font-normal text-lg">No active proposals</p>
                  <p className="text-neutral-600 font-light text-sm mt-2">
                    Proposals for your assets will appear here
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {activeProposals.map((proposal) => {
                    const asset = userAssets.find(a => a.assetId === proposal.assetId);
                    return (
                      <ProposalVotingCard
                        key={proposal.id}
                        proposal={proposal}
                        userOwnership={asset?.percentageOwned || 0}
                        onVote={handleVote}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-black border border-neutral-900 p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Portfolio Performance</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-normal text-neutral-400">Total Invested</span>
                    <span className="text-sm font-normal text-white">{formatNumber(totalPurchaseValue)} OPN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-normal text-neutral-400">Current Value</span>
                    <span className="text-sm font-normal text-white">{formatNumber(totalValue)} OPN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-normal text-neutral-400">Total Return</span>
                    <span className={`text-sm font-normal ${totalGain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {totalGain >= 0 ? '+' : ''}{formatNumber(totalGain)} OPN ({portfolioGainPercentage.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-normal text-neutral-400">Number of Positions</span>
                    <span className="text-sm font-normal text-white">
                      {userAssets.reduce((sum, a) => sum + a.positionCount, 0)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-black border border-neutral-900 p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Top Holdings by Value</h3>
                <div className="space-y-4">
                  {userAssets
                    .sort((a, b) => parseFloat(b.totalValue) - parseFloat(a.totalValue))
                    .slice(0, 5)
                    .map((asset, index) => (
                      <div key={asset.assetId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-light text-neutral-600 w-4">{index + 1}</span>
                          <div>
                            <p className="text-sm font-normal text-white">{asset.assetName}</p>
                            <p className="text-xs font-light text-neutral-500">{asset.percentageOwned.toFixed(3)}% owned</p>
                          </div>
                        </div>
                        <p className="text-sm font-normal text-white">{formatNumber(asset.totalValue)} OPN</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SellSharesModal
        isOpen={showSellModal}
        onClose={() => {
          setShowSellModal(false);
          setAssetToSell(null);
        }}
        asset={assetToSell}
        onSellComplete={fetchUserData}
      />

      <ProposalCreationModal
        isOpen={showProposalModal}
        onClose={() => {
          setShowProposalModal(false);
          setSelectedAssetForProposal(null);
        }}
        assetId={selectedAssetForProposal?.assetId}
        assetName={selectedAssetForProposal?.assetName}
        onProposalCreated={handleProposalCreated}
      />
    </div>
  );
};

export default PortfolioView;