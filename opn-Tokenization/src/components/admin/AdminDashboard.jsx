// src/components/admin/AdminDashboard.jsx
// FIXED for new 5-contract architecture
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useContract } from '../../hooks/useContract';
import { ethers } from 'ethers';
import { 
  LayoutDashboard, Plus, Settings, Shield, FileText, Users,
  TrendingUp, DollarSign, Package, Loader2, Activity
} from 'lucide-react';
import AdminManagement from './AdminManagement';

const AdminDashboard = () => {
  const { isConnected, address } = useWeb3();
  // FIXED: Use assetRegistry instead of tokenization
  const { assetRegistry } = useContract();
  const [activeTab, setActiveTab] = useState('overview');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalRevenue: 0,
    totalInvestors: 0
  });

  // FIXED: Check if user is admin by checking admin list
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!assetRegistry || !address || !isConnected) {
        setLoading(false);
        return;
      }

      try {
        // FIXED: Get all admins and check if current address is in the list
        const admins = await assetRegistry.getAllAdmins();
        const adminStatus = admins.some(admin => admin.toLowerCase() === address.toLowerCase());
        setIsAdmin(adminStatus);
        
        if (adminStatus) {
          await fetchAdminStats();
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [assetRegistry, address, isConnected]);

  const fetchAdminStats = async () => {
    if (!assetRegistry) return;
    
    try {
      const result = await assetRegistry.getActiveAssets(0, 1000);
      const assetIds = result[0] || result.assetIds || [];
      
      let totalRev = 0;
      let totalInv = 0;

      for (const assetId of assetIds) {
        try {
          const asset = await assetRegistry.assets(assetId);
          totalRev += parseFloat(ethers.utils.formatEther(asset.totalRevenue || asset[18] || '0'));
          const tokensIssued = asset.soldTokens || asset.tokensIssued || asset[10] || ethers.BigNumber.from(0);
          if (tokensIssued.gt(0)) {
            totalInv += 1;
          }
        } catch (err) {
          console.error(`Error fetching asset ${assetId}:`, err);
        }
      }

      setStats({
        totalAssets: assetIds.length,
        totalRevenue: totalRev,
        totalInvestors: totalInv
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-xl font-light text-white mb-2">Wallet Not Connected</h2>
          <p className="text-neutral-400 font-light">
            Please connect your wallet to access the admin dashboard
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-light text-white mb-2">Access Denied</h2>
          <p className="text-neutral-400 font-light">
            You don't have administrator privileges
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'admins', label: 'Admin Management', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-light text-white mb-2">Admin Dashboard</h1>
          <p className="text-neutral-400 font-light">
            Manage assets, admins, and platform settings
          </p>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-black border border-neutral-900 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-normal text-neutral-500 uppercase tracking-wider">
                  Total Assets
                </h3>
                <Package className="w-5 h-5 text-neutral-500" />
              </div>
              <p className="text-3xl font-semibold text-white">{stats.totalAssets}</p>
            </div>

            <div className="bg-black border border-neutral-900 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-normal text-neutral-500 uppercase tracking-wider">
                  Total Revenue
                </h3>
                <DollarSign className="w-5 h-5 text-neutral-500" />
              </div>
              <p className="text-3xl font-semibold text-white">
                {stats.totalRevenue.toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} OPN
              </p>
            </div>

            <div className="bg-black border border-neutral-900 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-normal text-neutral-500 uppercase tracking-wider">
                  Total Investors
                </h3>
                <Users className="w-5 h-5 text-neutral-500" />
              </div>
              <p className="text-3xl font-semibold text-white">{stats.totalInvestors}</p>
            </div>
          </div>
        )}

        <div className="border-b border-neutral-900 mb-8">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 text-sm transition-all duration-300 border-b-2
                    ${activeTab === tab.id 
                      ? 'text-white border-white font-semibold' 
                      : 'text-neutral-500 border-transparent hover:text-neutral-300 font-normal'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-black border border-neutral-900 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Platform Overview</h3>
                <p className="text-neutral-400 font-light">
                  Welcome to the OPN Protocol admin dashboard. Use the tabs above to manage admins and platform settings.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black border border-neutral-900 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                  <div className="text-center py-8">
                    <Activity className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                    <p className="text-sm text-neutral-500 font-light">No recent activity</p>
                  </div>
                </div>

                <div className="bg-black border border-neutral-900 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Platform Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-400">Network</span>
                      <span className="text-sm text-white">OPN (Chain ID: 403)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-400">Status</span>
                      <span className="text-sm text-green-400">● Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-400">Version</span>
                      <span className="text-sm text-white">2.0.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admins' && (
            <div>
              <AdminManagement />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-black border border-neutral-900 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Platform Settings</h3>
              <p className="text-neutral-400 font-light">
                Platform settings configuration coming soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;