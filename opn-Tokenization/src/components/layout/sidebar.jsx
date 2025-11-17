// src/components/layout/sidebar.jsx
// FIXED - Wallet connect now works with window.appKit.open()
import React, { useState, useEffect } from 'react';
import { 
  Home, Package, PlusCircle, Briefcase, Shield, Users, ShoppingBag,
  ChevronLeft, ChevronRight, Wallet, Copy, ExternalLink, LogOut, X, Check
} from 'lucide-react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useAppKitAccount } from "@reown/appkit/react";
import { ethers } from 'ethers';

const Sidebar = ({ isCollapsed, toggleSidebar, activeView, setActiveView, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { address, isConnected, signer, isAdminUser } = useWeb3();
  const { status } = useAppKitAccount(); // Get connection status from AppKit
  const { assetRegistry } = useContract();
  const [balance, setBalance] = useState('0');
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isContractAdmin, setIsContractAdmin] = useState(false);

  // Close mobile menu when view changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeView, setIsMobileMenuOpen]);

  // Check if user is admin via smart contract
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!assetRegistry || !address || !isConnected) {
        setIsContractAdmin(false);
        return;
      }

      try {
        const admins = await assetRegistry.getAllAdmins();
        const isAdmin = admins.some(admin => admin.toLowerCase() === address.toLowerCase());
        setIsContractAdmin(isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsContractAdmin(false);
      }
    };

    checkAdminStatus();
  }, [assetRegistry, address, isConnected]);

  // Fetch balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (isConnected && signer && address) {
        try {
          const balanceWei = await signer.getBalance();
          const balanceEth = ethers.utils.formatEther(balanceWei);
          setBalance(parseFloat(balanceEth).toFixed(2));
        } catch (error) {
          console.error('Error fetching balance:', error);
          setBalance('0');
        }
      }
    };
    
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [isConnected, signer, address]);

  // Build navigation based on admin status
  const navigation = [
    { id: 'marketplace', label: 'Primary Market', icon: Home, description: 'New assets' },
    { id: 'secondary', label: 'P2P Market', icon: ShoppingBag, description: 'Buy from users' },
    { id: 'property', label: 'Properties', icon: Package, description: 'Asset details' },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase, description: 'Your holdings' },
    // Only show Create/Tokenize for admin users
    ...(isAdminUser || isContractAdmin ? [
      { id: 'create', label: 'Tokenize', icon: PlusCircle, description: 'Create assets', adminOnly: true }
    ] : []),
    // Add Admin Management for contract admins
    ...(isContractAdmin ? [
      { id: 'admin', label: 'Admin', icon: Shield, description: 'Admin panel', adminOnly: true }
    ] : [])
  ];

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const openExplorer = () => {
    if (!address) return;
    window.open(`https://explorer.cor3innovations.io/address/${address}`, '_blank');
  };

  const disconnect = async () => {
    // Disconnect wallet via AppKit
    if (window.appKit) {
      await window.appKit.disconnect();
      setShowWalletMenu(false);
    }
  };

  const triggerWalletConnect = () => {
    // ✅ FIXED: Trigger AppKit modal directly
    if (window.appKit) {
      window.appKit.open();
    } else {
      console.error('AppKit not initialized - check that appkit.js is imported');
    }
  };

  return (
    <>
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-black border-r border-neutral-900
          transition-all duration-300 ease-in-out z-40
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 hover:bg-neutral-900 rounded-sm transition-colors"
        >
          <X className="w-5 h-5 text-neutral-400" />
        </button>

        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-900">
          {!isCollapsed && (
            <span className="text-lg font-semibold text-white tracking-tight">
              OPN
            </span>
          )}
          <button
            onClick={toggleSidebar}
            className="hidden md:block p-1.5 hover:bg-neutral-900 rounded-sm transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-neutral-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-sm
                  transition-all duration-150
                  ${isActive 
                    ? 'bg-neutral-900 text-white' 
                    : 'text-neutral-400 hover:bg-neutral-900/50 hover:text-white'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-normal">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Wallet Section - ALWAYS VISIBLE */}
        <div className="border-t border-neutral-900 p-3">
          {isConnected && address ? (
            // Connected: Show wallet info
            <>
              <button
                onClick={() => setShowWalletMenu(!showWalletMenu)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-neutral-900/50 transition-colors"
              >
                <Wallet className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="text-xs font-normal text-white">
                      {formatAddress(address)}
                    </div>
                    <div className="text-xs font-light text-neutral-500">
                      {balance} OPN
                    </div>
                  </div>
                )}
              </button>

              {/* Wallet Menu */}
              {showWalletMenu && !isCollapsed && (
                <div className="mt-2 bg-neutral-900 rounded-sm overflow-hidden">
                  <button
                    onClick={copyAddress}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Address'}
                  </button>
                  <button
                    onClick={openExplorer}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Explorer
                  </button>
                  <button
                    onClick={disconnect}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-neutral-800 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>
              )}
            </>
          ) : status === 'connecting' ? (
            // Connecting: Show loading state
            <div className="flex items-center justify-center py-3">
              {!isCollapsed ? (
                <div className="text-center w-full">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto mb-1"></div>
                  <p className="text-xs text-neutral-500">Connecting...</p>
                </div>
              ) : (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              )}
            </div>
          ) : (
            // Disconnected: Show connect button
            <button
              onClick={triggerWalletConnect}
              className={`
                w-full flex items-center gap-2 px-3 py-2.5 
                bg-white text-black hover:bg-neutral-200 
                transition-colors rounded-sm font-normal text-sm
                ${isCollapsed ? 'justify-center' : ''}
              `}
              title={isCollapsed ? 'Connect Wallet' : ''}
            >
              <Wallet className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>Connect Wallet</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-30"
        />
      )}
    </>
  );
};

export default Sidebar;