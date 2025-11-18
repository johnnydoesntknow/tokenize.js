// src/config/admin.js

// Admin wallet addresses (lowercase)
export const ADMIN_ADDRESSES = [
  '0xd715011858545620e23ac58db8c9c1be212a41e5', // Your admin wallet
  // Add more admin addresses here as needed
].map(addr => addr.toLowerCase());

// Check if an address is admin
export const isAdmin = (address) => {
  if (!address) return false;
  return ADMIN_ADDRESSES.includes(address.toLowerCase());
};