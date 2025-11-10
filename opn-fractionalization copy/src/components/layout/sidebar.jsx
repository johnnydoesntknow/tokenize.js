// src/components/layout/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { 
  Home, Package, PlusCircle, Briefcase, Shield, 
  ChevronLeft, ChevronRight, Wallet, Copy, ExternalLink, LogOut, X
} from 'lucide-react';
import { useWeb3 } from '../../contexts/Web3Context';
import { ethers } from 'ethers';

const Sidebar = ({ isCollapsed, toggleSidebar, activeView, setActiveView, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { address, isConnected, signer } = useWeb3();
  const [balance, setBalance] = useState('0');
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // Close mobile menu when view changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeView, setIsMobileMenuOpen]);

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

  const navigation = [
    { id: 'marketplace', label: 'Marketplace', icon: Home, description: 'Browse assets' },
    { id: 'property', label: 'Properties', icon: Package, description: 'Asset details' },
    { id: 'create', label: 'Tokenize', icon: PlusCircle, description: 'Create fractions' },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase, description: 'Your holdings' },
  ];

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    if (window.appKit) {
      await window.appKit.disconnect();
      setShowWalletMenu(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full bg-black border-r border-neutral-900 z-50
        transition-all duration-300
        lg:z-40
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        ${isMobileMenuOpen 
          ? 'w-64 translate-x-0' 
          : 'w-64 -translate-x-full lg:translate-x-0'
        }
      `}>
        {/* Close button for mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 lg:hidden z-50 text-white hover:text-neutral-300"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Logo Section */}
        <div className={`p-6 border-b border-neutral-900 ${isCollapsed && !isMobileMenuOpen ? 'lg:px-2' : ''}`}>
          <div className={`flex items-center ${isCollapsed && !isMobileMenuOpen ? 'lg:justify-center' : 'gap-3'}`}>
            <div className="w-10 h-10 relative rounded-sm overflow-hidden bg-black shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-900/50 to-transparent pointer-events-none" />
              <img 
                src="/iopn.jpg" 
                alt="IOPN Logo" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-sm pointer-events-none" />
            </div>
            {(!isCollapsed || isMobileMenuOpen) && (
              <div>
                <h1 className="text-white font-semibold text-lg tracking-tight">OPN</h1>
                <p className="text-neutral-500 text-xs font-light">Fractionalize</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-6">
          <ul className="space-y-1 px-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveView(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center px-3 py-3
                      transition-all duration-200 group
                      ${isActive 
                        ? 'bg-neutral-900 text-white border-l-2 border-white' 
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                      }
                    `}
                    title={isCollapsed && !isMobileMenuOpen ? item.label : ''}
                  >
                    <Icon className={`w-5 h-5 ${isCollapsed && !isMobileMenuOpen ? 'lg:mx-auto' : 'mr-3'}`} />
                    {(!isCollapsed || isMobileMenuOpen) && (
                      <div className="flex-1 text-left">
                        <p className="font-semibold">{item.label}</p>
                        <p className="text-xs opacity-60">{item.description}</p>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Wallet Section */}
        <div className="absolute bottom-20 left-0 right-0 px-3 space-y-1">
          {!isConnected ? (
            <button
              onClick={() => window.appKit?.open()}
              className={`w-full px-3 py-3 bg-neutral-900 text-white border-l-2 border-white
                         transition-all duration-200 hover:bg-neutral-800 
                         ${isCollapsed && !isMobileMenuOpen ? 'lg:flex lg:justify-center' : 'text-center'}`}
              title={isCollapsed && !isMobileMenuOpen ? 'Connect Wallet' : ''}
            >
              {isCollapsed && !isMobileMenuOpen ? (
                <Wallet className="w-5 h-5 text-neutral-400" />
              ) : (
                'Connect Wallet'
              )}
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowWalletMenu(!showWalletMenu)}
                className={`w-full px-3 py-3 bg-neutral-900 text-white border-l-2 border-white
                           transition-all duration-200 hover:bg-neutral-800
                           ${isCollapsed && !isMobileMenuOpen ? 'lg:flex lg:justify-center' : ''}`}
                title={isCollapsed && !isMobileMenuOpen ? `${address.slice(0, 6)}...${address.slice(-6)} | ${balance} OPN` : ''}
              >
                {isCollapsed && !isMobileMenuOpen ? (
                  <Wallet className="w-5 h-5 text-neutral-400" />
                ) : (
                  <div className="text-center">
                    <p className="text-base font-medium text-white">
                      {address.slice(0, 6)}...{address.slice(-6)}
                    </p>
                    <p className="text-sm text-white opacity-80 mt-1">
                      {balance} OPN
                    </p>
                  </div>
                )}
              </button>
              
              {showWalletMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowWalletMenu(false)}
                  />
                  <div className={`
                    absolute bottom-full mb-1 z-50
                    bg-black border border-neutral-800
                    ${isCollapsed && !isMobileMenuOpen
                      ? 'left-0 min-w-[200px]' 
                      : 'left-0 right-0'
                    }
                  `}>
                    {(isCollapsed && !isMobileMenuOpen) && (
                      <div className="px-3 py-3 border-b border-neutral-900">
                        <p className="text-xs text-neutral-500">Wallet</p>
                        <p className="text-sm font-medium text-white mt-1">
                          {address.slice(0, 6)}...{address.slice(-6)}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          Balance: {balance} OPN
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={copyAddress}
                      className="w-full flex items-center gap-3 px-3 py-3
                                 hover:bg-neutral-900 transition-colors text-left text-sm
                                 text-neutral-400 hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
                      <span>{copied ? 'Copied!' : 'Copy Address'}</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        window.open(`https://testnet.iopn.tech/address/${address}`, '_blank');
                        setShowWalletMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3
                                 hover:bg-neutral-900 transition-colors text-left text-sm
                                 border-t border-neutral-900
                                 text-neutral-400 hover:text-white"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View in Explorer</span>
                    </button>
                    
                    <button
                      onClick={handleDisconnect}
                      className="w-full flex items-center gap-3 px-3 py-3
                                 hover:bg-neutral-900 transition-colors text-left text-sm
                                 border-t border-neutral-900 text-red-500"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Collapse Toggle - Desktop Only */}
        <button
          onClick={toggleSidebar}
          className={`
            hidden lg:block
            absolute bottom-6 bg-neutral-900 border border-neutral-800
            p-2 transition-all duration-200
            hover:bg-neutral-800 hover:border-neutral-700
            ${isCollapsed && !isMobileMenuOpen ? 'left-1/2 -translate-x-1/2' : 'right-4'}
          `}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-neutral-400" />
          )}
        </button>
      </aside>
    </>
  );
};

export default Sidebar;