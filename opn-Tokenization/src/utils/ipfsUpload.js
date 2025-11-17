import axios from 'axios';

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET = import.meta.env.VITE_PINATA_API_SECRET;
const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY;

// Upload single image to IPFS
export const uploadImageToIPFS = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const metadata = JSON.stringify({
    name: file.name,
    keyvalues: {
      uploadedAt: new Date().toISOString()
    }
  });
  formData.append('pinataMetadata', metadata);

  try {
    const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      maxBodyLength: 'Infinity',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET
      }
    });
    
    return res.data.IpfsHash;
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw error;
  }
};

// Upload metadata JSON to IPFS
export const uploadMetadataToIPFS = async (metadata) => {
  try {
    const res = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET
      }
    });
    
    return res.data.IpfsHash;
  } catch (error) {
    console.error('Metadata upload error:', error);
    throw error;
  }
};

// Create asset metadata with images
export const createAssetMetadata = async (assetData, mainImageHash, additionalImageHashes) => {
  const metadata = {
    name: assetData.assetName,
    description: assetData.assetDescription,
    type: assetData.assetType,
    mainImage: `${IPFS_GATEWAY}${mainImageHash}`,
    images: additionalImageHashes.map(hash => `${IPFS_GATEWAY}${hash}`),
    createdAt: new Date().toISOString(),
    attributes: [
      {
        trait_type: "Asset Type",
        value: assetData.assetType
      },
      {
        trait_type: "Total Shares",
        value: assetData.totalShares
      },
      {
        trait_type: "Price Per Share",
        value: assetData.pricePerShare
      }
    ]
  };
  
  return uploadMetadataToIPFS(metadata);
};