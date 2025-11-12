import React, { useState } from 'react';
import { X, Loader2, TrendingDown, AlertCircle, DollarSign } from 'lucide-react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';

const SellSharesModal = ({ isOpen, onClose, asset, onSellComplete }) => {
  const { tokenization } = useContract();
  const { address } = useWeb3();
  const { showNotification } = useApp();
  
  const [amount, setAmount] = useState('');
  const [selling, setSelling] = useState(false);
  
  const maxShares = parseInt(asset?.shares || 0);
  const pricePerShare = parseFloat(asset?.pricePerShare || 0);
  const totalValue = amount ? (parseInt(amount) * pricePerShare).toFixed(2) : '0.00';
  
  // Calculate platform fee (2.5%)
  const platformFee = (totalValue * 0.025).toFixed(2);
  const netProceeds = (totalValue - platformFee).toFixed(2);

  const handleSell = async () => {
    if (!amount || parseInt(amount) <= 0) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }

    if (parseInt(amount) > maxShares) {
      showNotification('Amount exceeds your holdings', 'error');
      return;
    }

    setSelling(true);
    try {
      // Call smart contract to sell shares
      const tx = await tokenization.sellShares(
        asset.assetId,
        amount
      );
      
      await tx.wait();
      
      showNotification(
        `Successfully sold ${amount} shares for ${netProceeds} OPN`,
        'success'
      );
      
      onSellComplete();
      onClose();
    } catch (error) {
      console.error('Error selling shares:', error);
      showNotification('Failed to sell shares', 'error');
    } finally {
      setSelling(false);
    }
  };

  const handleQuickAmount = (percentage) => {
    const shareAmount = Math.floor(maxShares * (percentage / 100));
    setAmount(shareAmount.toString());
  };

  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-black border border-neutral-800 rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Sell Shares</h2>
              <p className="text-sm text-neutral-400 mt-1">{asset.assetName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-900 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Holdings */}
          <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-neutral-400">Your Holdings</span>
              <span className="text-lg font-semibold text-white">{maxShares} shares</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Current Value</span>
              <span className="text-lg font-semibold text-green-400">
                {(maxShares * pricePerShare).toFixed(2)} OPN
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Shares to Sell
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={maxShares}
              min="1"
              className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-neutral-700"
              placeholder="Enter amount"
            />
            
            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[25, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  onClick={() => handleQuickAmount(pct)}
                  className="py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-xs text-white transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Transaction Summary */}
          {amount && parseInt(amount) > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Gross Proceeds</span>
                <span className="text-white">{totalValue} OPN</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Platform Fee (2.5%)</span>
                <span className="text-red-400">-{platformFee} OPN</span>
              </div>
              <div className="pt-3 border-t border-neutral-800 flex justify-between">
                <span className="text-white font-medium">Net Proceeds</span>
                <span className="text-green-400 font-semibold text-lg">{netProceeds} OPN</span>
              </div>
            </div>
          )}

          {/* Warning for selling all shares */}
          {amount && parseInt(amount) === maxShares && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-500 font-medium">Selling All Shares</p>
                  <p className="text-xs text-yellow-400 mt-1">
                    Your ownership NFT will be returned to the contract
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sell Button */}
          <button
            onClick={handleSell}
            disabled={!amount || parseInt(amount) <= 0 || parseInt(amount) > maxShares || selling}
            className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {selling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing Sale...
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4" />
                Sell {amount || '0'} Shares
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellSharesModal;