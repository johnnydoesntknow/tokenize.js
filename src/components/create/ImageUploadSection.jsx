import React, { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { uploadImageToIPFS } from '../../utils/ipfsUpload';

const ImageUploadSection = ({ onImagesChange }) => {
  const [mainImage, setMainImage] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [visibleSlots, setVisibleSlots] = useState(5);
  
  const MAX_ADDITIONAL_IMAGES = 25;

  // Handle main image drop
  const handleMainImageDrop = useCallback(async (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0] || e.target.files[0];
    
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      // Create preview
      const preview = URL.createObjectURL(file);
      
      // Upload to IPFS
      const ipfsHash = await uploadImageToIPFS(file);
      
      const imageData = {
        file,
        preview,
        ipfsHash,
        url: `${import.meta.env.VITE_IPFS_GATEWAY}${ipfsHash}`
      };
      
      setMainImage(imageData);
      onImagesChange({ mainImage: imageData, additionalImages });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image to IPFS');
    } finally {
      setUploading(false);
    }
  }, [additionalImages, onImagesChange]);

  // Handle additional images drop
  const handleAdditionalImagesDrop = useCallback(async (e, index) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || e.target.files || []);
    
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const remainingSlots = MAX_ADDITIONAL_IMAGES - additionalImages.length;
    const filesToUpload = imageFiles.slice(0, remainingSlots);

    setUploading(true);
    const newImages = [...additionalImages];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const currentIndex = index + i;
      
      try {
        setUploadProgress(prev => ({ ...prev, [currentIndex]: 0 }));
        
        const preview = URL.createObjectURL(file);
        const ipfsHash = await uploadImageToIPFS(file);
        
        const imageData = {
          file,
          preview,
          ipfsHash,
          url: `${import.meta.env.VITE_IPFS_GATEWAY}${ipfsHash}`
        };
        
        newImages[currentIndex] = imageData;
        setUploadProgress(prev => ({ ...prev, [currentIndex]: 100 }));
      } catch (error) {
        console.error(`Failed to upload image ${i}:`, error);
        setUploadProgress(prev => ({ ...prev, [currentIndex]: -1 }));
      }
    }

    setAdditionalImages(newImages);
    onImagesChange({ mainImage, additionalImages: newImages });
    
    // Show more slots if needed
    if (newImages.length >= visibleSlots - 2 && visibleSlots < MAX_ADDITIONAL_IMAGES) {
      setVisibleSlots(Math.min(visibleSlots + 5, MAX_ADDITIONAL_IMAGES));
    }
    
    setUploading(false);
    setUploadProgress({});
  }, [additionalImages, mainImage, visibleSlots, onImagesChange]);

  // Remove image
  const removeImage = (isMain, index) => {
    if (isMain) {
      setMainImage(null);
      onImagesChange({ mainImage: null, additionalImages });
    } else {
      const newImages = additionalImages.filter((_, i) => i !== index);
      setAdditionalImages(newImages);
      onImagesChange({ mainImage, additionalImages: newImages });
    }
  };

  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="space-y-6">
      {/* Main Image Upload */}
      <div>
        <h3 className="text-sm font-medium text-white mb-2">
          Main Image <span className="text-red-500">*</span>
        </h3>
        <div
          className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
            mainImage ? 'border-green-500/50 bg-green-500/5' : 'border-neutral-700 hover:border-neutral-600'
          }`}
          onDrop={handleMainImageDrop}
          onDragOver={preventDefaults}
          onDragEnter={preventDefaults}
        >
          {mainImage ? (
            <div className="relative">
              <img
                src={mainImage.preview}
                alt="Main"
                className="w-full h-48 object-cover rounded"
              />
              <button
                onClick={() => removeImage(true)}
                className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              {mainImage.ipfsHash && (
                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-green-400">
                  ✓ Uploaded to IPFS
                </div>
              )}
            </div>
          ) : (
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleMainImageDrop}
                className="hidden"
                disabled={uploading}
              />
              <div className="flex flex-col items-center justify-center py-8">
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-neutral-500 mb-2" />
                    <p className="text-sm text-neutral-400">
                      Drag & drop or click to upload main image
                    </p>
                  </>
                )}
              </div>
            </label>
          )}
        </div>
      </div>

      {/* Additional Images */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white">
            Additional Images
          </h3>
          <span className="text-xs text-neutral-500">
            {additionalImages.length} / {MAX_ADDITIONAL_IMAGES} images (max 25)
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[...Array(visibleSlots)].map((_, index) => {
            const image = additionalImages[index];
            const isUploading = uploadProgress[index] !== undefined && uploadProgress[index] < 100;
            
            return (
              <div
                key={index}
                className={`relative aspect-square border-2 border-dashed rounded-lg overflow-hidden transition-colors ${
                  image ? 'border-green-500/50' : 'border-neutral-700 hover:border-neutral-600'
                }`}
                onDrop={(e) => handleAdditionalImagesDrop(e, index)}
                onDragOver={preventDefaults}
                onDragEnter={preventDefaults}
              >
                {image ? (
                  <>
                    <img
                      src={image.preview}
                      alt={`Additional ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeImage(false, index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer w-full h-full flex items-center justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleAdditionalImagesDrop(e, index)}
                      className="hidden"
                      disabled={uploading}
                    />
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-neutral-600" />
                    )}
                  </label>
                )}
              </div>
            );
          })}
        </div>

        {visibleSlots < MAX_ADDITIONAL_IMAGES && (
          <button
            onClick={() => setVisibleSlots(Math.min(visibleSlots + 5, MAX_ADDITIONAL_IMAGES))}
            className="mt-2 text-xs text-neutral-500 hover:text-neutral-400 transition-colors"
          >
            + Show more slots ({MAX_ADDITIONAL_IMAGES - visibleSlots} remaining)
          </button>
        )}
      </div>

      {/* Upload Status */}
      {uploading && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <p className="text-sm text-blue-500">Uploading to IPFS...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploadSection;