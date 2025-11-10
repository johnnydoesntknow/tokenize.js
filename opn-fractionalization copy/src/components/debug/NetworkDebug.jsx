// src/components/debug/NetworkDebug.jsx
import React, { useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useAppKitNetwork } from "@reown/appkit/react";
import { CONTRACTS } from '../../utils/contracts';

const NetworkDebug = () => {
  const { address, isConnected, chainId, provider } = useWeb3();
  const { fractionalization, kyc } = useContract();
  const network = useAppKitNetwork();

  useEffect(() => {
    console.log('Network Debug Info:', {
      walletAddress: address,
      isConnected,
      chainId,
      networkChainId: network?.chainId,
      caipNetworkId: network?.caipNetworkId,
      hasProvider: !!provider,
      hasFractionalization: !!fractionalization,
      hasKyc: !!kyc,
      contractAddresses: CONTRACTS[chainId === 984 ? 'opn' : 'mainnet']
    });

    // Try to get network info from provider
    if (provider) {
      provider.getNetwork().then(net => {
        console.log('Provider network:', net);
      }).catch(err => {
        console.error('Error getting network:', err);
      });
    }
  }, [address, isConnected, chainId, provider, fractionalization, kyc, network]);

  return (
    <div className="fixed bottom-20 right-4 bg-black border border-neutral-800 rounded-sm p-4 max-w-sm text-xs font-mono">
      <h3 className="text-white mb-2">Network Debug</h3>
      <div className="space-y-1 text-neutral-400">
        <p>Chain ID: {chainId || 'null'}</p>
        <p>Expected: 984 (OPN)</p>
        <p>Contracts: {fractionalization ? '✅' : '❌'}</p>
        <p>Provider: {provider ? '✅' : '❌'}</p>
      </div>
    </div>
  );
};

export default NetworkDebug;