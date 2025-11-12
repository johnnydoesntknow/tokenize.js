// src/components/portfolio/PortfolioView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';
import { ethers } from 'ethers';
import { 
  TrendingUp, TrendingDown, PieChart, Activity, 
  Package, Clock, Loader2, DollarSign, BarChart3,
  ArrowUpRight, ArrowDownRight, Eye, Shield, AlertCircle, Vote, Plus
} from 'lucide-react';
import ProposalCreationModal from '../dao/ProposalCreationModal';
import ProposalVotingCard from '../dao/ProposalVotingCard';
import ProposalIndicator from '../dao/ProposalIndicator';
import SellSharesModal from './SellSharesModal';


const PortfolioView = () => {
  const { isConnected, address } = useWeb3();
  const { tokenization } = useContract();
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

  useEffect(() => {
    const fetchUserData = async () => {
      if (!tokenization || !address || !isConnected) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const userAssetIds = await tokenization.getUserTokens(address);
        
        const holdingsPromises = userAssetIds.map(async (assetId) => {
          const shares = await tokenization.getUserShares(address, assetId);
          if (shares.toString() === '0') return null;

          const assetDetails = await tokenization.assetDetails(assetId);
          
          const percentageOwned = assetDetails.totalSupply.gt(0) 
            ? (shares.mul(10000).div(assetDetails.totalSupply)).toNumber() / 100
            : 0;
          const currentValue = ethers.utils.formatEther(
            assetDetails.pricePerFraction.mul(shares)
          );
          
          return {
            assetId: assetId.toString(),
            shares: shares.toString(),
            assetName: assetDetails.assetName,
            assetType: assetDetails.assetType,
            assetImageUrl: assetDetails.assetImageUrl,
            creator: assetDetails.creator, // Add creator field
            location: "Global",
            pricePerShare: ethers.utils.formatEther(assetDetails.pricePerFraction),
            totalValue: currentValue,
            percentageOwned,
            purchaseValue: parseFloat(currentValue) * 0.85,
            gain: parseFloat(currentValue) * 0.15,
            gainPercentage: 17.65
          };
        });

        const holdings = (await Promise.all(holdingsPromises)).filter(h => h !== null);
        setUserAssets(holdings);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [tokenization, address, isConnected]);

  // Fetch proposals from blockchain
  const fetchProposals = useCallback(async () => {
    if (!tokenization || !userAssets.length) return;
    
    setLoadingProposals(true);
    try {
      const allProposals = [];
      
      for (const asset of userAssets) {
        try {
          const proposalCount = await tokenization.getAssetProposalCount(asset.assetId);
          
          if (proposalCount && proposalCount.gt(0)) {
            const assetProposals = [];
            
            for (let i = 0; i < proposalCount.toNumber(); i++) {
              const proposalId = await tokenization.assetProposals(asset.assetId, i);
              const proposal = await tokenization.proposals(proposalId);
              
              const metadataRes = await fetch(`${import.meta.env.VITE_IPFS_GATEWAY}${proposal.ipfsHash}`);
              const metadata = await metadataRes.json();
              
              const hasVoted = await tokenization.hasVoted(proposalId, address);
              
              assetProposals.push({
                id: proposalId.toString(),
                assetId: asset.assetId,
                assetName: asset.assetName,
                proposer: proposal.proposer,
                title: metadata.title,
                description: metadata.description,
                type: metadata.type,
                estimatedCost: ethers.utils.formatEther(proposal.estimatedCost),
                documentation: metadata.documentation,
                votingDeadline: proposal.votingDeadline.toNumber(),
                createdAt: metadata.createdAt,
                votingPeriodDays: metadata.votingPeriodDays,
                votes: {
                  yes: parseFloat(ethers.utils.formatEther(proposal.yesVotes)),
                  no: parseFloat(ethers.utils.formatEther(proposal.noVotes)),
                  total: parseFloat(ethers.utils.formatEther(proposal.totalVoted))
                },
                executed: proposal.executed,
                cancelled: proposal.cancelled,
                hasVoted: hasVoted,
                status: proposal.executed ? 'executed' : 
                        proposal.cancelled ? 'cancelled' :
                        Date.now() > proposal.votingDeadline * 1000 ? 'expired' : 'active'
              });
            }
            
            allProposals.push({
              assetId: asset.assetId,
              assetName: asset.assetName,
              proposals: assetProposals
            });
          }
        } catch (error) {
          console.error(`Error fetching proposals for asset ${asset.assetId}:`, error);
        }
      }
      
      setProposals(allProposals);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoadingProposals(false);
    }
  }, [tokenization, userAssets, address]);

  // Fetch proposals when assets load
  useEffect(() => {
    if (userAssets.length > 0) {
      fetchProposals();
    }
  }, [userAssets, fetchProposals]);

  // Handle proposal creation
  const handleProposalCreated = async (newProposal) => {
    try {
      const tx = await tokenization.createProposal(
        newProposal.assetId,
        newProposal.ipfsHash,
        ethers.utils.parseEther(newProposal.estimatedCost.toString()),
        newProposal.votingPeriodDays
      );
      
      await tx.wait();
      await fetchProposals();
      
      showNotification('Proposal created successfully', 'success');
    } catch (error) {
      console.error('Error creating proposal:', error);
      showNotification('Failed to create proposal', 'error');
    }
  };

  // Handle voting
  const handleVote = async (proposalId, voteType, weight) => {
    try {
      const support = voteType === 'yes';
      const tx = await tokenization.vote(proposalId, support);
      await tx.wait();
      
      await fetchProposals();
      showNotification(`Vote cast successfully`, 'success');
    } catch (error) {
      console.error('Error voting:', error);
      showNotification('Failed to cast vote', 'error');
    }
  };

  // Check if user is creator of an asset
  const isAssetCreator = (asset) => {
    return asset.creator && asset.creator.toLowerCase() === address?.toLowerCase();
  };

  // Get active proposals
  const activeProposals = proposals.flatMap(p => 
    p.proposals?.filter(prop => prop.status === 'active') || []
  );

  // Listen for proposal events
  useEffect(() => {
    if (!tokenization) return;

    const handleProposalCreatedEvent = async (proposalId, assetId, proposer, ipfsHash) => {
      console.log('New proposal created:', { proposalId: proposalId.toString(), assetId: assetId.toString() });
      const ownedAsset = userAssets.find(a => a.assetId === assetId.toString());
      if (ownedAsset) {
        await fetchProposals();
      }
    };

    const handleVoteCastEvent = async (proposalId, voter, support, weight) => {
      console.log('Vote cast:', { proposalId: proposalId.toString(), support });
      const hasProposal = proposals.some(p => 
        p.proposals?.some(prop => prop.id === proposalId.toString())
      );
      if (hasProposal) {
        await fetchProposals();
      }
    };

    try {
      tokenization.on('ProposalCreated', handleProposalCreatedEvent);
      tokenization.on('VoteCast', handleVoteCastEvent);

      return () => {
        tokenization.off('ProposalCreated', handleProposalCreatedEvent);
        tokenization.off('VoteCast', handleVoteCastEvent);
      };
    } catch (error) {
      console.log('Event listeners not set up:', error.message);
    }
  }, [tokenization, userAssets, proposals, fetchProposals]);

  // Calculate portfolio metrics
  const totalValue = userAssets.reduce((sum, asset) => sum + parseFloat(asset.totalValue), 0);
  const totalGain = userAssets.reduce((sum, asset) => sum + asset.gain, 0);
  const totalAssets = userAssets.length;
  
  const assetAllocation = userAssets.reduce((acc, asset) => {
    const type = asset.assetType || 'Other';
    if (!acc[type]) acc[type] = 0;
    acc[type] += parseFloat(asset.totalValue);
    return acc;
  }, {});

  const formatNumber = (num) => {
    return parseFloat(num).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

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
      {/* Animated Background Circles */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full border border-white/10"
          style={{ animation: 'pulseSlow 4s ease-in-out infinite' }}
        />
        <div 
          className="absolute top-20 -left-20 w-64 h-64 rounded-full border border-white/5"
          style={{ animation: 'rotateSlow 20s linear infinite' }}
        />
        <div 
          className="absolute bottom-20 right-40 w-32 h-32 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute -bottom-64 -left-64 w-[32rem] h-[32rem] rounded-full border border-white/5"
          style={{ animation: 'rotateReverse 30s linear infinite' }}
        />
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulseSlow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes rotateReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.95); }
        }
      `}</style>

      {/* Main Content */}
      <div className="relative" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="px-6 lg:px-8 py-4 lg:py-8">
            <h1 className="text-4xl font-light text-white mb-2 pl-14 lg:pl-0">Investment Portfolio</h1>
            <p className="text-neutral-400 font-light pl-14 lg:pl-0">
              Track performance and manage your tokenized asset holdings
            </p>
          </div>

          {/* Active Proposals Banner */}
          {activeProposals.length > 0 && (
            <div className="bg-yellow-500/10 border-y border-yellow-500/30 py-3 px-6 mb-6">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vote className="w-5 h-5 text-yellow-500" />
                  <p className="text-sm text-yellow-500">
                    You have {activeProposals.length} active proposal{activeProposals.length > 1 ? 's' : ''} requiring your vote
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('proposals')}
                  className="text-sm text-yellow-500 hover:text-yellow-400 underline"
                >
                  View Proposals
                </button>
              </div>
            </div>
          )}

          {/* Portfolio Value Card */}
          <div className="bg-gradient-to-br from-neutral-950 to-neutral-900 border border-neutral-800 p-8 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-normal uppercase tracking-widest text-neutral-500 mb-2">
                  Total Portfolio Value
                </p>
                <div className="flex items-baseline gap-4 mb-4">
                  <p className="text-2xl font-semibold text-white">{formatNumber(totalValue)}</p>
                  <span className="text-lg font-normal text-neutral-400">OPN</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {totalGain >= 0 ? (
                    <>
                      <ArrowUpRight className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-normal">
                        +{formatNumber(totalGain)} OPN
                      </span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 font-normal">
                        {formatNumber(totalGain)} OPN
                      </span>
                    </>
                  )}
                </div>
                {/* Action Buttons */}
<div className="flex gap-2 mt-4 pt-4 border-t border-neutral-900">
  <button
    onClick={() => {
      setAssetToSell(asset);
      setShowSellModal(true);
    }}
    className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-lg text-sm font-medium transition-colors"
  >
    Sell Shares
  </button>
  
  {/* View NFT Button */}
  <button
    onClick={() => {
      // Open NFT viewer or link to OpenSea/explorer
      window.open(`https://opensea.io/assets/opn/${tokenization.address}/${asset.nftId}`, '_blank');
    }}
    className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white rounded-lg text-sm font-medium transition-colors"
  >
    View NFT
  </button>
</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-light text-neutral-500 mb-1">Total Assets</p>
                  <p className="text-lg font-normal text-white">{totalAssets}</p>
                </div>
                <div>
                  <p className="text-xs font-light text-neutral-500 mb-1">Avg. Ownership</p>
                  <p className="text-lg font-normal text-white">
                    {totalAssets > 0 
                      ? (userAssets.reduce((sum, a) => sum + a.percentageOwned, 0) / totalAssets).toFixed(2)
                      : '0.00'
                    }%
                  </p>
                </div>
              </div>
              <SellSharesModal
  isOpen={showSellModal}
  onClose={() => {
    setShowSellModal(false);
    setAssetToSell(null);
  }}
  asset={assetToSell}
  onSellComplete={fetchUserData}
/>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-[1px] bg-neutral-900 mb-12">
            <div className="bg-black p-6">
              <div className="flex items-center gap-3 mb-3">
                <Package className="w-5 h-5 text-neutral-500" />
                <p className="text-xs font-normal uppercase tracking-widest text-neutral-500">
                  Assets Owned
                </p>
              </div>
              <p className="text-2xl font-semibold text-white">{totalAssets}</p>
            </div>
            
            <div className="bg-black p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-5 h-5 text-neutral-500" />
                <p className="text-xs font-normal uppercase tracking-widest text-neutral-500">
                  Total Gain
                </p>
              </div>
              <p className={`text-2xl font-semibold ${totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalGain >= 0 ? '+' : ''}{formatNumber(totalGain)}
              </p>
            </div>
            
            <div className="bg-black p-6">
              <div className="flex items-center gap-3 mb-3">
                <PieChart className="w-5 h-5 text-neutral-500" />
                <p className="text-xs font-normal uppercase tracking-widest text-neutral-500">
                  Portfolio Health
                </p>
              </div>
              <p className="text-2xl font-semibold text-white">Good</p>
            </div>
            
            <div className="bg-black p-6">
              <div className="flex items-center gap-3 mb-3">
                <Activity className="w-5 h-5 text-neutral-500" />
                <p className="text-xs font-normal uppercase tracking-widest text-neutral-500">
                  24h Change
                </p>
              </div>
              <p className="text-2xl font-semibold text-neutral-400">—</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-neutral-900 mb-8">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-6 py-4 text-sm transition-all duration-300 border-b-2
                    ${activeTab === tab.id 
                      ? 'text-white border-white font-semibold' 
                      : 'text-neutral-500 border-transparent hover:text-neutral-300 font-normal'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-black border border-neutral-900 p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Asset Allocation</h3>
                <div className="space-y-4">
                  {Object.entries(assetAllocation).map(([type, value]) => {
                    const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
                    return (
                      <div key={type}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-normal text-neutral-300">{type}</span>
                          <span className="text-sm font-normal text-white">
                            {percentage.toFixed(1)}% • {formatNumber(value)} OPN
                          </span>
                        </div>
                        <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-neutral-700 to-neutral-600"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="bg-black border border-neutral-900 p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="text-center py-8 text-neutral-500 font-light text-sm">
                    No recent transactions
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'holdings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userAssets.length === 0 ? (
                <div className="col-span-full text-center py-32">
                  <Package className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                  <p className="text-neutral-500 font-normal text-lg">No assets in portfolio</p>
                  <p className="text-neutral-600 font-light text-sm mt-2">
                    Visit the marketplace to acquire fractional ownership
                  </p>
                </div>
              ) : (
                userAssets.map((asset) => {
                  const assetProposals = proposals.find(p => p.assetId === asset.assetId)?.proposals || [];
                  const activeCount = assetProposals.filter(p => p.status === 'active').length;
                  const isCreator = isAssetCreator(asset);

                  return (
                    <div key={asset.assetId} className="relative">
                      {/* Proposal Indicator */}
                      {activeCount > 0 && (
                        <ProposalIndicator
                          proposalCount={activeCount}
                          onClick={() => setActiveTab('proposals')}
                        />
                      )}

                      <div className="bg-black border border-neutral-900 overflow-hidden group hover:border-neutral-800 transition-all duration-500">
                        <div className="relative aspect-[4/3] overflow-hidden bg-neutral-950">
                          <img
                            src={asset.assetImageUrl}
                            alt={asset.assetName}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';
                            }}
                          />
                          
                          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-sm">
                            <div className={`flex items-center gap-1 ${asset.gainPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {asset.gainPercentage >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              <span className="text-xs font-normal">
                                {asset.gainPercentage >= 0 ? '+' : ''}{asset.gainPercentage.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-6">
                          <p className="text-xs font-normal uppercase tracking-widest text-neutral-500 mb-2">
                            {asset.assetType}
                          </p>
                          <h3 className="text-lg font-semibold text-white mb-1">{asset.assetName}</h3>
                          <p className="text-sm font-light text-neutral-500 mb-4">{asset.location}</p>
                          
                          <div className="space-y-3 mb-4">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-light text-neutral-500">Ownership</span>
                              <span className="text-lg font-semibold text-white">{asset.percentageOwned.toFixed(3)}%</span>
                            </div>
                            
                            <div className="h-1 bg-neutral-900 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-neutral-700 to-neutral-600"
                                style={{ width: `${Math.min(asset.percentageOwned, 100)}%` }}
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2 pt-4 border-t border-neutral-900">
                            <div className="flex justify-between text-sm">
                              <span className="text-neutral-500 font-light">Current Value</span>
                              <span className="text-white font-normal">{formatNumber(asset.totalValue)} OPN</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-neutral-500 font-light">Gain/Loss</span>
                              <span className={`font-normal ${asset.gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {asset.gain >= 0 ? '+' : ''}{formatNumber(asset.gain)} OPN
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Create Proposal Button for Creators */}
                        {isCreator && (
                          <div className="px-6 pb-4 border-t border-neutral-900">
                            <button
                              onClick={() => {
                                setSelectedAssetForProposal(asset);
                                setShowProposalModal(true);
                              }}
                              className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-sm text-white flex items-center justify-center gap-2 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Create Proposal
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Proposals Tab */}
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
                <div className="h-64 flex items-center justify-center text-neutral-600">
                  <BarChart3 className="w-8 h-8" />
                </div>
                <p className="text-center text-sm font-light text-neutral-500 mt-4">
                  Performance chart coming soon
                </p>
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

      {/* Proposal Creation Modal */}
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