import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { saveAs } from 'file-saver';
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';

interface BatchImage {
  id: string;
  file: File;
  preview: string;
  dimensions: { width: number; height: number; originalWidth: number; originalHeight: number };
  exifData: any;
  converted?: Blob;
  upscaled?: string;
  backgroundRemoved?: string;
  colorPalette?: any;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  settings?: {
    format: string;
    resizePercentage: number;
    maintainAspectRatio: boolean;
    removeExif: boolean;
    upscaleFactor: number;
    backgroundRemoval: boolean;
  };
}

interface BatchProcessorProps {
  images: BatchImage[];
  onImagesChange: (images: BatchImage[]) => void;
  onProgress?: (progress: number) => void;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({
  images,
  onImagesChange,
  onProgress,
  isProcessing,
  onProcessingChange
}) => {
  const [globalSettings, setGlobalSettings] = useState({
    format: 'jpeg',
    resizePercentage: 100,
    maintainAspectRatio: true,
    removeExif: false,
    upscaleFactor: 2,
    backgroundRemoval: false
  });

  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = [
    { value: 'jpeg', label: 'JPEG', extension: 'jpg', mimeType: 'image/jpeg' },
    { value: 'png', label: 'PNG', extension: 'png', mimeType: 'image/png' },
    { value: 'webp', label: 'WebP', extension: 'webp', mimeType: 'image/webp' },
    { value: 'gif', label: 'GIF', extension: 'gif', mimeType: 'image/gif' },
    { value: 'bmp', label: 'BMP', extension: 'bmp', mimeType: 'image/bmp' }
  ];

  const imagesRef = useRef<BatchImage[]>(images);
  
  // Update ref when images change
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Initialize AI upscaler (simplified like main app)
  useEffect(() => {
    // Canvas-based upscaling is always ready
    console.log('Canvas-based upscaling ready');
  }, []);

  const updateImage = useCallback((id: string, updates: Partial<BatchImage>) => {
    console.log(`Updating image ${id} with:`, updates);
    console.log('Current images before update:', imagesRef.current);
    const updatedImages = imagesRef.current.map(img => 
      img.id === id ? { ...img, ...updates } : img
    );
    console.log('Updated images after updateImage:', updatedImages);
    onImagesChange(updatedImages);
  }, [onImagesChange]);

  const processImage = async (image: BatchImage, settings: any): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      console.log(`Starting to process image ${image.id}`);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous'; // Handle CORS issues
      
      img.onload = async () => {
        try {
          console.log(`Image loaded for ${image.id}, natural dimensions:`, img.naturalWidth, 'x', img.naturalHeight);
          
          // Use actual image dimensions if dimensions not loaded yet
          const originalWidth = image.dimensions.originalWidth || img.naturalWidth;
          const originalHeight = image.dimensions.originalHeight || img.naturalHeight;
          
          console.log(`Using dimensions for ${image.id}:`, originalWidth, 'x', originalHeight);
          
          if (originalWidth === 0 || originalHeight === 0) {
            reject(new Error('Invalid image dimensions'));
            return;
          }

          // Calculate new dimensions with upscaling
          const resizeWidth = Math.round((originalWidth * settings.resizePercentage) / 100);
          const resizeHeight = settings.maintainAspectRatio
            ? Math.round((originalHeight * settings.resizePercentage) / 100)
            : Math.round((originalHeight * settings.resizePercentage) / 100);
          
          // Apply upscaling factor
          const newWidth = Math.round(resizeWidth * settings.upscaleFactor);
          const newHeight = Math.round(resizeHeight * settings.upscaleFactor);

          console.log(`=== UPSCALING DEBUG for ${image.id} ===`);
          console.log(`Original dimensions: ${originalWidth}x${originalHeight}`);
          console.log(`Resize percentage: ${settings.resizePercentage}%`);
          console.log(`Upscale factor: ${settings.upscaleFactor}x`);
          console.log(`Calculated resize: ${resizeWidth}x${resizeHeight}`);
          console.log(`Final dimensions: ${newWidth}x${newHeight}`);
          console.log(`Canvas will be set to: ${newWidth}x${newHeight}`);
          console.log(`=========================================`);

          if (newWidth <= 0 || newHeight <= 0) {
            reject(new Error('Invalid resize dimensions'));
            return;
          }

          // Set canvas to final upscaled dimensions
          canvas.width = newWidth;
          canvas.height = newHeight;
          ctx.clearRect(0, 0, newWidth, newHeight);
          
          // Use high-quality image scaling for upscaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          
          console.log(`Image upscaled from ${originalWidth}x${originalHeight} to ${newWidth}x${newHeight}`);
          console.log(`Canvas actual dimensions: ${canvas.width}x${canvas.height}`);
          
          console.log(`Image drawn at upscaled dimensions: ${newWidth}x${newHeight} (original: ${originalWidth}x${originalHeight})`);

          // Apply background removal if enabled (placeholder - would need AI implementation)
          if (settings.backgroundRemoval) {
            console.log(`Background removal requested for ${image.id} (not implemented yet)`);
            // TODO: Implement AI background removal
          }

          // Get format info
          const format = supportedFormats.find(f => f.value === settings.format);
          console.log(`Converting ${image.id} to format:`, format?.mimeType || 'image/jpeg');
          console.log(`Settings applied: resize=${settings.resizePercentage}%, upscale=${settings.upscaleFactor}x, format=${settings.format}, removeExif=${settings.removeExif}`);
          
          // Convert to blob with error handling
          canvas.toBlob(async (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob - canvas may be empty'));
              return;
            }

            console.log(`=== IMAGE PROCESSING DEBUG for ${image.id} ===`);
            console.log(`Original dimensions: ${originalWidth}x${originalHeight}`);
            console.log(`Resize percentage: ${settings.resizePercentage}%`);
            console.log(`Upscale factor: ${settings.upscaleFactor}x`);
            console.log(`Calculated resize: ${resizeWidth}x${resizeHeight}`);
            console.log(`Final dimensions: ${newWidth}x${newHeight}`);
            console.log(`Canvas dimensions: ${canvas.width}x${canvas.height}`);
            console.log(`Blob created, size:`, blob.size, 'bytes');
            console.log(`Original file size: ${image.file.size} bytes`);
            console.log(`Size increase: ${((blob.size / image.file.size) * 100).toFixed(1)}%`);
            console.log(`Pixel count increase: ${((newWidth * newHeight) / (originalWidth * originalHeight)).toFixed(2)}x`);
            console.log(`===============================================`);

            try {
              // Apply compression if needed
              if (format && (settings.format === 'jpeg' || settings.format === 'webp')) {
                console.log(`Applying compression to ${image.id}`);
                const tempFile = new File([blob], `temp.${format.extension}`, { type: format.mimeType });
                const compressedBlob = await imageCompression(tempFile, {
                  maxSizeMB: 50, // Increased to allow larger upscaled images
                  maxWidthOrHeight: Math.max(newWidth, newHeight), // Keep upscaled dimensions
                  useWebWorker: true,
                  initialQuality: 0.9 // Higher quality to preserve upscaling benefits
                });
                console.log(`Compression completed for ${image.id}, final size:`, compressedBlob.size, 'bytes');
                console.log(`Final size increase: ${((compressedBlob.size / image.file.size) * 100).toFixed(1)}%`);
                resolve(compressedBlob);
              } else {
                resolve(blob);
              }
            } catch (error) {
              console.warn('Compression failed, using original:', error);
              resolve(blob);
            }
          }, format?.mimeType || 'image/jpeg', 0.95);
        } catch (error) {
          console.error(`Error in image processing for ${image.id}:`, error);
          reject(new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      img.onerror = (error) => {
        console.error(`Failed to load image ${image.id}:`, error);
        reject(new Error('Failed to load image - check if image is valid'));
      };
      
      console.log(`Loading image ${image.id} from:`, image.preview);
      img.src = image.preview;
    });
  };

  const processBatch = async () => {
    onProcessingChange(true);
    const imagesToProcess = selectedImages.size > 0 
      ? images.filter(img => selectedImages.has(img.id))
      : images;

    let processedCount = 0;
    const totalImages = imagesToProcess.length;

    console.log(`Starting batch processing of ${totalImages} images`);

    // Check if all images have dimensions loaded
    const imagesWithoutDimensions = imagesToProcess.filter(img => 
      img.dimensions.originalWidth === 0 || img.dimensions.originalHeight === 0
    );
    
    if (imagesWithoutDimensions.length > 0) {
      console.error(`${imagesWithoutDimensions.length} images don't have dimensions loaded yet. Please wait a moment and try again.`);
      onProcessingChange(false);
      return;
    }

    console.log('All dimensions loaded, starting image processing...');

    for (const image of imagesToProcess) {
      try {
        console.log(`Processing image ${image.id}:`, image.file.name);
        updateImage(image.id, { status: 'processing', progress: 0 });

        const settings = image.settings || globalSettings;
        console.log(`Processing image ${image.id} with settings:`, settings);
        
        // Get the latest image data with dimensions
        const latestImage = imagesRef.current.find(img => img.id === image.id) || image;
        const convertedBlob = await processImage(latestImage, settings);

        updateImage(image.id, {
          status: 'completed',
          progress: 100,
          converted: convertedBlob
        });

        processedCount++;
        onProgress?.((processedCount / totalImages) * 100);
        console.log(`Completed image ${image.id} (${processedCount}/${totalImages})`);
        
        // Small delay to ensure state updates properly
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing image ${image.id}:`, error);
        updateImage(image.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        processedCount++;
        onProgress?.((processedCount / totalImages) * 100);
        
        // Small delay even for errors
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Batch processing completed. Processed ${processedCount}/${totalImages} images`);
    onProcessingChange(false);
  };

  const downloadImage = (image: BatchImage) => {
    if (image.converted) {
      const format = supportedFormats.find(f => f.value === globalSettings.format);
      const extension = format?.extension || 'jpg';
      const baseFilename = image.file.name.replace(/\.[^/.]+$/, '');
      const sizeInfo = `_${Math.round(image.dimensions.originalWidth * globalSettings.resizePercentage / 100)}x${Math.round(image.dimensions.originalHeight * globalSettings.resizePercentage / 100)}`;
      const exifInfo = globalSettings.removeExif ? '_no-exif' : '';
      const filename = `${baseFilename}${sizeInfo}${exifInfo}.${extension}`;
      
      saveAs(image.converted, filename);
    }
  };

  const downloadAll = () => {
    images.forEach(image => {
      if (image.converted) {
        downloadImage(image);
      }
    });
  };

  const downloadAllAsZip = async () => {
    const completedImages = images.filter(img => img.status === 'completed' && img.converted);
    
    if (completedImages.length === 0) {
      alert('No completed images to download!');
      return;
    }

    console.log(`Creating ZIP with ${completedImages.length} images...`);
    
    const zip = new JSZip();
    const format = supportedFormats.find(f => f.value === globalSettings.format);
    const extension = format?.extension || 'jpg';

    // Add each converted image to the ZIP
    completedImages.forEach((image, index) => {
      const baseFilename = image.file.name.replace(/\.[^/.]+$/, '');
      const sizeInfo = `_${Math.round(image.dimensions.originalWidth * globalSettings.resizePercentage / 100)}x${Math.round(image.dimensions.originalHeight * globalSettings.resizePercentage / 100)}`;
      const exifInfo = globalSettings.removeExif ? '_no-exif' : '';
      const fileName = `${baseFilename}${sizeInfo}${exifInfo}.${extension}`;
      zip.file(fileName, image.converted!);
    });

    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFileName = `converted_images_${new Date().toISOString().split('T')[0]}.zip`;
      saveAs(zipBlob, zipFileName);
      console.log(`ZIP downloaded: ${zipFileName}`);
    } catch (error) {
      console.error('Error creating ZIP:', error);
      alert('Error creating ZIP file!');
    }
  };

  const removeImage = (id: string) => {
    const image = images.find(img => img.id === id);
    if (image) {
      URL.revokeObjectURL(image.preview);
    }
    onImagesChange(images.filter(img => img.id !== id));
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const clearAll = () => {
    images.forEach(image => {
      URL.revokeObjectURL(image.preview);
    });
    onImagesChange([]);
    setSelectedImages(new Set());
  };

  const toggleImageSelection = (id: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedImages(new Set(images.map(img => img.id)));
  };

  const deselectAll = () => {
    setSelectedImages(new Set());
  };

  const applySettingsToSelected = () => {
    images.forEach(image => {
      if (selectedImages.has(image.id)) {
        updateImage(image.id, { settings: { ...globalSettings } });
      }
    });
  };

  const handleFileSelect = async (files: FileList | null) => {
    console.log('handleFileSelect called with files:', files);
    
    if (!files) {
      console.log('No files provided');
      return;
    }
    
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    console.log('Filtered image files:', imageFiles);

    if (imageFiles.length === 0) {
      alert('Please select valid image files.');
      return;
    }

    const newImages: BatchImage[] = imageFiles.map(file => {
      const id = Math.random().toString(36).substr(2, 9);
      const preview = URL.createObjectURL(file);
      
      console.log('Creating new image:', { id, fileName: file.name, preview });
      
      return {
        id,
        file,
        preview,
        dimensions: { width: 0, height: 0, originalWidth: 0, originalHeight: 0 },
        exifData: null,
        progress: 0,
        status: 'pending' as const,
        settings: { ...globalSettings }
      };
    });

    console.log('New images created:', newImages);
    console.log('Current images before adding:', images);

    // Add new images to existing ones
    const updatedImages = [...images, ...newImages];
    console.log('Updated images array:', updatedImages);
    
    onImagesChange(updatedImages);

    // Load image dimensions for each new image synchronously
    const loadDimensions = async (image: BatchImage): Promise<BatchImage> => {
      return new Promise((resolve, reject) => {
        const imgElement = new Image();
        imgElement.onload = () => {
          console.log(`Image dimensions loaded for ${image.id}:`, imgElement.naturalWidth, 'x', imgElement.naturalHeight);
          const updatedImage = {
            ...image,
            dimensions: {
              width: imgElement.naturalWidth,
              height: imgElement.naturalHeight,
              originalWidth: imgElement.naturalWidth,
              originalHeight: imgElement.naturalHeight
            }
          };
          resolve(updatedImage);
        };
        imgElement.onerror = () => {
          console.error(`Failed to load image dimensions for ${image.id}`);
          const errorImage = {
            ...image,
            status: 'error' as const,
            error: 'Failed to load image dimensions'
          };
          reject(errorImage);
        };
        imgElement.src = image.preview;
      });
    };

    // Load all dimensions before proceeding
    try {
      const imagesWithDimensions = await Promise.all(newImages.map(loadDimensions));
      console.log('All image dimensions loaded successfully');
      
      // Update all images with their dimensions at once
      const allImages = [...images, ...imagesWithDimensions];
      onImagesChange(allImages);
      console.log('Updated all images with dimensions:', allImages);
    } catch (error) {
      console.error('Some images failed to load dimensions:', error);
      // Still update with the images that loaded successfully
      const imagesWithDimensions = newImages.map(img => ({
        ...img,
        dimensions: { width: 0, height: 0, originalWidth: 0, originalHeight: 0 }
      }));
      onImagesChange([...images, ...imagesWithDimensions]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('Drag over detected');
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('Drag leave detected');
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('Drop detected, files:', e.dataTransfer.files);
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const openFileDialog = () => {
    console.log('Opening file dialog...');
    if (fileInputRef.current) {
      console.log('File input ref found, clicking...');
      fileInputRef.current.click();
    } else {
      console.error('File input ref not found!');
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Area */}
      <div className="batch-upload-area">
        <div 
          className={`batch-dropzone ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
          style={{ cursor: 'pointer' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              console.log('BatchProcessor file input changed:', e.target.files);
              console.log('Number of files:', e.target.files?.length);
              if (e.target.files && e.target.files.length > 0) {
                console.log('Files detected, calling handleFileSelect');
                handleFileSelect(e.target.files);
              } else {
                console.log('No files detected');
              }
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              zIndex: 10
            }}
          />
          <div className="batch-dropzone-content">
            <div className="batch-dropzone-icon">📁</div>
            <div className="batch-dropzone-title">
              {images.length === 0 ? 'DROP IMAGES HERE' : 'ADD MORE IMAGES'}
            </div>
            <div className="batch-dropzone-subtitle">
              OR CLICK TO BROWSE
            </div>
            <div className="batch-dropzone-info">
              Supports: JPG, PNG, WebP, GIF, BMP
            </div>
            <button 
              type="button"
              className="batch-upload-button"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
            >
              BROWSE FILES
            </button>
          </div>
        </div>
      </div>

      {/* Batch Controls */}
      <div className="batch-controls">
        <div className="batch-controls-header">
          <h2 className="batch-controls-title">BATCH CONTROLS</h2>
          <div className="batch-controls-actions">
            <div className="ai-status-indicator">
              <span className="ai-status-text">🤖 AI UPSCALING READY</span>
              <div className="ai-warning-text">
                High-quality canvas-based upscaling
              </div>
            </div>
            <motion.button
              onClick={() => setShowSettings(!showSettings)}
              className="batch-btn batch-btn-secondary"
              whileHover={{ scale: 1.05 }}
            >
              {showSettings ? 'HIDE SETTINGS' : 'SHOW SETTINGS'}
            </motion.button>
            <motion.button
              onClick={selectAll}
              className="batch-btn batch-btn-warning"
              whileHover={{ scale: 1.05 }}
            >
              SELECT ALL
            </motion.button>
            <motion.button
              onClick={deselectAll}
              className="batch-btn batch-btn-warning"
              whileHover={{ scale: 1.05 }}
            >
              DESELECT ALL
            </motion.button>
          </div>
        </div>

        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="batch-settings-grid"
          >
            <div className="batch-setting-item">
              <label className="batch-setting-label cyan">FORMAT</label>
              <select
                value={globalSettings.format}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, format: e.target.value }))}
                className="batch-input"
              >
                {supportedFormats.map(format => (
                  <option key={format.value} value={format.value}>{format.label}</option>
                ))}
              </select>
            </div>

            <div className="batch-setting-item">
              <label className="batch-setting-label yellow">
                RESIZE: {globalSettings.resizePercentage}%
              </label>
              <input
                type="range"
                min="10"
                max="200"
                value={globalSettings.resizePercentage}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, resizePercentage: parseInt(e.target.value) }))}
                className="batch-slider"
              />
            </div>

            <div className="batch-checkbox-container">
              <input
                type="checkbox"
                checked={globalSettings.maintainAspectRatio}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                className="batch-checkbox"
                id="maintainAspectRatio"
              />
              <label htmlFor="maintainAspectRatio" className="batch-checkbox-label">
                MAINTAIN ASPECT RATIO
              </label>
            </div>

            <div className="batch-checkbox-container">
              <input
                type="checkbox"
                checked={globalSettings.removeExif}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, removeExif: e.target.checked }))}
                className="batch-checkbox"
                id="removeExif"
              />
              <label htmlFor="removeExif" className="batch-checkbox-label">
                REMOVE EXIF
              </label>
            </div>

            <div className="batch-setting-item">
              <label className="batch-setting-label pink">
                UPSCALE: {globalSettings.upscaleFactor}x
              </label>
              <select
                value={globalSettings.upscaleFactor}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, upscaleFactor: parseFloat(e.target.value) }))}
                className="batch-input"
              >
                <option value={1}>1x (Original)</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
                <option value={3}>3x</option>
                <option value={4}>4x</option>
              </select>
            </div>

            <div className="batch-checkbox-container">
              <input
                type="checkbox"
                checked={globalSettings.backgroundRemoval}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, backgroundRemoval: e.target.checked }))}
                className="batch-checkbox"
                id="backgroundRemoval"
              />
              <label htmlFor="backgroundRemoval" className="batch-checkbox-label">
                REMOVE BACKGROUND
              </label>
            </div>
          </motion.div>
        )}

        <div className="batch-actions">
          <motion.button
            onClick={applySettingsToSelected}
            disabled={selectedImages.size === 0}
            className="batch-btn batch-btn-primary"
            whileHover={{ scale: 1.05 }}
          >
            APPLY TO SELECTED ({selectedImages.size})
          </motion.button>

          <motion.button
            onClick={processBatch}
            disabled={isProcessing || images.length === 0}
            className="batch-btn batch-btn-secondary"
            whileHover={{ scale: 1.05 }}
          >
            {isProcessing ? 'PROCESSING...' : 'PROCESS BATCH'}
          </motion.button>

          <motion.button
            onClick={downloadAll}
            disabled={images.filter(img => img.converted).length === 0}
            className="batch-btn batch-btn-warning"
            whileHover={{ scale: 1.05 }}
          >
            DOWNLOAD ALL
          </motion.button>

          <motion.button
            onClick={downloadAllAsZip}
            disabled={images.filter(img => img.converted).length === 0}
            className="batch-btn batch-btn-primary"
            whileHover={{ scale: 1.05 }}
          >
            DOWNLOAD ZIP
          </motion.button>

          <motion.button
            onClick={clearAll}
            className="batch-btn batch-btn-danger"
            whileHover={{ scale: 1.05 }}
          >
            CLEAR ALL
          </motion.button>
        </div>
      </div>

      {/* Images Grid */}
      <div className="bg-neo-dark border-4 border-neo-pink p-6 shadow-neo-pink">
        <h2 className="text-2xl font-bold text-neo-white mb-6">
          IMAGES ({images.length}) - SELECTED ({selectedImages.size})
        </h2>

        <div className="batch-images-grid">
          {images.map((image) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`batch-image-item ${
                  selectedImages.has(image.id) 
                    ? 'selected' 
                    : ''
                }`}
                onClick={() => toggleImageSelection(image.id)}
              >
                <img
                  src={image.preview}
                  alt="Batch thumbnail"
                  className="batch-image-thumbnail"
                />
                
                <div className={`batch-image-status ${image.status}`}>
                  {image.status.toUpperCase()}
                </div>
                
                {image.status === 'processing' && (
                  <div className="batch-image-progress">
                    <div 
                      className="batch-image-progress-fill"
                      style={{ width: `${image.progress}%` }}
                    />
                  </div>
                )}
                
                {image.error && (
                  <div className="batch-image-error" title={image.error}>
                    {image.error}
                  </div>
                )}

                <div className="batch-image-actions">
                  {image.converted && (
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(image);
                      }}
                      className="batch-image-action-btn"
                      title="Download"
                      whileHover={{ scale: 1.2 }}
                    >
                      ↓
                    </motion.button>
                  )}
                  
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(image.id);
                    }}
                    className="batch-image-action-btn"
                    title="Remove"
                    whileHover={{ scale: 1.2 }}
                  >
                    ×
                  </motion.button>
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default BatchProcessor;
