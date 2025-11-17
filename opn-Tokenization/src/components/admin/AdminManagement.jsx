// src/components/admin/AdminManagement.jsx
// FIXED for new 5-contract architecture
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { useApp } from '../../contexts/AppContext';
import { ethers } from 'ethers';
import { 
  Shield, Plus, Trash2, Loader2, Copy, Check, AlertCircle, Users 
} from 'lucide-react';

const AdminManagement = () => {
  const { address, isConnected } = useWeb3();
  // FIXED: Use assetRegistry instead of tokenization
  const { assetRegistry } = useContract();
  const { showNotification } = useApp();
  
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removingAdmin, setRemovingAdmin] = useState(null);
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!assetRegistry || !address) return;
      
      try {
        const adminList = await assetRegistry.getAllAdmins();
        const isAdmin = adminList.some(admin => admin.toLowerCase() === address.toLowerCase());
        setIsCurrentUserAdmin(isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdmin();
  }, [assetRegistry, address]);

  // Fetch all admins
  useEffect(() => {
    const fetchAdmins = async () => {
      if (!assetRegistry || !isConnected) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const adminList = await assetRegistry.getAllAdmins();
        setAdmins(adminList);
      } catch (error) {
        console.error('Error fetching admins:', error);
        showNotification('Failed to load admin list', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, [assetRegistry, isConnected, showNotification]);

  const handleAddAdmin = async () => {
    if (!assetRegistry || !newAdminAddress) return;
    
    // Basic address validation
    if (!ethers.utils.isAddress(newAdminAddress)) {
      showNotification('Invalid Ethereum address', 'error');
      return;
    }

    // Check if address is already an admin
    if (admins.some(admin => admin.toLowerCase() === newAdminAddress.toLowerCase())) {
      showNotification('Address is already an admin', 'error');
      return;
    }

    try {
      setAddingAdmin(true);
      const tx = await assetRegistry.addAdmin(newAdminAddress);
      await tx.wait();
      
      // Refresh admin list
      const adminList = await assetRegistry.getAllAdmins();
      setAdmins(adminList);
      
      setNewAdminAddress('');
      showNotification('Admin added successfully', 'success');
    } catch (error) {
      console.error('Error adding admin:', error);
      showNotification('Failed to add admin', 'error');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (adminAddress) => {
    if (!assetRegistry) return;
    
    // Prevent removing self
    if (adminAddress.toLowerCase() === address.toLowerCase()) {
      showNotification('You cannot remove yourself as admin', 'error');
      return;
    }

    // Confirm removal
    if (!window.confirm(`Are you sure you want to remove ${adminAddress.slice(0, 6)}...${adminAddress.slice(-4)} as admin?`)) {
      return;
    }

    try {
      setRemovingAdmin(adminAddress);
      const tx = await assetRegistry.removeAdmin(adminAddress);
      await tx.wait();
      
      // Refresh admin list
      const adminList = await assetRegistry.getAllAdmins();
      setAdmins(adminList);
      
      showNotification('Admin removed successfully', 'success');
    } catch (error) {
      console.error('Error removing admin:', error);
      showNotification('Failed to remove admin', 'error');
    } finally {
      setRemovingAdmin(null);
    }
  };

  const copyAddress = async (addr) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddress(addr);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatAddress = (addr) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isCurrentUserAdmin) {
    return (
      <div className="bg-black border border-neutral-900 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Access Denied</h3>
        <p className="text-neutral-400 font-light">
          You don't have permission to manage admins
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Admin Section */}
      <div className="bg-black border border-neutral-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add New Admin
        </h3>
        
        <div className="flex gap-4">
          <input
            type="text"
            value={newAdminAddress}
            onChange={(e) => setNewAdminAddress(e.target.value)}
            placeholder="Enter Ethereum address (0x...)"
            className="flex-1 bg-neutral-900 border border-neutral-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-neutral-700"
            disabled={addingAdmin}
          />
          <button
            onClick={handleAddAdmin}
            disabled={!newAdminAddress || addingAdmin}
            className="px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {addingAdmin ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Admin
              </>
            )}
          </button>
        </div>
      </div>

      {/* Admin List */}
      <div className="bg-black border border-neutral-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Current Admins ({admins.length})
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 text-neutral-500 animate-spin mx-auto" />
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-500 font-light">No admins found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => {
              const isCurrentUser = admin.toLowerCase() === address.toLowerCase();
              const isRemoving = removingAdmin === admin;
              
              return (
                <div
                  key={admin}
                  className="flex items-center justify-between p-4 bg-neutral-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-neutral-500" />
                    <div>
                      <p className="text-sm font-mono text-white">{formatAddress(admin)}</p>
                      {isCurrentUser && (
                        <p className="text-xs text-neutral-500 mt-1">You</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyAddress(admin)}
                      className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Copy address"
                    >
                      {copiedAddress === admin ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-neutral-400" />
                      )}
                    </button>

                    {!isCurrentUser && (
                      <button
                        onClick={() => handleRemoveAdmin(admin)}
                        disabled={isRemoving}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400 disabled:opacity-50"
                        title="Remove admin"
                      >
                        {isRemoving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-400 mb-1">Admin Permissions</h4>
            <p className="text-xs text-blue-300/80 font-light">
              Admins can create assets, manage other admins, and configure platform settings. 
              Be careful when granting admin access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;