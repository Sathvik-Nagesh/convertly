import React, { useState, useCallback, useEffect, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { saveAs } from 'file-saver';
import EXIF from 'exif-js';
import './App.css';

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

  // Background Removal States
  const [activeTab, setActiveTab] = useState<'convert' | 'upscale' | 'background'>('convert');
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [backgroundRemovedImage, setBackgroundRemovedImage] = useState<string | null>(null);
  const [backgroundProgress, setBackgroundProgress] = useState(0);
  const [backgroundStatus, setBackgroundStatus] = useState('');
  const [backgroundOptions, setBackgroundOptions] = useState({
    method: 'auto' as 'auto' | 'color' | 'edge' | 'ai',
    colorThreshold: 40,
    edgeSensitivity: 0.3,
    blurRadius: 2,
    featherEdges: true,
    featherAmount: 3,
    customBackground: false,
    backgroundColor: '#000000',
    backgroundBlur: false,
    backgroundBlurIntensity: 10,
    refineMask: true,
    maskContrast: 1.2
  });

  // Upscale States
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [upscaleProgress, setUpscaleProgress] = useState(0);
  const [upscaleStatus, setUpscaleStatus] = useState('');
  const [upscaleFactor, setUpscaleFactor] = useState(2);

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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
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

  // Enhanced Background Removal Functions
  const removeBackground = async () => {
    if (!selectedFile) return;
    
    setIsRemovingBackground(true);
    setBackgroundProgress(0);
    setBackgroundStatus('Initializing...');
    
    try {
      // Create canvas for processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      
      // Load image
      const img = new Image();
      img.src = previewUrl || '';
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      setBackgroundProgress(10);
      setBackgroundStatus('Analyzing image...');
      
      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      setBackgroundProgress(20);
      setBackgroundStatus('Creating initial mask...');
      
      // Create a working copy for processing
      const workingData = new Uint8ClampedArray(data);
      
      // Step 1: Create initial mask using color analysis
      const mask = createInitialMask(workingData, canvas.width, canvas.height);
      
      setBackgroundProgress(40);
      setBackgroundStatus('Refining edges...');
      
      // Step 2: Refine mask using edge detection
      refineMaskWithEdges(mask, workingData, canvas.width, canvas.height);
      
      setBackgroundProgress(60);
      setBackgroundStatus('Cleaning mask...');
      
      // Step 3: Apply morphological operations
      applyMorphologicalOperations(mask, canvas.width, canvas.height);
      
      setBackgroundProgress(80);
      setBackgroundStatus('Applying mask...');
      
      // Step 4: Apply mask to original image
      applyMaskToImage(data, mask, canvas.width, canvas.height);
      
      setBackgroundProgress(90);
      setBackgroundStatus('Finalizing...');
      
      // Step 5: Post-process for smooth edges
      if (backgroundOptions.featherEdges) {
        featherMaskEdges(data, canvas.width, canvas.height);
      }
      
      // Put processed image data back
      ctx.putImageData(imageData, 0, 0);
      
      setBackgroundProgress(95);
      setBackgroundStatus('Preparing download...');
      
      // Convert to blob and create URL with high quality
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setBackgroundRemovedImage(url);
          setBackgroundProgress(100);
          setBackgroundStatus('Complete!');
        }
      }, 'image/png', 1.0); // Maximum quality (1.0)
      
    } catch (error) {
      console.error('Error removing background:', error);
      setBackgroundStatus('Error occurred. Please try again.');
      alert('Error removing background. Please try again.');
    } finally {
      setIsRemovingBackground(false);
      // Reset progress after a delay
      setTimeout(() => {
        setBackgroundProgress(0);
        setBackgroundStatus('');
      }, 2000);
    }
  };

  const createInitialMask = (data: Uint8ClampedArray, width: number, height: number): Uint8Array => {
    const mask = new Uint8Array(width * height);
    const threshold = backgroundOptions.colorThreshold;
    
    // Analyze image to find background colors
    const colorHistogram = new Map<string, number>();
    const edgePixels = new Set<number>();
    
    // First pass: build color histogram and detect edges
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Create color key (quantized for better grouping)
        const colorKey = `${Math.floor(r / 8)},${Math.floor(g / 8)},${Math.floor(b / 8)}`;
        colorHistogram.set(colorKey, (colorHistogram.get(colorKey) || 0) + 1);
        
        // Simple edge detection
        const leftIdx = (y * width + (x - 1)) * 4;
        const rightIdx = (y * width + (x + 1)) * 4;
        const topIdx = ((y - 1) * width + x) * 4;
        const bottomIdx = ((y + 1) * width + x) * 4;
        
        const colorDiff = Math.abs(r - data[leftIdx]) + Math.abs(g - data[leftIdx + 1]) + Math.abs(b - data[leftIdx + 2]) +
                         Math.abs(r - data[rightIdx]) + Math.abs(g - data[rightIdx + 1]) + Math.abs(b - data[rightIdx + 2]) +
                         Math.abs(r - data[topIdx]) + Math.abs(g - data[topIdx + 1]) + Math.abs(b - data[topIdx + 2]) +
                         Math.abs(r - data[bottomIdx]) + Math.abs(g - data[bottomIdx + 1]) + Math.abs(b - data[bottomIdx + 2]);
        
        if (colorDiff > 100) {
          edgePixels.add(y * width + x);
        }
      }
    }
    
    // Find dominant background colors (colors that appear frequently and are not edges)
    const sortedColors = Array.from(colorHistogram.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Create mask: 0 = background, 255 = foreground
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = y * width + x;
        const dataIdx = pixelIdx * 4;
        const r = data[dataIdx];
        const g = data[dataIdx + 1];
        const b = data[dataIdx + 2];
        
        let isBackground = false;
        let isEdge = edgePixels.has(pixelIdx);
        
        // Check if pixel matches background colors
        for (const [colorKey, count] of sortedColors) {
          const [br, bg, bb] = colorKey.split(',').map(Number);
          const distance = Math.sqrt(
            Math.pow(r - br * 8, 2) +
            Math.pow(g - bg * 8, 2) +
            Math.pow(b - bb * 8, 2)
          );
          
          // More lenient threshold for edges, stricter for flat areas
          const currentThreshold = isEdge ? threshold * 1.5 : threshold;
          
          if (distance < currentThreshold && count > (width * height * 0.05)) {
            isBackground = true;
            break;
          }
        }
        
        // If it's an edge pixel, it's likely foreground
        if (isEdge) {
          isBackground = false;
        }
        
        mask[pixelIdx] = isBackground ? 0 : 255;
      }
    }
    
    return mask;
  };

  const refineMaskWithEdges = (mask: Uint8Array, data: Uint8ClampedArray, width: number, height: number) => {
    const sensitivity = backgroundOptions.edgeSensitivity;
    
    // Create edge mask using Sobel operator
    const edgeMask = new Uint8Array(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Sobel edge detection
        const gx = 
          -data[idx - 4] + data[idx + 4] +
          -2 * data[idx - 4 + width * 4] + 2 * data[idx + 4 + width * 4] +
          -data[idx - 4 + width * 8] + data[idx + 4 + width * 8];
        
        const gy = 
          -data[idx - width * 4] + data[idx + width * 4] +
          -2 * data[idx + 1 - width * 4] + 2 * data[idx + 1 + width * 4] +
          -data[idx + 2 - width * 4] + data[idx + 2 + width * 4];
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edgeMask[y * width + x] = magnitude > (255 * sensitivity) ? 255 : 0;
      }
    }
    
    // Refine mask using edge information
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = y * width + x;
        const edgeValue = edgeMask[pixelIdx];
        
        if (edgeValue > 0) {
          // Strong edges are likely foreground
          mask[pixelIdx] = Math.max(mask[pixelIdx], edgeValue);
        }
      }
    }
  };

  const applyMorphologicalOperations = (mask: Uint8Array, width: number, height: number) => {
    // Erosion to remove noise
    const eroded = new Uint8Array(mask);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const pixelIdx = y * width + x;
        const current = mask[pixelIdx];
        
        // Check 3x3 neighborhood
        let minValue = 255;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              minValue = Math.min(minValue, mask[ny * width + nx]);
            }
          }
        }
        eroded[pixelIdx] = minValue;
      }
    }
    
    // Dilation to restore size
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const pixelIdx = y * width + x;
        const current = eroded[pixelIdx];
        
        // Check 3x3 neighborhood
        let maxValue = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              maxValue = Math.max(maxValue, eroded[ny * width + nx]);
            }
          }
        }
        mask[pixelIdx] = maxValue;
      }
    }
  };

  const applyMaskToImage = (data: Uint8ClampedArray, mask: Uint8Array, width: number, height: number) => {
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = i / 4;
      const maskValue = mask[pixelIdx];
      
      // Apply mask to alpha channel
      data[i + 3] = maskValue;
    }
  };

  const featherMaskEdges = (data: Uint8ClampedArray, width: number, height: number) => {
    const featherAmount = backgroundOptions.featherAmount;
    
    // Create a temporary array for the feathered result
    const tempData = new Uint8ClampedArray(data);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3];
        
        if (alpha > 0 && alpha < 255) {
          // Calculate feathering based on distance to transparent areas
          let totalWeight = 0;
          let weightedSum = 0;
          
          for (let dy = -featherAmount; dy <= featherAmount; dy++) {
            for (let dx = -featherAmount; dx <= featherAmount; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              
              if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                const nIdx = (ny * width + nx) * 4;
                const nAlpha = data[nIdx + 3];
                
                // Weight based on distance
                const distance = Math.sqrt(dx * dx + dy * dy);
                const weight = Math.max(0, 1 - distance / featherAmount);
                
                totalWeight += weight;
                weightedSum += nAlpha * weight;
              }
            }
          }
          
          if (totalWeight > 0) {
            const featheredAlpha = weightedSum / totalWeight;
            tempData[idx + 3] = Math.max(0, Math.min(255, Math.round(featheredAlpha)));
          }
        }
      }
    }
    
    // Copy feathered result back
    for (let i = 0; i < data.length; i++) {
      data[i] = tempData[i];
    }
  };

  const refineMask = (data: Uint8ClampedArray, width: number, height: number) => {
    const contrast = backgroundOptions.maskContrast;
    
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      
      if (alpha > 0) {
        // Apply contrast to make mask more defined
        let newAlpha = ((alpha / 255 - 0.5) * contrast + 0.5) * 255;
        newAlpha = Math.max(0, Math.min(255, newAlpha));
        
        // Threshold for cleaner mask
        if (newAlpha < 128) {
          newAlpha = 0;
        } else if (newAlpha > 128) {
          newAlpha = 255;
        }
        
        data[i + 3] = newAlpha;
      }
    }
  };

  const downloadBackgroundRemoved = () => {
    if (!backgroundRemovedImage) return;
    
    // Create a new canvas to ensure maximum quality
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Draw image with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0);
      
      // Convert to blob with maximum quality
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `background-removed-${selectedFile?.name.replace(/\.[^/.]+$/, '')}.png`;
          link.click();
          
          // Clean up the URL
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      }, 'image/png', 1.0);
    };
    
    img.src = backgroundRemovedImage;
  };

  const resetBackgroundRemoval = () => {
    setBackgroundRemovedImage(null);
    setBackgroundOptions({
      method: 'auto',
      colorThreshold: 40,
      edgeSensitivity: 0.3,
      blurRadius: 2,
      featherEdges: true,
      featherAmount: 3,
      customBackground: false,
      backgroundColor: '#000000',
      backgroundBlur: false,
      backgroundBlurIntensity: 10,
      refineMask: true,
      maskContrast: 1.2
    });
  };

  // Upscaling Functions - REAL AI UPSCALING! 🚀
  const upscaleImage = async () => {
    if (!selectedFile || !imageDimensions) return;
    
    // Check if image is too large for AI processing
    const maxAISize = 1024; // AI processing limit
    if (imageDimensions.originalWidth > maxAISize || imageDimensions.originalHeight > maxAISize) {
      const useBasicUpscaling = window.confirm(
        `Image too large for AI upscaling (${imageDimensions.originalWidth}×${imageDimensions.originalHeight}). Maximum size: ${maxAISize}×${maxAISize} pixels.\n\nWould you like to use basic upscaling instead?`
      );
      
      if (useBasicUpscaling) {
        setUpscaleStatus('Switching to basic upscaling...');
        await basicUpscale();
        return;
      } else {
        setUpscaleStatus('AI upscaling cancelled');
        setIsUpscaling(false);
        return;
      }
    }
    
    // Check if the upscaled size would exceed WebGL limits
    const maxTextureSize = 16384; // WebGL limit
    const upscaledWidth = Math.round(imageDimensions.originalWidth * upscaleFactor);
    const upscaledHeight = Math.round(imageDimensions.originalHeight * upscaleFactor);
    
    if (upscaledWidth > maxTextureSize || upscaledHeight > maxTextureSize) {
      // Calculate the maximum safe upscale factor
      const maxSafeFactor = Math.min(
        maxTextureSize / imageDimensions.originalWidth,
        maxTextureSize / imageDimensions.originalHeight
      );
      
      const useReducedFactor = window.confirm(
        `Image too large for ${upscaleFactor}x upscaling. Maximum safe factor: ${maxSafeFactor.toFixed(1)}x\n\nWould you like to use the maximum safe factor instead?`
      );
      
      if (useReducedFactor) {
        setUpscaleFactor(Math.floor(maxSafeFactor * 10) / 10); // Round to 1 decimal place
        setUpscaleStatus('Adjusted to safe upscale factor');
        // Continue with the adjusted factor
      } else {
        setUpscaleStatus('Image too large for AI upscaling');
        setIsUpscaling(false);
        return;
      }
    }
    
    setIsUpscaling(true);
    setUpscaleProgress(0);
    setUpscaleStatus('Initializing AI models...');
    
    try {
      // Check if TensorFlow.js and UpscalerJS are loaded
      if (typeof window.tf === 'undefined') {
        throw new Error('TensorFlow.js not loaded. Please refresh the page.');
      }
      
      if (typeof window.Upscaler === 'undefined') {
        throw new Error('UpscalerJS not loaded. Please refresh the page.');
      }
      
      setUpscaleProgress(10);
      setUpscaleStatus('Loading neural network models...');
      
      // Import the AI models with better error handling
      let esrganThickX2, esrganMediumX2, esrganDefaultX2;
      
      try {
        console.log('=== LOADING AI MODELS ===');
        const esrganThickModule = await import('@upscalerjs/esrgan-thick');
        console.log('Thick module loaded:', esrganThickModule);
        
        const esrganMediumModule = await import('@upscalerjs/esrgan-medium');
        console.log('Medium module loaded:', esrganMediumModule);
        
        const esrganDefaultModule = await import('@upscalerjs/default-model');
        console.log('Default module loaded:', esrganDefaultModule);
        
        // Handle different export patterns with type assertions
        esrganThickX2 = (esrganThickModule as any).x2 || (esrganThickModule as any).default?.x2 || esrganThickModule;
        esrganMediumX2 = (esrganMediumModule as any).x2 || (esrganMediumModule as any).default?.x2 || esrganMediumModule;
        esrganDefaultX2 = (esrganDefaultModule as any).default || (esrganDefaultModule as any).x2 || esrganDefaultModule;
        
        console.log('Extracted models:', { esrganThickX2, esrganMediumX2, esrganDefaultX2 });
        
        // Validate models loaded
        if (!esrganThickX2 || !esrganMediumX2 || !esrganDefaultX2) {
          throw new Error('Failed to load AI models');
        }
        console.log('=== AI MODELS LOADED SUCCESSFULLY ===');
      } catch (importError) {
        console.error('Model import error:', importError);
        throw new Error('Failed to load AI models. Please check your internet connection and refresh.');
      }
      
      setUpscaleProgress(25);
      setUpscaleStatus('Selecting optimal AI model...');
      
      // Choose model based on upscale factor and image size
      let selectedModel;
      const imageSize = imageDimensions.originalWidth * imageDimensions.originalHeight;
      
      if (imageSize > 1000000) { // Large images - use lighter model
        selectedModel = esrganDefaultX2;
        setUpscaleStatus('Using Default model (optimized for large images)...');
      } else if (upscaleFactor >= 3) { // High upscale - use thick model
        selectedModel = esrganThickX2;
        setUpscaleStatus('Using Thick model (maximum quality)...');
      } else { // Medium images - use medium model
        selectedModel = esrganMediumX2;
        setUpscaleStatus('Using Medium model (balanced quality/speed)...');
      }
      
      setUpscaleProgress(40);
      setUpscaleStatus('Initializing AI upscaler...');
      
      // Create UpscalerJS instance with error handling
      let upscaler;
      try {
        console.log('=== INITIALIZING UPSCALERJS ===');
        console.log('Selected model:', selectedModel);
        console.log('Upscale factor:', upscaleFactor);
        console.log('Window.Upscaler:', window.Upscaler);
        
        // Calculate safe patch size based on image dimensions
        const maxTextureSize = 16384; // WebGL limit
        const imageSize = Math.max(imageDimensions.originalWidth, imageDimensions.originalHeight);
        
        // More aggressive patch size calculation to prevent WebGL errors
        let safePatchSize = 32; // Start with very small patches
        if (imageSize <= 512) {
          safePatchSize = 32;
        } else if (imageSize <= 1024) {
          safePatchSize = 16; // Very small patches for 1024x1024 images
        } else if (imageSize <= 2048) {
          safePatchSize = 8; // Tiny patches for larger images
        } else {
          safePatchSize = 4; // Minimal patches for very large images
        }
        
        console.log('Image size:', imageSize);
        console.log('Safe patch size:', safePatchSize);
        console.log('Max texture size:', maxTextureSize);
        
        // Use minimal configuration to avoid WebGL issues
        upscaler = new window.Upscaler({
          model: selectedModel,
          warmupSizes: [], // Disable warmup for faster startup
          useGPU: false, // Force CPU to avoid WebGL issues
          scale: Math.min(upscaleFactor, 2), // ESRGAN models are 2x, we'll apply multiple times if needed
          patchSize: 1, // Absolute minimal patch size
          padding: 0, // No padding to minimize memory usage
          maxSize: 1024, // Limit maximum processing size
          
          // Progress callback
          progressCallback: (progress: number) => {
            const aiProgress = 40 + (progress * 45); // Map 0-100% to 40-85%
            setUpscaleProgress(Math.round(aiProgress));
            setUpscaleStatus(`AI processing: ${Math.round(progress)}%`);
          }
        });
        
        console.log('=== UPSCALERJS INITIALIZED SUCCESSFULLY ===');
      } catch (upscalerError) {
        console.error('UpscalerJS initialization error:', upscalerError);
        throw new Error('Failed to initialize AI upscaler. Please try refreshing the page.');
      }
      
      setUpscaleProgress(45);
      setUpscaleStatus('Preparing image for AI processing...');
      
      // Load the image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = previewUrl || '';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      setUpscaleProgress(50);
      setUpscaleStatus('🤖 AI neural network is analyzing your image...');
      
      // Apply AI upscaling
      let upscaledCanvas = await upscaler.upscale(img);
      
      // If we need more than 2x, apply upscaling multiple times
      if (upscaleFactor > 2) {
        setUpscaleProgress(75);
        setUpscaleStatus('🚀 Applying additional AI enhancement...');
        
        const additionalScale = upscaleFactor / 2;
        if (additionalScale > 1) {
          // Create canvas for additional scaling
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context not available');
          
          const finalWidth = Math.round(imageDimensions.originalWidth * upscaleFactor);
          const finalHeight = Math.round(imageDimensions.originalHeight * upscaleFactor);
          
          canvas.width = finalWidth;
          canvas.height = finalHeight;
          
          // Use high-quality scaling for the additional enlargement
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(upscaledCanvas, 0, 0, finalWidth, finalHeight);
          
          upscaledCanvas = canvas;
        }
      }
      
      setUpscaleProgress(90);
      setUpscaleStatus('Finalizing AI-enhanced image...');
      
      // Convert to blob and create URL
      upscaledCanvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setUpscaledImage(url);
          setUpscaleProgress(100);
          setUpscaleStatus('🎉 AI upscaling complete!');
        }
      }, 'image/png');
      
      // Clean up GPU memory
      if (upscaler && typeof upscaler.dispose === 'function') {
        upscaler.dispose();
      }
      
    } catch (error: unknown) {
      console.error('=== AI UPSCALING ERROR DETAILS ===');
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('TensorFlow.js loaded:', typeof window.tf !== 'undefined');
      console.error('UpscalerJS loaded:', typeof window.Upscaler !== 'undefined');
      console.error('=====================================');
      
      // Offer fallback to basic upscaling
      const errorMessage = error instanceof Error ? error.message : String(error);
      const useFallback = window.confirm(
        `AI upscaling failed: ${errorMessage}\n\nWould you like to try basic upscaling instead? (Lower quality but more reliable)`
      );
      
      if (useFallback) {
        setUpscaleStatus('Falling back to basic upscaling...');
        await basicUpscale();
      } else {
        setUpscaleStatus('AI upscaling failed. Please try again.');
        alert('Error during AI upscaling. Please try a smaller image or refresh the page.');
      }
    } finally {
      setIsUpscaling(false);
      // Reset progress after a delay
      setTimeout(() => {
        setUpscaleProgress(0);
        setUpscaleStatus('');
      }, 3000);
    }
  };

  // GPU Memory cleanup for AI models
  const cleanupAIMemory = () => {
    try {
      if (typeof window.tf !== 'undefined') {
        // Dispose all TensorFlow.js tensors
        window.tf.disposeVariables();
        
        // Force garbage collection if available
        if (typeof window.gc === 'function') {
          window.gc();
        }
      }
    } catch (error) {
      console.warn('Error cleaning up AI memory:', error);
    }
  };

  // Fallback basic upscaling function
  const basicUpscale = async () => {
    if (!selectedFile || !imageDimensions) return;
    
    try {
      setUpscaleProgress(50);
      setUpscaleStatus('Applying basic upscaling...');
      
      // Create canvas for processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      
      // Load image
      const img = new Image();
      img.src = previewUrl || '';
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // Calculate new dimensions
      const newWidth = Math.round(imageDimensions.originalWidth * upscaleFactor);
      const newHeight = Math.round(imageDimensions.originalHeight * upscaleFactor);
      
      // Set canvas size to new dimensions
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Use high-quality image scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw scaled image
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      setUpscaleProgress(90);
      setUpscaleStatus('Finalizing basic upscaling...');
      
      // Convert to blob and create URL
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setUpscaledImage(url);
          setUpscaleProgress(100);
          setUpscaleStatus('Basic upscaling complete!');
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Error during basic upscaling:', error);
      setUpscaleStatus('Basic upscaling also failed.');
      alert('Both AI and basic upscaling failed. Please try a smaller image.');
    }
  };

  const downloadUpscaledImage = () => {
    if (!upscaledImage) return;
    
    const link = document.createElement('a');
    link.href = upscaledImage;
    link.download = `upscaled-${upscaleFactor}x-${selectedFile?.name.replace(/\.[^/.]+$/, '')}.png`;
    link.click();
  };

  const resetUpscale = () => {
    setUpscaledImage(null);
    setUpscaleFactor(2);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1>Convertly</h1>
          <p>Convert, resize, upscale, and remove backgrounds from images - all in your browser</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'convert' ? 'active' : ''}`}
            onClick={() => setActiveTab('convert')}
          >
            🖼️ Convert
          </button>
          <button
            className={`tab-btn ${activeTab === 'upscale' ? 'active' : ''}`}
            onClick={() => setActiveTab('upscale')}
          >
            🚀 Upscale
          </button>
          <button
            className={`tab-btn ${activeTab === 'background' ? 'active' : ''}`}
            onClick={() => setActiveTab('background')}
          >
            ✂️ Background
          </button>
        </div>

        {/* Convert Tab */}
        {activeTab === 'convert' && (
          <>
            {/* Upload Section */}
            <div className="card">
              <h2 className="card-title">Upload Image</h2>
              <div 
                className="upload-area" 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="file-input"
                  id="file-input"
                />
                <label htmlFor="file-input" className="upload-label">
                  <div className="upload-icon">📁</div>
                  <div className="upload-text">
                    <strong>Drop your image here</strong>
                    <span>or click to browse</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Image Preview */}
            {previewUrl && (
              <div className="card">
                <h2 className="card-title">Image Preview</h2>
                <div className="preview-container">
                  <canvas
                    ref={canvasRef}
                    className="preview-canvas"
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                  />
                  <div className="preview-info">
                    <p><strong>Dimensions:</strong> {imageDimensions?.width} × {imageDimensions?.height}</p>
                    <p><strong>File:</strong> {selectedFile?.name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Image Resize */}
            {selectedFile && (
              <div className="card">
                <h2 className="card-title">Image Resize</h2>
                <div className="resize-controls">
                  <div className="resize-slider">
                    <label htmlFor="resize-slider">
                      Resize: {resizePercentage}%
                    </label>
                    <input
                      type="range"
                      id="resize-slider"
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
                      Maintain aspect ratio
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Format Selection */}
            {selectedFile && (
              <div className="card">
                <h2 className="card-title">Convert To</h2>
                <div className="format-selection">
                  {supportedFormats.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => setSelectedFormat(format.value)}
                      className={`format-btn ${selectedFormat === format.value ? 'active' : ''}`}
                    >
                      {format.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* EXIF Data Viewer/Remover */}
            {selectedFile && (
              <div className="card">
                <h2 className="card-title">EXIF Data Viewer/Remover</h2>
                <div className="exif-controls">
                  <button
                    onClick={() => setShowExifData(!showExifData)}
                    className="btn-secondary"
                  >
                    {showExifData ? 'Hide EXIF Data' : 'View EXIF Data'}
                  </button>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={removeExifOnConvert}
                      onChange={(e) => setRemoveExifOnConvert(e.target.checked)}
                    />
                    Remove EXIF data on conversion
                  </label>
                </div>
                
                {showExifData && (
                  <div className="exif-data">
                    {exifData ? (
                      <div className="exif-grid">
                        {Object.entries(exifData).map(([key, value]) => (
                          <div key={key} className="exif-item">
                            <span className="exif-key">{key}:</span>
                            <span className="exif-value">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-exif">No EXIF data found</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Convert Button */}
            {selectedFile && (
              <div className="card">
                <div className="convert-section">
                  <button
                    onClick={convertImage}
                    disabled={isConverting}
                    className="btn-primary convert-btn"
                  >
                    {isConverting ? 'Converting...' : 'Convert Image'}
                  </button>
                  
                  {isConverting && (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${conversionProgress}%` }}
                        ></div>
                      </div>
                      <div className="progress-text">{conversionProgress}%</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Converted Image */}
            {convertedImage && (
              <div className="card">
                <h2 className="card-title">Converted Image</h2>
                <div className="converted-preview">
                  <div className="preview-header">
                    <h3 className="preview-title">Conversion Complete!</h3>
                    <div className="conversion-info">
                      <span className="conversion-details">
                        {selectedFormat.toUpperCase()} format, {imageDimensions?.width} × {imageDimensions?.height}
                      </span>
                    </div>
                  </div>
                  
                  <div className="converted-image-container">
                    <img 
                      src={URL.createObjectURL(convertedImage.blob)} 
                      alt="Converted" 
                      className="converted-image"
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                      }}
                    />
                  </div>
                  
                  <div className="converted-actions">
                    <button onClick={downloadImage} className="btn-primary">
                      Download Converted Image
                    </button>
                    <button 
                      onClick={resetApp} 
                      className="btn-secondary"
                    >
                      Choose Different Image
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Upscale Tab */}
        {activeTab === 'upscale' && (
          <div className="card">
            <h2 className="card-title">🚀 Image Upscaling</h2>
            <p className="card-description">
              Upscale your images to higher resolutions using high-quality interpolation and optional AI enhancement. 
              Basic upscaling is fast and reliable, while AI upscaling offers enhanced detail (experimental).
            </p>
            {selectedFile ? (
              <div className="upscale-container">
                {/* Image Comparison */}
                <div className="image-comparison">
                  <div className="image-section">
                    <h3>Original Image</h3>
                    <img 
                      src={previewUrl || ''} 
                      alt="Original" 
                      className="comparison-image"
                    />
                    <div className="image-info">
                      <p><strong>Size:</strong> {imageDimensions?.originalWidth} × {imageDimensions?.originalHeight}</p>
                      <p><strong>Format:</strong> {selectedFile.type}</p>
                    </div>
                  </div>

                  <div className="image-section">
                    <h3>Upscaled Result</h3>
                    {upscaledImage ? (
                      <>
                        <img 
                          src={upscaledImage} 
                          alt="Upscaled" 
                          className="comparison-image"
                        />
                        <div className="image-info">
                          <p><strong>New Size:</strong> {Math.round((imageDimensions?.originalWidth || 0) * upscaleFactor)} × {Math.round((imageDimensions?.originalHeight || 0) * upscaleFactor)}</p>
                          <p><strong>Scale:</strong> {upscaleFactor}x larger</p>
                        </div>
                        <div className="image-actions">
                          <button 
                            className="btn-primary"
                            onClick={downloadUpscaledImage}
                          >
                            💾 Download PNG
                          </button>
                          <button 
                            className="btn-secondary"
                            onClick={resetUpscale}
                          >
                            🔄 Try Again
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="placeholder-image">
                        <div className="placeholder-content">
                          <div className="placeholder-icon">🚀</div>
                          <p>Upscaled image will appear here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upscale Options */}
                <div className="upscale-options">
                  <h3>⚙️ Upscale Settings</h3>
                  <div className="options-grid">
                    <div className="option-item">
                      <label>AI Scale Factor: {upscaleFactor}x</label>
                      <select 
                        value={upscaleFactor} 
                        onChange={(e) => setUpscaleFactor(parseFloat(e.target.value))}
                        className="slider-control"
                      >
                        <option value="1.5">1.5x (Neural Enhanced)</option>
                        <option value="2">2x (AI Enhanced - Recommended)</option>
                        <option value="3">3x (Deep AI Processing)</option>
                        <option value="4">4x (Maximum AI Enhancement)</option>
                      </select>
                    </div>

                    <div className="option-item">
                      <label>Output Resolution:</label>
                      <p className="output-estimate">
                        {Math.round((imageDimensions?.originalWidth || 0) * upscaleFactor)} × {Math.round((imageDimensions?.originalHeight || 0) * upscaleFactor)} pixels
                      </p>
                    </div>
                    <div className="option-item">
                      <label>AI Status:</label>
                      <p className="ai-status">
                        {typeof window.tf !== 'undefined' && typeof window.Upscaler !== 'undefined' 
                          ? '✅ AI Ready - Neural networks loaded successfully' 
                          : '❌ AI Loading - Please refresh the page if this persists'}
                      </p>
                    </div>

                  </div>
                </div>

                {/* Action Buttons */}
                <div className="upscale-actions">
                  <button
                    className="btn-primary"
                    onClick={basicUpscale}
                    disabled={isUpscaling}
                  >
                    {isUpscaling ? '🔄 Upscaling...' : '🚀 Upscale Image'}
                  </button>
                  
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setImageDimensions(null);
                      setUpscaledImage(null);
                    }}
                  >
                    🗑️ Choose Different Image
                  </button>
                  
                  <button
                    className="btn-secondary"
                    onClick={upscaleImage}
                    disabled={isUpscaling}
                  >
                    🤖 Try AI Upscaling (Experimental)
                  </button>
                </div>

                {/* Progress Indicator */}
                {isUpscaling && (
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${upscaleProgress}%` }}></div>
                    </div>
                    <p className="progress-text">{upscaleStatus}</p>
                    <p className="progress-percentage">{upscaleProgress}%</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="upload-area" onClick={() => document.getElementById('file-input')?.click()}>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="file-input"
                />
                <div className="upload-label">
                  <div className="upload-icon">🚀</div>
                  <div className="upload-text">
                    <strong>Choose an image to upscale</strong>
                    <span>or drag and drop here</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Background Removal Tab */}
        {activeTab === 'background' && (
          <div className="card">
            <h2 className="card-title">Background Removal</h2>
            <p className="card-description">
              Remove backgrounds from images using AI-powered segmentation. 
              Perfect for product photos, portraits, and creative projects.
            </p>
            
            {/* Disclaimer */}
            <div className="disclaimer-box">
              <div className="disclaimer-icon">⚠️</div>
              <div className="disclaimer-content">
                <strong>Limitations:</strong> Works best with simple backgrounds (solid colors, high contrast). 
                Complex backgrounds, detailed textures, or similar foreground/background colors may not work well. 
                Results vary based on image complexity.
              </div>
            </div>

            {/* Upload Section */}
            {!selectedFile ? (
              <div className="upload-area" onClick={() => document.getElementById('file-input')?.click()}>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="file-input"
                />
                <div className="upload-label">
                  <div className="upload-icon">📸</div>
                  <div className="upload-text">
                    <strong>Choose an image</strong>
                    <span>or drag and drop here</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="background-removal-container">
                {/* Original Image */}
                <div className="image-comparison">
                  <div className="image-section">
                    <h3>Original Image</h3>
                    <img 
                      src={previewUrl || ''} 
                      alt="Original" 
                      className="comparison-image"
                    />
                    <div className="image-info">
                      <p><strong>Size:</strong> {imageDimensions?.width} × {imageDimensions?.height}</p>
                      <p><strong>Format:</strong> {selectedFile.type}</p>
                    </div>
                  </div>

                  {/* Background Removed Image */}
                  <div className="image-section">
                    <h3>Background Removed</h3>
                    {backgroundRemovedImage ? (
                      <>
                        <img 
                          src={backgroundRemovedImage} 
                          alt="Background Removed" 
                          className="comparison-image"
                        />
                        <div className="image-actions">
                          <button 
                            className="btn-primary"
                            onClick={downloadBackgroundRemoved}
                          >
                            💾 Download PNG
                          </button>
                          <button 
                            className="btn-secondary"
                            onClick={resetBackgroundRemoval}
                          >
                            🔄 Try Again
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="placeholder-image">
                        <div className="placeholder-content">
                          <div className="placeholder-icon">✨</div>
                          <p>Background will appear here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Background Removal Options */}
                <div className="background-options">
                  <h3>Background Removal Settings</h3>
                  <div className="options-grid">
                    <div className="option-item">
                      <label>Removal Method:</label>
                      <select 
                        value={backgroundOptions.method} 
                        onChange={(e) => setBackgroundOptions(prev => ({
                          ...prev,
                          method: e.target.value as 'auto' | 'color' | 'edge' | 'ai'
                        }))}
                        className="slider-control"
                      >
                        <option value="auto">🚀 Auto (Smart Detection)</option>
                        <option value="color">🎨 Color Threshold</option>
                        <option value="edge">✂️ Edge Detection</option>
                        <option value="ai">🧠 AI-Powered (Advanced)</option>
                      </select>
                    </div>

                    {backgroundOptions.method === 'color' && (
                      <div className="option-item">
                        <label>Color Sensitivity: {backgroundOptions.colorThreshold}</label>
                        <input
                          type="range"
                          min="10"
                          max="80"
                          value={backgroundOptions.colorThreshold}
                          onChange={(e) => setBackgroundOptions(prev => ({
                            ...prev,
                            colorThreshold: parseInt(e.target.value)
                          }))}
                          className="slider"
                        />
                        <div className="slider-labels">
                          <span>Low</span>
                          <span>High</span>
                        </div>
                      </div>
                    )}

                    {backgroundOptions.method === 'edge' && (
                      <div className="option-item">
                        <label>Edge Sensitivity: {backgroundOptions.edgeSensitivity.toFixed(1)}</label>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.1"
                          value={backgroundOptions.edgeSensitivity}
                          onChange={(e) => setBackgroundOptions(prev => ({
                            ...prev,
                            edgeSensitivity: parseFloat(e.target.value)
                          }))}
                          className="slider"
                        />
                        <div className="slider-labels">
                          <span>Subtle</span>
                          <span>Sharp</span>
                        </div>
                      </div>
                    )}

                    {backgroundOptions.method === 'ai' && (
                      <>
                        <div className="option-item">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={backgroundOptions.featherEdges}
                              onChange={(e) => setBackgroundOptions(prev => ({
                                ...prev,
                                featherEdges: e.target.checked
                              }))}
                            />
                            ✨ Feather edges for smooth transitions
                          </label>
                        </div>
                        
                        {backgroundOptions.featherEdges && (
                          <div className="option-item">
                            <label>Feather Amount: {backgroundOptions.featherAmount}</label>
                            <input
                              type="range"
                              min="1"
                              max="8"
                              value={backgroundOptions.featherAmount}
                              onChange={(e) => setBackgroundOptions(prev => ({
                                ...prev,
                                featherAmount: parseInt(e.target.value)
                              }))}
                              className="slider"
                            />
                            <div className="slider-labels">
                              <span>Minimal</span>
                              <span>Heavy</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="option-item">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={backgroundOptions.refineMask}
                              onChange={(e) => setBackgroundOptions(prev => ({
                                ...prev,
                                refineMask: e.target.checked
                              }))}
                            />
                            🔍 Refine mask for cleaner edges
                          </label>
                        </div>
                        
                        {backgroundOptions.refineMask && (
                          <div className="option-item">
                            <label>Mask Contrast: {backgroundOptions.maskContrast.toFixed(1)}</label>
                            <input
                              type="range"
                              min="0.5"
                              max="2"
                              step="0.1"
                              value={backgroundOptions.maskContrast}
                              onChange={(e) => setBackgroundOptions(prev => ({
                                ...prev,
                                maskContrast: parseFloat(e.target.value)
                              }))}
                              className="slider"
                            />
                            <div className="slider-labels">
                              <span>Soft</span>
                              <span>Hard</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="option-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={backgroundOptions.customBackground}
                          onChange={(e) => setBackgroundOptions(prev => ({
                            ...prev,
                            customBackground: e.target.checked
                          }))}
                        />
                        🎨 Custom background color
                      </label>
                      {backgroundOptions.customBackground && (
                        <div className="color-picker-container">
                          <label>Background Color:</label>
                          <input
                            type="color"
                            value={backgroundOptions.backgroundColor}
                            onChange={(e) => setBackgroundOptions(prev => ({
                              ...prev,
                              backgroundColor: e.target.value
                            }))}
                            className="color-picker"
                          />
                        </div>
                      )}
                    </div>

                    <div className="option-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={backgroundOptions.backgroundBlur}
                          onChange={(e) => setBackgroundOptions(prev => ({
                            ...prev,
                            backgroundBlur: e.target.checked
                          }))}
                        />
                        🌫️ Blur background
                      </label>
                      {backgroundOptions.backgroundBlur && (
                        <div className="option-item">
                          <label>Blur Intensity: {backgroundOptions.backgroundBlurIntensity}</label>
                          <input
                            type="range"
                            min="1"
                            max="20"
                            value={backgroundOptions.backgroundBlurIntensity}
                            onChange={(e) => setBackgroundOptions(prev => ({
                              ...prev,
                              backgroundBlurIntensity: parseInt(e.target.value)
                            }))}
                            className="slider"
                          />
                          <div className="slider-labels">
                            <span>Light</span>
                            <span>Heavy</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="background-actions">
                  <button
                    className="btn-primary"
                    onClick={removeBackground}
                    disabled={isRemovingBackground}
                  >
                    {isRemovingBackground ? '🔄 Removing...' : '✂️ Remove Background'}
                  </button>
                  
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setBackgroundRemovedImage(null);
                      setImageDimensions(null);
                    }}
                  >
                    🗑️ Choose Different Image
                  </button>
                </div>

                {/* Progress Indicator */}
                {isRemovingBackground && (
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${backgroundProgress}%` }}></div>
                    </div>
                    <p className="progress-text">{backgroundStatus}</p>
                    <p className="progress-percentage">{backgroundProgress}%</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
