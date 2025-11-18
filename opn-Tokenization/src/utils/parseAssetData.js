// src/utils/parseAssetData.js

/**
 * Parse additional images from asset description
 * The CreateView stores additional images in the description as:
 * "Additional Images:\nImage 1: [url]\nImage 2: [url]"
 */
export const parseAdditionalImages = (description) => {
  const images = [];
  
  if (!description) return images;
  
  // Look for the "Additional Images:" section
  const additionalImagesMatch = description.match(/Additional Images:([\s\S]*?)(?:\n\n|Documents:|$)/);
  
  if (additionalImagesMatch && additionalImagesMatch[1]) {
    const imagesSection = additionalImagesMatch[1];
    
    // Extract each image URL
    const imageMatches = imagesSection.matchAll(/Image \d+: (https?:\/\/[^\s\n]+)/g);
    
    for (const match of imageMatches) {
      if (match[1]) {
        images.push(match[1]);
      }
    }
  }
  
  return images;
};

/**
 * Parse property-specific data from description
 */
export const parsePropertyData = (description, assetType) => {
  const data = {
    location: 'Dubai, United Arab Emirates',
    size: 'Not specified',
    type: assetType || 'Residential',
    yearBuilt: 'Not specified',
    features: []
  };
  
  if (!description) return data;
  
  // Extract location
  const locationMatch = description.match(/Location: ([^\n]+)/i);
  if (locationMatch) {
    data.location = locationMatch[1];
  } else {
    // Try alternate format
    const altLocationMatch = description.match(/located in ([^.,\n]+)/i);
    if (altLocationMatch) data.location = altLocationMatch[1];
  }
  
  // Extract size
  const sizeMatch = description.match(/Size: ([\d,.]+ (?:sq\.?\s*ft|sqft|square feet|acres))/i);
  if (sizeMatch) {
    data.size = sizeMatch[1];
  } else {
    // Try alternate format
    const altSizeMatch = description.match(/(\d+[\d,]*)\s*(sq\.?\s*ft|square feet|sqft|acres)/i);
    if (altSizeMatch) data.size = altSizeMatch[0];
  }
  
  // Extract property type from description if it's there
  if (description.includes('Residential')) data.type = 'Residential';
  else if (description.includes('Commercial')) data.type = 'Commercial';
  else if (description.includes('Land')) data.type = 'Land';
  
  return data;
};

/**
 * Parse documents from description
 */
export const parseDocuments = (description) => {
  const documents = [];
  
  if (!description) return documents;
  
  // Look for the "Documents:" section
  const documentsMatch = description.match(/Documents:([\s\S]*?)(?:\n\n|$)/);
  
  if (documentsMatch && documentsMatch[1]) {
    const docsSection = documentsMatch[1];
    const lines = docsSection.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const docMatch = line.match(/(.+?):\s*(https?:\/\/[^\s]+)/);
      if (docMatch) {
        documents.push({
          name: docMatch[1].trim(),
          url: docMatch[2].trim()
        });
      }
    }
  }
  
  return documents;
};

/**
 * Complete asset data parser
 */
export const parseAssetData = (asset) => {
  const description = asset.assetDescription || '';
  
  return {
    ...asset,
    additionalImages: parseAdditionalImages(description),
    propertyData: parsePropertyData(description, asset.assetType),
    documents: parseDocuments(description)
  };
};