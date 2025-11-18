export const mockAssets = [
  {
    requestId: 1,
    proposer: '0x1234567890123456789012345678901234567890',
    assetType: 'Luxury Watch',
    assetName: 'Patek Philippe Nautilus 5711',
    assetDescription: 'Iconic luxury sports watch with blue dial',
    assetImageUrl: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=400',
    totalFractions: 1000,
    pricePerFraction: '0.15',
    requiresPurchaserKYC: true,
    status: 1, // Approved
    timestamp: Date.now() - 86400000,
    nftContract: '0xabcdef1234567890abcdef1234567890abcdef12',
    availableFractions: 650,
    totalValue: '150'
  },
  {
    requestId: 2,
    proposer: '0x2345678901234567890123456789012345678901',
    assetType: 'Digital Art',
    assetName: 'Chromatic Dreams #142',
    assetDescription: 'Generative art NFT from renowned artist',
    assetImageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400',
    totalFractions: 500,
    pricePerFraction: '0.08',
    requiresPurchaserKYC: false,
    status: 1,
    timestamp: Date.now() - 172800000,
    nftContract: '0xbcdef1234567890abcdef1234567890abcdef123',
    availableFractions: 423,
    totalValue: '40'
  },
  {
    requestId: 3,
    proposer: '0x3456789012345678901234567890123456789012',
    assetType: 'Classic Car Model',
    assetName: 'Ferrari F40 1:8 Scale',
    assetDescription: 'Handcrafted precision model with certificate',
    assetImageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400',
    totalFractions: 200,
    pricePerFraction: '0.25',
    requiresPurchaserKYC: true,
    status: 0, // Pending
    timestamp: Date.now() - 3600000,
    nftContract: null,
    availableFractions: 200,
    totalValue: '50'
  }
];