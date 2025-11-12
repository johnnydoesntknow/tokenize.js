// src/components/debug/Web3Debug.jsx
import React from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";

const Web3Debug = () => {
  const web3Context = useWeb3();
  const appKitAccount = useAppKitAccount();
  const appKitNetwork = useAppKitNetwork();

  return (
    <div className="fixed bottom-4 right-4 bg-black border border-neutral-800 rounded-sm p-4 max-w-sm text-xs font-mono">
      <h3 className="text-white mb-2">Web3 Debug</h3>
      
      <div className="space-y-1 text-neutral-400">
        <p>Web3Context:</p>
        <p className="pl-2">address: {web3Context.address || 'null'}</p>
        <p className="pl-2">isConnected: {String(web3Context.isConnected)}</p>
        <p className="pl-2">chainId: {web3Context.chainId || 'null'}</p>
        <p className="pl-2">signer: {web3Context.signer ? 'present' : 'null'}</p>
        
        <p className="mt-2">AppKit Account:</p>
        <p className="pl-2">address: {appKitAccount.address || 'null'}</p>
        <p className="pl-2">isConnected: {String(appKitAccount.isConnected)}</p>
        <p className="pl-2">status: {appKitAccount.status || 'null'}</p>
        
        <p className="mt-2">AppKit Network:</p>
        <p className="pl-2">chainId: {appKitNetwork.chainId || 'null'}</p>
        <p className="pl-2">caipNetworkId: {appKitNetwork.caipNetworkId || 'null'}</p>
      </div>
    </div>
  );
};

export default Web3Debug;