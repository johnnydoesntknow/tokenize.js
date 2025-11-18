// src/utils/ipfsUpload.js
// FIXED - Upload all asset files to ONE IPFS folder
import axios from 'axios';

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET = import.meta.env.VITE_PINATA_API_SECRET;
const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';

// ============================================================================
// SINGLE FILE UPLOAD (for individual files)
// ============================================================================
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

// ============================================================================
// FOLDER UPLOAD - Upload all asset files to ONE IPFS folder
// ============================================================================
export const uploadAssetFolderToIPFS = async ({
  assetName,
  mainImage,
  additionalImages = [],
  documents = []
}) => {
  try {
    console.log('📁 Creating asset folder on IPFS...');
    
    const formData = new FormData();
    
    // Add main image with proper path
    if (mainImage && mainImage.file) {
      formData.append('file', mainImage.file, `images/main${getFileExtension(mainImage.file.name)}`);
    }
    
    // Add additional images with proper paths
    additionalImages.forEach((img, index) => {
      if (img && img.file) {
        formData.append('file', img.file, `images/additional-${index + 1}${getFileExtension(img.file.name)}`);
      }
    });
    
    // Add documents with proper paths
    documents.forEach((doc, index) => {
      if (doc && doc.file) {
        const docName = doc.name || `document-${index + 1}`;
        formData.append('file', doc.file, `documents/${docName}${getFileExtension(doc.file.name)}`);
      }
    });
    
    // Create metadata for the folder
    const metadata = JSON.stringify({
      name: `${assetName}-assets`,
      keyvalues: {
        assetName: assetName,
        uploadedAt: new Date().toISOString(),
        mainImageCount: mainImage ? 1 : 0,
        additionalImageCount: additionalImages.length,
        documentCount: documents.length
      }
    });
    formData.append('pinataMetadata', metadata);
    
    // Set pinata options for folder structure
    const pinataOptions = JSON.stringify({
      wrapWithDirectory: true
    });
    formData.append('pinataOptions', pinataOptions);
    
    const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      maxBodyLength: 'Infinity',
      headers: {
        'Content-Type': `multipart/form-data`,
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET
      }
    });
    
    const folderCID = res.data.IpfsHash;
    console.log('✅ Folder uploaded to IPFS:', folderCID);
    
    // Build the folder structure metadata
    const folderStructure = {
      folderCID,
      folderURL: `${IPFS_GATEWAY}${folderCID}`,
      mainImage: mainImage ? `${IPFS_GATEWAY}${folderCID}/images/main${getFileExtension(mainImage.file.name)}` : null,
      additionalImages: additionalImages.map((img, index) => 
        img ? `${IPFS_GATEWAY}${folderCID}/images/additional-${index + 1}${getFileExtension(img.file.name)}` : null
      ).filter(Boolean),
      documents: documents.map((doc, index) => {
        if (!doc) return null;
        const docName = doc.name || `document-${index + 1}`;
        return {
          name: doc.name,
          url: `${IPFS_GATEWAY}${folderCID}/documents/${docName}${getFileExtension(doc.file.name)}`
        };
      }).filter(Boolean)
    };
    
    return folderStructure;
    
  } catch (error) {
    console.error('❌ Folder upload error:', error);
    throw error;
  }
};

// ============================================================================
// METADATA UPLOAD
// ============================================================================
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

// ============================================================================
// CREATE COMPLETE ASSET METADATA
// ============================================================================
export const createCompleteAssetMetadata = async (assetData, folderStructure) => {
  const metadata = {
    name: assetData.assetName,
    description: assetData.assetDescription,
    type: assetData.assetType,
    
    // IPFS folder info
    ipfsFolder: folderStructure.folderCID,
    ipfsFolderURL: folderStructure.folderURL,
    
    // Images
    mainImage: folderStructure.mainImage,
    images: folderStructure.additionalImages,
    imageCount: folderStructure.additionalImages.length + 1,
    
    // Documents
    documents: folderStructure.documents,
    documentCount: folderStructure.documents.length,
    
    // Asset details
    createdAt: new Date().toISOString(),
    shareType: assetData.shareType,
    
    // Attributes for NFT metadata standard
    attributes: [
      {
        trait_type: "Asset Type",
        value: assetData.assetType
      },
      {
        trait_type: "Share Type",
        value: assetData.shareType === 'fixed' ? 'Fixed Supply' : 'Weighted'
      },
      {
        trait_type: "Total Images",
        value: folderStructure.additionalImages.length + 1
      },
      {
        trait_type: "Documents",
        value: folderStructure.documents.length
      }
    ]
  };
  
  // Add type-specific attributes
  if (assetData.assetType === 'Real Estate' && assetData.propertyLocation) {
    metadata.attributes.push({
      trait_type: "Location",
      value: assetData.propertyLocation
    });
  }
  
  if (assetData.assetType === 'Vehicles' && assetData.vehicleMake) {
    metadata.attributes.push({
      trait_type: "Make",
      value: assetData.vehicleMake
    });
    metadata.attributes.push({
      trait_type: "Model",
      value: assetData.vehicleModel
    });
    metadata.attributes.push({
      trait_type: "Year",
      value: assetData.vehicleYear
    });
  }
  
  // Upload metadata to IPFS
  const metadataCID = await uploadMetadataToIPFS(metadata);
  
  return {
    metadataCID,
    metadataURL: `${IPFS_GATEWAY}${metadataCID}`,
    metadata
  };
};

// ============================================================================
// FETCH ALL IMAGES FROM IPFS FOLDER
// ============================================================================
export const fetchImagesFromIPFSFolder = async (folderCID) => {
  try {
    // Fetch the directory listing from IPFS
    const response = await axios.get(`${IPFS_GATEWAY}${folderCID}?format=json`);
    
    if (response.data && response.data.Links) {
      const images = response.data.Links
        .filter(link => link.Name.startsWith('images/'))
        .map(link => ({
          name: link.Name,
          url: `${IPFS_GATEWAY}${folderCID}/${link.Name}`,
          isMain: link.Name.includes('main')
        }))
        .sort((a, b) => {
          // Main image first
          if (a.isMain) return -1;
          if (b.isMain) return 1;
          return a.name.localeCompare(b.name);
        });
      
      return images;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching IPFS folder contents:', error);
    // Fallback: construct URLs manually
    return [];
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function getFileExtension(filename) {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(lastDot) : '';
}