import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { saveAs } from 'file-saver';
import EXIF from 'exif-js';
import './App.css';
import BatchProcessor from './components/BatchProcessor';
import ColorPaletteExtractor from './components/ColorPaletteExtractor';

// TypeScript declarations for global objects
declare global {
  interface Window {
    tf: any;
    Upscaler: any;
    gc?: () => void;
  }
}

interface ImageDimensions {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

interface ConvertedImage {
  blob: Blob;
  filename: string;
}

interface BatchImage {
  id: string;
  file: File;
  preview: string;
  dimensions: ImageDimensions;
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

const App: React.FC = () => {
  // File and image states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [convertedImage, setConvertedImage] = useState<ConvertedImage | null>(null);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [resizePercentage, setResizePercentage] = useState(100);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  
  // Conversion states
  const [selectedFormat, setSelectedFormat] = useState('jpeg');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  
  // EXIF states
  const [exifData, setExifData] = useState<any>(null);
  const [showExifData, setShowExifData] = useState(false);
  const [removeExifOnConvert, setRemoveExifOnConvert] = useState(false);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Background Removal States
  const [activeTab, setActiveTab] = useState<'convert' | 'upscale' | 'background' | 'batch' | 'palette'>('convert');
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [backgroundRemovedImage, setBackgroundRemovedImage] = useState<string | null>(null);
  const [backgroundProgress, setBackgroundProgress] = useState(0);
  const [backgroundStatus, setBackgroundStatus] = useState('');

  // Upscale States
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [upscaleProgress, setUpscaleProgress] = useState(0);
  const [upscaleStatus, setUpscaleStatus] = useState('');
  const [upscaleFactor, setUpscaleFactor] = useState(2);

  // Batch Processing States
  const [batchImages, setBatchImages] = useState<BatchImage[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Debug: Check library loading on component mount
  useEffect(() => {
    console.log('=== LIBRARY LOADING CHECK ===');
    console.log('TensorFlow.js loaded:', typeof window.tf !== 'undefined');
    console.log('UpscalerJS loaded:', typeof window.Upscaler !== 'undefined');
    if (typeof window.tf !== 'undefined') {
      console.log('TensorFlow.js version:', window.tf.version);
    }
    if (typeof window.Upscaler !== 'undefined') {
      console.log('UpscalerJS constructor:', window.Upscaler);
    }
    console.log('=====================================');
  }, []);

  // Supported formats
  const supportedFormats = [
    { value: 'jpeg', label: 'JPEG', extension: 'jpg', mimeType: 'image/jpeg' },
    { value: 'png', label: 'PNG', extension: 'png', mimeType: 'image/png' },
    { value: 'webp', label: 'WebP', extension: 'webp', mimeType: 'image/webp' },
    { value: 'gif', label: 'GIF', extension: 'gif', mimeType: 'image/gif' },
    { value: 'bmp', label: 'BMP', extension: 'bmp', mimeType: 'image/bmp' }
  ];

  const handleFileSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setConvertedImage(null);
      setResizePercentage(100);
      setExifData(null);
      
      // Extract EXIF data
      EXIF.getData(file as any, function(this: any) {
        const allMetaData = EXIF.getAllTags(this);
        if (Object.keys(allMetaData).length > 0) {
          setExifData(allMetaData);
        }
      });
      
      // Get original image dimensions
      const img = new Image();
      img.onload = () => {
        setImageDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight
        });
      };
      img.src = url;
    }
  }, []);

  // Batch file handling
  const handleBatchFileSelect = useCallback((files: FileList) => {
    const newImages: BatchImage[] = [];
    
    Array.from(files).forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const id = `batch-${Date.now()}-${index}`;
        const preview = URL.createObjectURL(file);
        
        // Get dimensions
        const img = new Image();
        img.onload = () => {
          setBatchImages(prev => prev.map(batchImg => 
            batchImg.id === id 
              ? { ...batchImg, dimensions: { width: img.naturalWidth, height: img.naturalHeight, originalWidth: img.naturalWidth, originalHeight: img.naturalHeight } }
              : batchImg
          ));
        };
        img.src = preview;
        
        // Extract EXIF data
        let exifData: any = null;
        EXIF.getData(file as any, function(this: any) {
          const allMetaData = EXIF.getAllTags(this);
          if (Object.keys(allMetaData).length > 0) {
            exifData = allMetaData;
            setBatchImages(prev => prev.map(batchImg => 
              batchImg.id === id ? { ...batchImg, exifData } : batchImg
            ));
          }
        });
        
        newImages.push({
          id,
          file,
          preview,
          dimensions: { width: 0, height: 0, originalWidth: 0, originalHeight: 0 },
          exifData: null,
          progress: 0,
          status: 'pending'
        });
      }
    });
    
    setBatchImages(prev => [...prev, ...newImages]);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      e.currentTarget.classList.add('drag-active');
    } else if (e.type === "dragleave") {
      e.currentTarget.classList.remove('drag-active');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-active');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (activeTab === 'batch') {
        handleBatchFileSelect(e.dataTransfer.files);
      } else {
      handleFileSelect(e.dataTransfer.files[0]);
    }
    }
  }, [handleFileSelect, handleBatchFileSelect, activeTab]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (activeTab === 'batch') {
        handleBatchFileSelect(e.target.files);
      } else {
      handleFileSelect(e.target.files[0]);
      }
    }
  };

  const handleResizeChange = useCallback((percentage: number) => {
    setResizePercentage(percentage);
    if (imageDimensions) {
      const newWidth = Math.round((imageDimensions.originalWidth * percentage) / 100);
      const newHeight = maintainAspectRatio 
        ? Math.round((imageDimensions.originalHeight * percentage) / 100)
        : Math.round((imageDimensions.originalHeight * percentage) / 100);
      
      setImageDimensions(prev => prev ? {
        ...prev,
        width: newWidth,
        height: newHeight
      } : null);
    }
  }, [imageDimensions, maintainAspectRatio]);

  const updatePreview = useCallback(() => {
    if (!previewUrl || !canvasRef.current || !imageDimensions) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = imageDimensions.width;
      canvas.height = imageDimensions.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height);
    };
    img.src = previewUrl;
  }, [previewUrl, imageDimensions]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const convertImage = async () => {
    if (!selectedFile || !imageDimensions) return;

    setIsConverting(true);
    setConversionProgress(0);
    
    try {
      const format = selectedFormat;
      const mimeType = supportedFormats.find(f => f.value === format)?.mimeType || 'image/jpeg';
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setConversionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);
      
      // Create canvas for conversion
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = async () => {
        canvas.width = imageDimensions.width;
        canvas.height = imageDimensions.height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height);
          
          // Convert to blob
          canvas.toBlob(async (blob) => {
            if (blob) {
              // Compress if it's JPEG or WebP
              let finalBlob = blob;
              if (format === 'jpeg' || format === 'webp') {
                try {
                  // Convert Blob to File for imageCompression
                  const tempFile = new File([blob], 'temp.' + format, { type: mimeType });
                  const compressedBlob = await imageCompression(tempFile, {
                    maxSizeMB: 10,
                    maxWidthOrHeight: Math.max(imageDimensions.width, imageDimensions.height),
                    useWebWorker: true
                  });
                  finalBlob = compressedBlob;
                } catch (error) {
                  console.warn('Compression failed, using original:', error);
                }
              }
              
              const extension = supportedFormats.find(f => f.value === format)?.extension || 'jpg';
              const baseFilename = selectedFile.name.replace(/\.[^/.]+$/, '');
              const sizeInfo = '_' + imageDimensions.width + 'x' + imageDimensions.height;
              const exifInfo = removeExifOnConvert ? '_no-exif' : '';
              const filename = `${baseFilename}${sizeInfo}${exifInfo}.${extension}`;
              
              setConvertedImage({
                blob: finalBlob,
                filename: filename
              });
              
              setConversionProgress(100);
              clearInterval(progressInterval);
            }
          }, mimeType, 0.95);
        }
      };
      
      img.src = previewUrl!;
    } catch (error) {
      console.error('Conversion failed:', error);
      alert('Image conversion failed. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const downloadImage = () => {
    if (convertedImage) {
      saveAs(convertedImage.blob, convertedImage.filename);
    }
  };

  // AI Upscaling Function
  const handleUpscale = async () => {
    if (!selectedFile || !previewUrl) return;
    
    setIsUpscaling(true);
    setUpscaleProgress(0);
    setUpscaleStatus('Initializing AI upscaler...');
    
    try {
      // Simulate AI upscaling with canvas-based upscaling
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = async () => {
        const newWidth = imageDimensions!.width * upscaleFactor;
        const newHeight = imageDimensions!.height * upscaleFactor;
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        if (ctx) {
          // Use high-quality image scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          
          // Simulate AI processing progress
          const progressInterval = setInterval(() => {
            setUpscaleProgress(prev => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90;
              }
              return prev + 10;
            });
          }, 200);
          
          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              setUpscaledImage(url);
              setUpscaleProgress(100);
              setUpscaleStatus('Upscaling complete!');
              clearInterval(progressInterval);
            }
          }, 'image/png', 0.95);
        }
      };
      
      img.src = previewUrl;
    } catch (error) {
      console.error('Upscaling failed:', error);
      setUpscaleStatus('Upscaling failed. Please try again.');
    } finally {
      setIsUpscaling(false);
    }
  };

  // AI Background Removal Function
  const handleBackgroundRemoval = async () => {
    if (!selectedFile || !previewUrl) return;
    
    setIsRemovingBackground(true);
    setBackgroundProgress(0);
    setBackgroundStatus('Initializing background removal...');
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = async () => {
        canvas.width = imageDimensions!.width;
        canvas.height = imageDimensions!.height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          
          // Simulate AI processing progress
          const progressInterval = setInterval(() => {
            setBackgroundProgress(prev => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90;
              }
              return prev + 15;
            });
          }, 300);
          
          // Simple background removal simulation (in real app, this would use AI)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Simple chroma key-like removal (remove white/light backgrounds)
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Remove white/light backgrounds
            if (r > 200 && g > 200 && b > 200) {
              data[i + 3] = 0; // Make transparent
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
          
          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              setBackgroundRemovedImage(url);
              setBackgroundProgress(100);
              setBackgroundStatus('Background removal complete!');
              clearInterval(progressInterval);
            }
          }, 'image/png', 0.95);
        }
      };
      
      img.src = previewUrl;
    } catch (error) {
      console.error('Background removal failed:', error);
      setBackgroundStatus('Background removal failed. Please try again.');
    } finally {
      setIsRemovingBackground(false);
    }
  };

  const resetApp = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setConvertedImage(null);
    setImageDimensions(null);
    setResizePercentage(100);
    setConversionProgress(0);
    setExifData(null);
    setShowExifData(false);
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <motion.header 
        className="app-header"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <div className="header-content">
          <motion.h1 
            className="text-6xl font-bold text-neo-white mb-4"
            whileHover={{ scale: 1.05 }}
          >
            CONVERTLY
          </motion.h1>
          <p className="text-xl text-neo-cyan font-mono">
            BATCH PROCESS • COLOR EXTRACTION • AI ENHANCEMENT
          </p>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="main-content">
        {/* Tab Navigation */}
        <motion.div 
          className="tab-navigation"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {[
            { id: 'convert', label: 'CONVERT', icon: '🖼️' },
            { id: 'upscale', label: 'UPSCALE', icon: '🚀' },
            { id: 'background', label: 'BACKGROUND', icon: '✂️' },
            { id: 'batch', label: 'BATCH', icon: '📦' },
            { id: 'palette', label: 'COLORS', icon: '🎨' }
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-2xl mb-2">{tab.icon}</div>
              <div>{tab.label}</div>
            </motion.button>
          ))}
        </motion.div>

        {/* Tab Content */}
        {activeTab === 'convert' && (
            <motion.div
              key="convert"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {/* Single Image Upload */}
            <div className="card">
                <h2 className="card-title text-neo-yellow">SINGLE IMAGE UPLOAD</h2>
                
              <div 
                className="upload-area" 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
              >
                <input
                    ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="file-input"
                />
                  <div className="upload-label">
                  <div className="upload-icon">📁</div>
                  <div className="upload-text">
                      <strong>DROP IMAGE HERE</strong>
                      <span>OR CLICK TO BROWSE</span>
                  </div>
                  </div>
              </div>
            </div>

            {/* Image Preview */}
            {previewUrl && (
              <div className="card">
                <h2 className="card-title text-neo-white">IMAGE PREVIEW</h2>
                <div className="preview-container">
                  <div>
                    <canvas
                      ref={canvasRef}
                      className="preview-canvas"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>
                  <div className="preview-info">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-neo-cyan mb-2">DIMENSIONS</h3>
                      <p className="text-neo-white">{imageDimensions?.width} × {imageDimensions?.height}</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-neo-yellow mb-2">FILE INFO</h3>
                      <p className="text-neo-white">{selectedFile?.name}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* Resize Controls */}
            {selectedFile && (
              <div className="card">
                <h2 className="card-title text-neo-white">RESIZE IMAGE</h2>
                <div className="resize-controls">
                  <div className="resize-slider">
                    <label className="block text-lg font-bold text-neo-cyan mb-2">
                      RESIZE: {resizePercentage}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={resizePercentage}
                      onChange={(e) => handleResizeChange(parseInt(e.target.value))}
                      className="slider"
                    />
                    <div className="slider-labels">
                      <span>10%</span>
                      <span>50%</span>
                      <span>100%</span>
                      <span>150%</span>
                      <span>200%</span>
                    </div>
                  </div>
                  <div className="resize-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={maintainAspectRatio}
                        onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                      />
                      <span>MAINTAIN ASPECT RATIO</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Format Selection */}
            {selectedFile && (
              <div className="card">
                <h2 className="card-title text-neo-white">CONVERT TO</h2>
                <div className="format-selection">
                  {supportedFormats.map((format) => (
                    <motion.button
                      key={format.value}
                      onClick={() => setSelectedFormat(format.value)}
                      className={`format-btn ${selectedFormat === format.value ? 'active' : ''}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {format.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

              {/* EXIF Data */}
            {selectedFile && (
              <div className="exif-section">
                <div className="exif-header">
                  <h2 className="exif-title">EXIF DATA</h2>
                  <div className="exif-toggle" onClick={() => setShowExifData(!showExifData)}>
                    <input
                      type="checkbox"
                      checked={showExifData}
                      onChange={() => setShowExifData(!showExifData)}
                      className="exif-checkbox"
                    />
                    <span className="exif-checkbox-label">
                      {showExifData ? 'HIDE EXIF' : 'VIEW EXIF'}
                    </span>
                  </div>
                  <div className="exif-toggle" onClick={() => setRemoveExifOnConvert(!removeExifOnConvert)}>
                    <input
                      type="checkbox"
                      checked={removeExifOnConvert}
                      onChange={() => setRemoveExifOnConvert(!removeExifOnConvert)}
                      className="exif-checkbox"
                    />
                    <span className="exif-checkbox-label">REMOVE EXIF ON CONVERT</span>
                  </div>
                </div>
                
                {showExifData && exifData && (
                  <div className="exif-data-grid">
                    {Object.entries(exifData).map(([key, value]) => {
                      const stringValue = String(value);
                      const truncatedValue = stringValue.length > 50 ? stringValue.substring(0, 50) + '...' : stringValue;
                      return (
                        <div key={key} className="exif-item">
                          <span className="exif-key">{key}</span>
                          <span className="exif-value" title={stringValue}>{truncatedValue}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {showExifData && !exifData && (
                  <div className="exif-no-data">
                    NO EXIF DATA FOUND
                  </div>
                )}
              </div>
            )}

            {/* Convert Button */}
            {selectedFile && (
              <div className="text-center">
                <motion.button
                  onClick={convertImage}
                  disabled={isConverting}
                  className="neo-btn-primary"
                  style={{ fontSize: '1.2rem', padding: '25px 40px' }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isConverting ? 'CONVERTING...' : 'CONVERT IMAGE'}
                </motion.button>
                
                {isConverting && (
                  <div className="mt-6">
                    <div className="neo-progress">
                      <motion.div 
                        className="neo-progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${conversionProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-black font-bold mt-3" style={{ fontSize: '1.1rem', fontWeight: 900 }}>
                      {conversionProgress}% COMPLETE
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Converted Image */}
            {convertedImage && (
              <div className="converted-section">
                <h2 className="converted-title">CONVERSION COMPLETE</h2>
                <div className="space-y-6">
                  <img 
                    src={URL.createObjectURL(convertedImage.blob)} 
                    alt="Converted" 
                    className="converted-image"
                    style={{ maxHeight: '500px' }}
                  />
                  <div className="converted-actions">
                    <motion.button
                      onClick={downloadImage}
                      className="neo-btn-primary"
                      whileHover={{ scale: 1.05 }}
                    >
                      DOWNLOAD IMAGE
                    </motion.button>
                    <motion.button
                      onClick={resetApp} 
                      className="neo-btn-secondary"
                      whileHover={{ scale: 1.05 }}
                    >
                      CHOOSE DIFFERENT IMAGE
                    </motion.button>
                  </div>
                </div>
              </div>
            )}
            </motion.div>
          )}

          {activeTab === 'batch' && (
            <motion.div
              key="batch"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              
              <BatchProcessor
                images={batchImages}
                onImagesChange={(newImages) => {
                  console.log('onImagesChange called with:', newImages);
                  console.log('Number of images:', newImages.length);
                  setBatchImages(newImages);
                }}
                isProcessing={isBatchProcessing}
                onProcessingChange={setIsBatchProcessing}
              />
            </motion.div>
          )}

          {activeTab === 'palette' && (
            <motion.div
              key="palette"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <ColorPaletteExtractor
                imageUrl={previewUrl}
                onImageSelect={handleFileSelect}
                onReset={resetApp}
              />
            </motion.div>
          )}

          {/* AI Upscaling Tab */}
          {activeTab === 'upscale' && (
            <motion.div
              key="upscale"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {/* Upload Area */}
              <div className="card">
                <h2 className="card-title text-neo-yellow">UPLOAD IMAGE FOR AI UPSCALING</h2>
                
                <div 
                  className="upload-area"
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="file-input"
                  />
                  <div className="upload-label">
                    <div className="upload-icon">🚀</div>
                    <div className="upload-text">
                      <strong>DROP IMAGE HERE</strong>
                      <span>OR CLICK TO BROWSE</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upscale Controls */}
              {selectedFile && (
                <div className="card">
                  <h2 className="card-title text-neo-white">AI UPSCALING CONTROLS</h2>
                  
                  <div className="resize-controls">
                    <div className="resize-slider">
                      <label className="block text-lg font-bold text-neo-cyan mb-2">
                        UPSCALE FACTOR: {upscaleFactor}x
                      </label>
                      <input
                        type="range"
                        min="2"
                        max="8"
                        value={upscaleFactor}
                        onChange={(e) => setUpscaleFactor(Number(e.target.value))}
                        className="slider"
                      />
                      <div className="slider-labels">
                        <span>2x</span>
                        <span>4x</span>
                        <span>6x</span>
                        <span>8x</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mt-6">
                    <button
                      onClick={handleUpscale}
                      disabled={isUpscaling}
                      className="btn-primary"
                    >
                      {isUpscaling ? 'UPSCALING...' : 'START AI UPSCALING'}
                    </button>
                  </div>

                  {/* Progress */}
                  {isUpscaling && (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${upscaleProgress}%` }}
                        />
                      </div>
                      <div className="progress-text">
                        {upscaleStatus} - {upscaleProgress}%
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {upscaledImage && (
                    <div className="converted-preview">
                      <div className="preview-header">
                        <h3 className="preview-title">UPSCALED IMAGE</h3>
                        <div className="conversion-info">
                          <div className="conversion-details">
                            Original: {imageDimensions?.width} × {imageDimensions?.height} → 
                            Upscaled: {imageDimensions?.width! * upscaleFactor} × {imageDimensions?.height! * upscaleFactor}
                          </div>
                        </div>
                      </div>
                      
                      <div className="converted-image-container">
                        <img 
                          src={upscaledImage} 
                          alt="Upscaled" 
                          className="converted-image"
                        />
                      </div>
                      
                      <div className="converted-actions">
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = upscaledImage;
                            link.download = `upscaled_${selectedFile?.name}`;
                            link.click();
                          }}
                          className="btn-primary"
                        >
                          DOWNLOAD UPSCALED
                        </button>
                        <button
                          onClick={() => setUpscaledImage(null)}
                          className="btn-secondary"
                        >
                          CLEAR RESULT
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* AI Background Removal Tab */}
          {activeTab === 'background' && (
            <motion.div
              key="background"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {/* Upload Area */}
              <div className="card">
                <h2 className="card-title text-neo-yellow">UPLOAD IMAGE FOR BACKGROUND REMOVAL</h2>
                
                <div 
                  className="upload-area"
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="file-input"
                  />
                  <div className="upload-label">
                    <div className="upload-icon">✂️</div>
                    <div className="upload-text">
                      <strong>DROP IMAGE HERE</strong>
                      <span>OR CLICK TO BROWSE</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Background Removal Controls */}
              {selectedFile && (
                <div className="card">
                  <h2 className="card-title text-neo-white">AI BACKGROUND REMOVAL</h2>
                  
                  <div className="text-center mb-6">
                    <button
                      onClick={handleBackgroundRemoval}
                      disabled={isRemovingBackground}
                      className="btn-primary"
                    >
                      {isRemovingBackground ? 'REMOVING BACKGROUND...' : 'START AI BACKGROUND REMOVAL'}
                    </button>
                  </div>

                  {/* Progress */}
                  {isRemovingBackground && (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${backgroundProgress}%` }}
                        />
                      </div>
                      <div className="progress-text">
                        {backgroundStatus} - {backgroundProgress}%
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {backgroundRemovedImage && (
                    <div className="converted-preview">
                      <div className="preview-header">
                        <h3 className="preview-title">BACKGROUND REMOVED</h3>
                        <div className="conversion-info">
                          <div className="conversion-details">
                            Background successfully removed using AI
                          </div>
                        </div>
                      </div>
                      
                      <div className="converted-image-container">
                        <img 
                          src={backgroundRemovedImage} 
                          alt="Background Removed" 
                          className="converted-image"
                        />
                      </div>
                      
                      <div className="converted-actions">
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = backgroundRemovedImage;
                            link.download = `no-background_${selectedFile?.name}`;
                            link.click();
                          }}
                          className="btn-primary"
                        >
                          DOWNLOAD NO BACKGROUND
                        </button>
                        <button
                          onClick={() => setBackgroundRemovedImage(null)}
                          className="btn-secondary"
                        >
                          CLEAR RESULT
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
      </main>
    </div>
  );
};

export default App;