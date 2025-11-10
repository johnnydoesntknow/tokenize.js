// src/components/debug/ManualRoleCheck.jsx
import React, { useState } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { ethers } from 'ethers';
import { FRACTIONALIZATION_ABI, CONTRACTS } from '../../utils/contracts';

const ManualRoleCheck = () => {
  const { signer, chainId, address, isConnected } = useWeb3();
  const [roleStatus, setRoleStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkRole = async () => {
    if (!signer || !address) {
      setRoleStatus('No signer or address');
      return;
    }

    setChecking(true);
    try {
      // Manually create contract instance
      const contractAddress = '0xE63c3D97e3cab05Ff717491A757Eb37b77Ee086d';
      const contract = new ethers.Contract(contractAddress, FRACTIONALIZATION_ABI, signer);
      
      // Get COMPLIANCE_ROLE
      const COMPLIANCE_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("COMPLIANCE_ROLE"));
      console.log('COMPLIANCE_ROLE hash:', COMPLIANCE_ROLE);
      
      // Check if address has role
      const hasRole = await contract.hasRole(COMPLIANCE_ROLE, address);
      console.log('Has role result:', hasRole);
      
      setRoleStatus(`Has Compliance Role: ${hasRole ? '✅ YES' : '❌ NO'}`);
    } catch (error) {
      console.error('Manual check error:', error);
      setRoleStatus(`Error: ${error.message}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed top-24 right-4 bg-black border border-neutral-800 rounded-sm p-4 max-w-sm">
      <h3 className="text-white mb-2 font-mono text-xs">Manual Role Check</h3>
      <div className="space-y-2 text-xs font-mono">
        <p className="text-neutral-400">Chain: {chainId}</p>
        <p className="text-neutral-400">Connected: {isConnected ? '✅' : '❌'}</p>
        <p className="text-neutral-400">Address: {address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'none'}</p>
        <button 
          onClick={checkRole}
          disabled={checking || !isConnected}
          className="bg-white text-black px-3 py-1 rounded text-xs disabled:opacity-50"
        >
          {checking ? 'Checking...' : 'Check Role'}
        </button>
        {roleStatus && (
          <p className="text-green-400 mt-2">{roleStatus}</p>
        )}
      </div>
    </div>
  );
};

export default ManualRoleCheck;