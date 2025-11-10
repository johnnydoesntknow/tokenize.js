/* @refresh reset */
// src/contexts/AppContext.jsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import { useWeb3 } from './Web3Context';
import { useContract } from '../hooks/useContract';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { address, isConnected } = useWeb3();
  const { fractionalization, kyc } = useContract();
  
  const [assets, setAssets] = useState([]);
  // AUTO-VERIFY EVERYONE - Just set KYC to true always
  const [userKYCStatus, setUserKYCStatus] = useState(true); // Changed to always true
  const [isComplianceOfficer, setIsComplianceOfficer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Skip actual KYC check - everyone is automatically verified
  useEffect(() => {
    // Just set everyone as KYC verified automatically
    if (address && isConnected) {
      setUserKYCStatus(true);
    }
  }, [address, isConnected]);

  // Keep compliance role check but it won't be used since tab is hidden
  useEffect(() => {
    const checkComplianceRole = async () => {
      if (!fractionalization || !address || !isConnected) {
        setIsComplianceOfficer(false);
        return;
      }

      try {
        const COMPLIANCE_ROLE = await fractionalization.COMPLIANCE_ROLE();
        const hasRole = await fractionalization.hasRole(COMPLIANCE_ROLE, address);
        setIsComplianceOfficer(hasRole);
      } catch (error) {
        console.error('Error checking compliance role:', error);
        setIsComplianceOfficer(false);
      }
    };

    checkComplianceRole();
  }, [fractionalization, address, isConnected]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <AppContext.Provider value={{
      assets,
      setAssets,
      userKYCStatus, // Always returns true now
      setUserKYCStatus,
      isComplianceOfficer,
      setIsComplianceOfficer,
      loading,
      setLoading,
      notification,
      showNotification
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};