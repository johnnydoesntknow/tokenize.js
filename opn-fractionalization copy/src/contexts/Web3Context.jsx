// src/contexts/Web3Context.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAppKitProvider, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { ethers } from "ethers";

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const { address, isConnected, caipAddress, status } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");
  const { caipNetwork, caipNetworkId, chainId } = useAppKitNetwork();
  
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);

  // Update provider and signer when wallet connects
  useEffect(() => {
    const setupProvider = async () => {
      if (isConnected && walletProvider) {
        try {
          const ethersProvider = new ethers.providers.Web3Provider(walletProvider);
          const ethersSigner = ethersProvider.getSigner();
          
          setProvider(ethersProvider);
          setSigner(ethersSigner);
          
          // Get balance
          const balanceWei = await ethersProvider.getBalance(address);
          const balanceEth = ethers.utils.formatEther(balanceWei);
          setBalance(parseFloat(balanceEth).toFixed(4));
        } catch (error) {
          console.error('Error setting up provider:', error);
        }
      } else {
        setProvider(null);
        setSigner(null);
        setBalance('0');
      }
    };

    setupProvider();
  }, [isConnected, walletProvider, address]);

  // Listen for account changes
  useEffect(() => {
    if (walletProvider) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // User disconnected
          setProvider(null);
          setSigner(null);
          setBalance('0');
        }
      };

      const handleChainChanged = () => {
        // Reload the page on chain change
        window.location.reload();
      };

      if (walletProvider.on) {
        walletProvider.on('accountsChanged', handleAccountsChanged);
        walletProvider.on('chainChanged', handleChainChanged);

        return () => {
          walletProvider.removeListener('accountsChanged', handleAccountsChanged);
          walletProvider.removeListener('chainChanged', handleChainChanged);
        };
      }
    }
  }, [walletProvider]);

  // Helper function to get contract instance
  const getContract = async (address, abi) => {
    if (!signer) throw new Error('No signer available');
    return new ethers.Contract(address, abi, signer);
  };

  // Helper function to send transaction
  const sendTransaction = async (to, value = '0', data = '0x') => {
    if (!signer) throw new Error('No signer available');
    
    const tx = {
      to,
      value: ethers.utils.parseEther(value),
      data
    };

    return await signer.sendTransaction(tx);
  };

  return (
    <Web3Context.Provider value={{
      address,
      isConnected,
      chainId,
      provider,
      signer,
      balance,
      loading,
      setLoading,
      getContract,
      sendTransaction,
      status,
      caipNetwork,
      caipNetworkId
    }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};