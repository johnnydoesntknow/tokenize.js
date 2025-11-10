// src/config/appkit.js
import { createAppKit } from "@reown/appkit/react";
import { Ethers5Adapter } from "@reown/appkit-adapter-ethers5";
import { defineChain } from '@reown/appkit/networks';

// 1. Get projectId from Reown Dashboard
const projectId = process.env.REACT_APP_REOWN_PROJECT_ID || "92cb38a15cfb30ee3043cf276483c6f9";

const opnNetwork = defineChain({
  id: 984,
  caipNetworkId: 'eip155:123456789',
  chainNamespace: 'eip155',
  name: 'OPN Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'OPN',
    symbol: 'OPN',
  },
  rpcUrls: {
    default: {
      http: ['https://val1.iopn.pectra.zeeve.net/'],
      webSocket: ['https://val1.iopn.pectra.zeeve.net/'],
    },
  },
  blockExplorers: {
    default: { name: 'OPN Explorer', url: 'https://testnet.iopn.tech/' },
  },
  contracts: {
    // Add the contracts here
  }
})

// 2. Create metadata
const metadata = {
  name: "OPN Fractionalization",
  description: "Luxury Asset Fractionalization Platform",
  url: window.location.origin,
  icons: ["/logo.png"],
};

// 3. Create the AppKit instance with COMPLETE monochrome theming
export const appKit = createAppKit({
  adapters: [new Ethers5Adapter()],
  metadata: metadata,
  networks: [opnNetwork],
  projectId,
  features: {
    analytics: true,
    email: true,
    socials: ['google', 'apple', 'discord', 'github'],
  },
  themeMode: 'dark',
  // FIXED: Complete monochrome theme variables
themeVariables: {
    // Font - Keep Inter but update the weight system
    '--w3m-font-family': 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    '--w3m-font-size-master': '10px',
    '--w3m-font-weight': '400', // Add this for normal weight default
    
    // Z-index
    '--w3m-z-index': '999',
    
    // CRITICAL: Force ALL text to be white
    '--w3m-color-fg-1': '#ffffff',
    '--w3m-color-fg-2': '#ffffff',
    '--w3m-color-fg-3': '#ffffff',
    '--w3m-text': '#ffffff',
    '--w3m-button-text': '#ffffff',
    '--w3m-modal-button-text': '#ffffff',
    
    // Legacy text variables
    '--wck-fg-1': '#ffffff',
    '--wck-fg-2': '#ffffff', 
    '--wck-fg-3': '#ffffff',
    '--wck-button-text': '#ffffff',
    
    // Remove ALL border radius
    '--w3m-border-radius-master': '0px',
    '--w3m-background-border-radius': '0px',
    '--w3m-container-border-radius': '0px',
    '--w3m-wallet-icon-border-radius': '0px',
    '--w3m-button-border-radius': '0px',
    '--w3m-button-hover-highlight-border-radius': '0px',
    '--w3m-secondary-button-border-radius': '0px',
    '--w3m-icon-button-border-radius': '0px',
    '--w3m-input-border-radius': '0px',
    '--w3m-notification-border-radius': '0px',
    '--w3m-tag-border-radius': '0px',
    '--w3m-modal-border-radius': '0px',
    
    // Dark theme colors
    '--w3m-accent': '#171717',
    '--w3m-accent-color': '#171717',
    '--w3m-accent-fill-color': '#171717',
    '--w3m-color-mix': '#000000',
    '--w3m-color-mix-strength': '0',
    
    // Dark backgrounds
    '--w3m-color-bg-1': '#000000',
    '--w3m-color-bg-2': '#171717',
    '--w3m-color-bg-3': '#262626',
    
    // Legacy variables
    '--wck-font-family': 'Inter, sans-serif',
    '--wck-font-weight': '400',
    '--wck-accent': '#171717',
    '--wck-bg-1': '#000000',
    '--wck-bg-2': '#171717',
    '--wck-bg-3': '#262626',
    '--wck-border-1': '#171717',
    '--wck-border-radius': '0px',
    
    // Modal
    '--w3m-modal-bg': '#000000',
    '--w3m-modal-border': '#171717',
    
    // Button specific
    '--w3m-button-bg': '#171717',
    '--w3m-button-border': 'transparent',
    '--w3m-button-text': '#ffffff',
    '--w3m-button-hover-bg': '#262626',
    
    // Override blue/purple
    '--w3m-color-blue': '#171717',
    '--w3m-color-purple': '#171717',
    '--w3m-color-blue-100': '#171717',
    '--w3m-color-purple-100': '#171717',
    '--w3m-color-success': '#171717',
    '--w3m-color-error': '#737373',
    
    // Input fields
    '--w3m-input-bg': '#000000',
    '--w3m-input-border': '#171717',
    '--w3m-input-text': '#ffffff',
    
    // Additional overrides
    '--w3m-default': '#171717',
    '--w3m-inverse': '#ffffff',
}
});

// Make appKit globally accessible for custom button option
if (typeof window !== 'undefined') {
  window.appKit = appKit;
}
