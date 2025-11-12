// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Web3Provider } from './contexts/Web3Context';
import { AppProvider } from './contexts/AppContext';
import Sidebar from './components/layout/sidebar';
import Notification from './components/common/Notification';
import MarketplaceView from './components/marketplace/MarketplaceView';
import PropertyView from './components/property/PropertyView';
import CreateView from './components/create/CreateView';
import PortfolioView from './components/portfolio/PortfolioView';
import ComplianceView from './components/compliance/ComplianceView';
import LandingPage from './components/landing/LandingPage';
// WalletConnect is handled by AppKit's w3m-button


// Import AppKit configuration - this initializes AppKit
import './config/appkit';

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeView, setActiveView] = useState('marketplace');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Add this state

  // Check screen size on mount and set sidebar state accordingly
  useEffect(() => {
    const checkScreenSize = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      setIsSidebarCollapsed(isMobile);
    };

    // Check on mount
    checkScreenSize();

    // Optional: Add resize listener to handle window resize
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  if (showLanding) {
    return <LandingPage onEnterApp={() => setShowLanding(false)} />;
  }

  return (
    <Web3Provider>
      <AppProvider>
        
        
        {/* Hamburger Button - At root level */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`${isMobileMenuOpen ? 'hidden' : 'block'} lg:hidden`}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(4px)',
            padding: '8px',
            border: '1px solid rgb(38, 38, 38)',
            borderRadius: '4px'
          }}
        >
          <Menu className="w-6 h-6 text-white" />
        </button>
        
        <div className="flex min-h-screen bg-black">
          {/* Pass the mobile menu state to Sidebar */}
          <Sidebar 
            isCollapsed={isSidebarCollapsed} 
            toggleSidebar={toggleSidebar}
            activeView={activeView}
            setActiveView={setActiveView}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
          
          {/* Main Content Area */}
          <div className={`
            flex-1 transition-all duration-300 ease-in-out
            ml-0 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
          `}>
            <main className="flex-1">
              {activeView === 'marketplace' && <MarketplaceView />}
              {activeView === 'property' && <PropertyView />}
              {activeView === 'create' && <CreateView />}
              {activeView === 'portfolio' && <PortfolioView />}
              {activeView === 'compliance' && <ComplianceView />}
            </main>
          </div>
        </div>
        
        <Notification />
      </AppProvider>
    </Web3Provider>
  );
}