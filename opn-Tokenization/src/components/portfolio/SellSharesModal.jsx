// src/components/portfolio/SellSharesModal.jsx
// FIXED VERSION - Robust totalAssetValue calculation

import React, { useState, useMemo, useEffect } from 'react';
import { X, Loader2, TrendingDown, AlertCircle, DollarSign, Shield } from 'lucide-react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';

const SellSharesModal = ({ isOpen, onClose, asset, onSellComplete }) => {
  const { secondaryMarket, positionNFT } = useContract();
  const { address } = useWeb3();
  const { showNotification } = useApp();
  
  const [amount, setAmount] = useState('');
  const [selling, setSelling] = useState(false);
  const [listingPrice, setListingPrice] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [checkingApproval, setCheckingApproval] = useState(true);
  const [approving, setApproving] = useState(false);
  
  // Determine if this is a weighted model asset
  const isWeighted = useMemo(() => {
    return asset?.model === 1 || asset?.model === 'WEIGHTED';
  }, [asset]);
  
  // Calculate holdings based on model
  const { maxAmount, displayAmount, unitLabel, totalAssetValue } = useMemo(() => {
    if (!asset) return { maxAmount: 0, displayAmount: '0', unitLabel: 'shares', totalAssetValue: 0 };
    
    const shares = parseFloat(asset.shares || 0);
    
    if (isWeighted) {
      // ✅ FIXED: Convert wei-units to percentage
      const percentageOwned = parseFloat(ethers.utils.formatUnits(shares.toString(), 16));
      
      // ✅ ROBUST: Try multiple ways to get total asset value
      let assetValue = 0;
      
      // Try 1: asset.totalValue (could be BigNumber, string, or number from PortfolioView)
      if (asset.totalValue) {
        if (ethers.BigNumber.isBigNumber(asset.totalValue)) {
          // It's a BigNumber from blockchain - this is the TOTAL asset value
          assetValue = parseFloat(ethers.utils.formatEther(asset.totalValue));
        } else {
          // It's a number/string from PortfolioView - this is the USER'S value, not total!
          // Skip this and let Try 3 calculate the total
          console.log('⚠️ asset.totalValue is user position value, not total asset value');
        }
      }
      
      // Try 2: asset.currentValue (might be a number)
      if (assetValue === 0 && asset.currentValue) {
        assetValue = parseFloat(asset.currentValue);
      }
      
      // Try 3: Calculate from percentage owned and user's position value
      if (assetValue === 0 && percentageOwned > 0) {
        // User's position value is in asset.totalValue (confusing name!)
        // If user owns 0.010% worth 10 OPN, total = (10 / 0.010) * 100 = 100,000
        const userPositionValue = parseFloat(asset.totalValue || asset.currentValue || 0);
        if (userPositionValue > 0) {
          assetValue = (userPositionValue / percentageOwned) * 100;
        }
      }
      
      console.log('🔍 SellSharesModal - Asset Value Calculation:', {
        percentageOwned,
        assetValue,
        asset_totalValue: asset.totalValue?.toString(),
        asset_currentValue: asset.currentValue
      });
      
      return {
        maxAmount: percentageOwned,
        displayAmount: percentageOwned.toFixed(3) + '%',
        unitLabel: '% ownership',
        totalAssetValue: assetValue
      };
    } else {
      // FIXED MODEL
      const pricePerShare = parseFloat(asset.pricePerShare || 0);
      
      return {
        maxAmount: shares,
        displayAmount: shares.toString(),
        unitLabel: 'shares',
        totalAssetValue: shares * pricePerShare
      };
    }
  }, [asset, isWeighted]);
  
  // Check if SecondaryMarket is approved
  useEffect(() => {
    const checkApproval = async () => {
      if (!positionNFT || !secondaryMarket || !address || !isOpen) {
        setCheckingApproval(false);
        return;
      }

      try {
        setCheckingApproval(true);
        const approved = await positionNFT.isApprovedForAll(address, secondaryMarket.address);
        setIsApproved(approved);
      } catch (error) {
        console.error('Error checking approval:', error);
        setIsApproved(false);
      } finally {
        setCheckingApproval(false);
      }
    };

    checkApproval();
  }, [positionNFT, secondaryMarket, address, isOpen]);
  
  // Calculate value based on amount entered
  const calculatedValue = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return '0.00';
    
    if (isWeighted) {
      // ✅ FIXED: Calculate value as percentage of total asset value
      const percentageAmount = parseFloat(amount);
      
      if (totalAssetValue === 0) {
        console.warn('⚠️ Total asset value is 0, cannot calculate listing value');
        return '0.00';
      }
      
      const value = (percentageAmount / 100) * totalAssetValue;
      
      console.log('💰 Calculated Value:', {
        percentageAmount,
        totalAssetValue,
        calculatedValue: value
      });
      
      return value.toFixed(2);
    } else {
      // FIXED MODEL
      const pricePerShare = parseFloat(asset?.pricePerShare || 0);
      return (parseFloat(amount) * pricePerShare).toFixed(2);
    }
  }, [amount, isWeighted, totalAssetValue, asset]);

  // Handle approval
  const handleApprove = async () => {
    if (!positionNFT || !secondaryMarket) {
      showNotification('Contracts not loaded', 'error');
      return;
    }

    try {
      setApproving(true);
      
      const tx = await positionNFT.setApprovalForAll(secondaryMarket.address, true);
      showNotification('Approval transaction sent...', 'info');
      
      await tx.wait();
      
      setIsApproved(true);
      showNotification('✅ Marketplace approved! You can now list your position.', 'success');
    } catch (error) {
      console.error('Approval error:', error);
      if (error.code === 'ACTION_REJECTED') {
        showNotification('Approval cancelled', 'info');
      } else {
        showNotification('Failed to approve marketplace: ' + error.message, 'error');
      }
    } finally {
      setApproving(false);
    }
  };

  // Handle listing
  const handleList = async () => {
    if (!amount || !listingPrice) {
      showNotification('Please enter amount and price', 'error');
      return;
    }

    if (parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount) {
      showNotification('Invalid amount', 'error');
      return;
    }

    if (parseFloat(listingPrice) <= 0) {
      showNotification('Price must be greater than 0', 'error');
      return;
    }

    if (!isApproved) {
      showNotification('Please approve the marketplace first', 'error');
      return;
    }

    try {
      setSelling(true);

      // Get the position ID to list
      const positionId = asset.positionIds?.[0];
      if (!positionId) {
        throw new Error('No position ID found');
      }

      // ✅ FIXED: Convert amount to proper format
      let amountToList;
      if (isWeighted) {
        // User enters percentage (e.g., 0.010), convert to wei-units
        amountToList = ethers.utils.parseUnits(amount.toString(), 16);
        console.log('📤 Listing wei-units:', amountToList.toString());
      } else {
        amountToList = Math.floor(parseFloat(amount));
      }

      const priceInWei = ethers.utils.parseEther(listingPrice);

      const tx = await secondaryMarket.listPosition(
        positionId,
        amountToList,
        priceInWei
      );

      showNotification('Listing transaction sent...', 'info');
      await tx.wait();

      showNotification(
        `✅ Successfully listed ${amount} ${unitLabel} for ${listingPrice} OPN!`,
        'success'
      );

      if (onSellComplete) {
        onSellComplete();
      }

      onClose();
    } catch (error) {
      console.error('Listing error:', error);
      if (error.code === 'ACTION_REJECTED') {
        showNotification('Listing cancelled', 'info');
      } else {
        showNotification('Failed to list position: ' + error.message, 'error');
      }
    } finally {
      setSelling(false);
    }
  };

  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-black border border-neutral-900 rounded-sm max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-900">
          <h2 className="text-xl font-semibold text-white">List for Sale</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Asset Info */}
          <div>
            <p className="text-xs font-normal uppercase tracking-wider text-neutral-500 mb-1">
              {asset.assetType}
            </p>
            <h3 className="text-lg font-semibold text-white">{asset.assetName}</h3>
            <p className="text-sm text-neutral-400 mt-1">
              You own: {displayAmount}
            </p>
          </div>

          {/* Approval Status */}
          {checkingApproval ? (
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
                <p className="text-sm text-neutral-400">Checking marketplace approval...</p>
              </div>
            </div>
          ) : !isApproved ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-500 mb-1">
                    Approval Required
                  </p>
                  <p className="text-xs text-neutral-400 mb-3">
                    You need to approve the marketplace to transfer your NFT position when someone buys it. This is a one-time approval.
                  </p>
                  <button
                    onClick={handleApprove}
                    disabled={approving}
                    className="w-full px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {approving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Approve Marketplace
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <p className="text-sm text-green-500">Marketplace approved ✓</p>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">
              Amount to Sell
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={isWeighted ? "0.1" : "1"}
                step={isWeighted ? "0.001" : "1"}
                min="0"
                max={maxAmount}
                disabled={!isApproved}
                className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-neutral-700 disabled:opacity-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                {isWeighted ? '%' : 'shares'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Max: {displayAmount}
            </p>
          </div>

          {/* Price Input */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">
              Listing Price (Total)
            </label>
            <div className="relative">
              <input
                type="number"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={!isApproved}
                className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-neutral-700 disabled:opacity-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                OPN
              </span>
            </div>
            {amount && (
              <p className="text-xs text-neutral-500 mt-1">
                Current value: ~{calculatedValue} OPN
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleList}
              disabled={selling || !isApproved || !amount || !listingPrice}
              className="flex-1 px-4 py-3 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {selling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Listing...
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4" />
                  List for Sale
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellSharesModal;