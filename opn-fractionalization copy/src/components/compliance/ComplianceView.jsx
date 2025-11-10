// src/components/compliance/ComplianceView.jsx
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';
import { ethers } from 'ethers';
import { Check, X, FileText, Loader2, AlertCircle } from 'lucide-react';

const ComplianceView = () => {
  const { isConnected, address } = useWeb3();
  const { fractionalization } = useContract();
  const { showNotification } = useApp();
  
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isComplianceOfficer, setIsComplianceOfficer] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Check if user has compliance role
  useEffect(() => {
    const checkRole = async () => {
      if (!fractionalization || !address || !isConnected) {
        setLoading(false);
        return;
      }

      try {
        const COMPLIANCE_ROLE = await fractionalization.COMPLIANCE_ROLE();
        const hasRole = await fractionalization.hasRole(COMPLIANCE_ROLE, address);
        setIsComplianceOfficer(hasRole);
        
        if (!hasRole) {
          setLoading(false);
          return;
        }

        // Fetch pending requests if user has compliance role
        await fetchPendingRequests();
      } catch (error) {
        console.error('Error checking role:', error);
        setIsComplianceOfficer(false);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [fractionalization, address, isConnected]);

  const fetchPendingRequests = async () => {
    try {
      const pendingIds = await fractionalization.getPendingRequests();
      
      const requestsData = await Promise.all(
        pendingIds.map(async (requestId) => {
          const request = await fractionalization.requests(requestId);
          return {
            requestId: requestId.toString(),
            proposer: request.proposer,
            assetType: request.assetType,
            assetName: request.assetName,
            assetDescription: request.assetDescription,
            assetImageUrl: request.assetImageUrl,
            totalFractions: request.totalFractions.toString(),
            pricePerFraction: ethers.utils.formatEther(request.pricePerFraction),
            requiresPurchaserKYC: request.requiresPurchaserKYC,
            timestamp: new Date(request.timestamp.toNumber() * 1000).toLocaleDateString()
          };
        })
      );

      setPendingRequests(requestsData);
    } catch (error) {
      console.error('Error fetching requests:', error);
      showNotification('Failed to fetch pending requests', 'error');
    }
  };

  const handleApprove = async (requestId) => {
    try {
      setProcessingId(requestId);
      const tx = await fractionalization.approveRequest(requestId);
      await tx.wait();
      
      showNotification(`Request #${requestId} approved successfully!`, 'success');
      await fetchPendingRequests(); // Refresh the list
    } catch (error) {
      console.error('Approval error:', error);
      showNotification('Failed to approve request', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setProcessingId(requestId);
      const tx = await fractionalization.rejectRequest(requestId, reason);
      await tx.wait();
      
      showNotification(`Request #${requestId} rejected`, 'error');
      await fetchPendingRequests(); // Refresh the list
    } catch (error) {
      console.error('Rejection error:', error);
      showNotification('Failed to reject request', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="heading-2 text-white mb-4">Connect Your Wallet</h2>
          <p className="body-text">Connect your wallet to access compliance features</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!isComplianceOfficer) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
          <h2 className="heading-2 text-white mb-4">Access Restricted</h2>
          <p className="body-text mb-2">
            This section is only accessible to compliance officers.
          </p>
          <p className="text-sm text-neutral-500">
            Connected as: {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="mb-12">
        <h1 className="text-4xl font-light text-white mb-2">Compliance</h1>
        <p className="text-neutral-400 font-light">
          Review and manage fractionalization requests
        </p>
        </div>
        {pendingRequests.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-neutral-500 text-lg font-light">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingRequests.map((request) => (
              <div key={request.requestId} className="card p-8">
                <div className="flex items-start space-x-8">
                  <img 
                    src={request.assetImageUrl} 
                    alt={request.assetName}
                    className="w-32 h-32 object-cover rounded-sm"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1560707303-4e980ce876ad?w=800&q=80';
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <p className="label-text mb-2">{request.assetType}</p>
                        <h3 className="text-xl font-normal text-white mb-2">{request.assetName}</h3>
                        <p className="text-neutral-500 text-sm max-w-2xl">{request.assetDescription}</p>
                      </div>
                      <span className="px-3 py-1 text-xs uppercase tracking-wider rounded-sm 
                                     bg-yellow-900/20 text-yellow-200 border border-yellow-900/50">
                        Pending
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-8 mb-8">
                      <div>
                        <p className="label-text mb-1">Proposer</p>
                        <p className="text-white font-mono text-sm">
                          {request.proposer.slice(0, 6)}...{request.proposer.slice(-4)}
                        </p>
                      </div>
                      <div>
                        <p className="label-text mb-1">Fractions</p>
                        <p className="text-white">{request.totalFractions}</p>
                      </div>
                      <div>
                        <p className="label-text mb-1">Price/Fraction</p>
                        <p className="text-white">{request.pricePerFraction} OPN</p>
                      </div>
                      <div>
                        <p className="label-text mb-1">KYC Required</p>
                        <p className="text-white">{request.requiresPurchaserKYC ? 'Yes' : 'No'}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleApprove(request.requestId)}
                        disabled={processingId === request.requestId}
                        className="btn-primary flex items-center space-x-2"
                      >
                        {processingId === request.requestId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>Approve</span>
                      </button>
                      
                      <button
                        onClick={() => handleReject(request.requestId)}
                        disabled={processingId === request.requestId}
                        className="btn-secondary flex items-center space-x-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>

                      <button className="text-neutral-500 hover:text-white transition-colors 
                                       flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>View Documents</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceView;