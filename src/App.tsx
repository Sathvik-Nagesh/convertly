import React, { useState, useCallback, useRef, useEffect } from 'react';
import { saveAs } from 'file-saver';
import imageCompression from 'browser-image-compression';
import EXIF from 'exif-js';
import './App.css';

interface ConvertedImage {
  blob: Blob;
  format: string;
  filename: string;
}

interface ImageDimensions {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

interface ExifData {
  [key: string]: any;
}

const supportedFormats = [
  { value: 'jpeg', label: 'JPEG', mimeType: 'image/jpeg', extension: 'jpg' },
  { value: 'png', label: 'PNG', mimeType: 'image/png', extension: 'png' },
  { value: 'webp', label: 'WebP', mimeType: 'image/webp', extension: 'webp' },
  { value: 'gif', label: 'GIF', mimeType: 'image/gif', extension: 'gif' },
  { value: 'bmp', label: 'BMP', mimeType: 'image/bmp', extension: 'bmp' }
];

const formatExplanations = {
  jpeg: 'JPEG is a lossy compression format ideal for photographs. It offers good compression but may lose some image quality.',
  png: 'PNG is a lossless format that preserves image quality perfectly. Great for graphics, logos, and images with text.',
  webp: 'WebP is a modern format by Google that provides excellent compression while maintaining quality. Great for web use.',
  gif: 'GIF supports animation and transparency but has limited color palette. Best for simple graphics and animations.',
  bmp: 'BMP is an uncompressed format that preserves all image data but results in large file sizes.'
};

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('jpeg');
  const [isConverting, setIsConverting] = useState(false);
  const [convertedImage, setConvertedImage] = useState<ConvertedImage | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showFormatInfo, setShowFormatInfo] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [resizePercentage, setResizePercentage] = useState(100);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [showExifData, setShowExifData] = useState(false);
  const [removeExifOnConvert, setRemoveExifOnConvert] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
          width: img.width,
          height: img.height,
          originalWidth: img.width,
          originalHeight: img.height
        });
      };
      img.src = url;
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
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
              const filename = baseFilename + sizeInfo + exifInfo + '.' + extension;
              
              setConvertedImage({
                blob: finalBlob,
                format,
                filename
              });
              
              setConversionProgress(100);
              clearInterval(progressInterval);
            }
          }, mimeType, format === 'jpeg' ? 0.9 : 1.0);
        }
      };
      
      img.src = previewUrl!;
    } catch (error) {
      console.error('Conversion error:', error);
      alert('Error converting image. Please try again.');
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

  const handleNewFileSelect = (file: File) => {
    // Clear previous data first
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setConvertedImage(null);
    setImageDimensions(null);
    setResizePercentage(100);
    setConversionProgress(0);
    setExifData(null);
    setShowExifData(false);
    
    // Then select new file
    handleFileSelect(file);
  };

  return (
    <div className="app-container">
      <div className="app-content">
        {/* Header */}
        <div className="header">
          <h1 className="title">Convertly</h1>
          <p className="subtitle">Convert and resize your images to any format, right in your browser</p>
        </div>

        <div className="main-content">
          {/* Upload Section */}
          <div className="card">
            <h2 className="card-title">Upload Image</h2>
            
            <div
              className={`upload-area ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {!previewUrl ? (
                <div className="upload-content">
                  <div className="upload-icon">📁</div>
                  <p className="upload-text">
                    Drag and drop your image here, or click to browse
                  </p>
                  <p className="upload-formats">
                    Supports: JPG, PNG, WebP, GIF, BMP
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="file-input"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="btn-primary">
                    Choose File
                  </label>
                </div>
              ) : (
                <div className="preview-content">
                  <div className="preview-header">
                    <h3 className="preview-title">Image Preview</h3>
                    <div className="dimensions-info">
                      {imageDimensions && (
                        <span className="dimensions-text">
                          {imageDimensions.width} × {imageDimensions.height} px
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="canvas-container">
                    <canvas 
                      ref={canvasRef}
                      className="image-canvas"
                      style={{
                        width: imageDimensions ? Math.min(imageDimensions.width, 400) : 'auto',
                        height: imageDimensions ? 'auto' : 'auto'
                      }}
                    />
                  </div>
                  
                  <div className="preview-actions">
                    <button onClick={resetApp} className="btn-secondary">
                      Choose Different Image
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resize Section */}
          {imageDimensions && (
            <div className="card">
              <h2 className="card-title">Resize Image</h2>
              
              <div className="resize-controls">
                <div className="resize-slider-container">
                  <label className="resize-label">
                    Size: {resizePercentage}% of original
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={resizePercentage}
                    onChange={(e) => handleResizeChange(parseInt(e.target.value))}
                    className="resize-slider"
                  />
                  <div className="resize-buttons">
                    <button 
                      onClick={() => handleResizeChange(50)} 
                      className="resize-btn"
                    >
                      50%
                    </button>
                    <button 
                      onClick={() => handleResizeChange(100)} 
                      className="resize-btn active"
                    >
                      100%
                    </button>
                    <button 
                      onClick={() => handleResizeChange(150)} 
                      className="resize-btn"
                    >
                      150%
                    </button>
                  </div>
                </div>
                
                <div className="aspect-ratio-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={maintainAspectRatio}
                      onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                      className="toggle-input"
                    />
                    <span className="toggle-text">Maintain aspect ratio</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* EXIF Data Section */}
          {selectedFile && (
            <div className="card">
              <h2 className="card-title">EXIF Data</h2>
              
              <div className="exif-controls">
                <div className="exif-header">
                  <button
                    onClick={() => setShowExifData(!showExifData)}
                    className="btn-secondary exif-toggle-btn"
                  >
                    {showExifData ? 'Hide EXIF Data' : 'View EXIF Data'}
                  </button>
                  
                  <div className="exif-remove-toggle">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={removeExifOnConvert}
                        onChange={(e) => setRemoveExifOnConvert(e.target.checked)}
                        className="toggle-input"
                      />
                      <span className="toggle-text">Remove EXIF on convert</span>
                    </label>
                  </div>
                </div>
                
                {showExifData && (
                  <div className="exif-data-container">
                    <div className="exif-info">
                      <p className="exif-description">
                        EXIF data contains metadata about the image including camera settings, 
                        location, and device information. Removing it helps protect privacy.
                      </p>
                    </div>
                    
                    <div className="exif-data-grid">
                      {exifData ? (
                        Object.entries(exifData).map(([key, value]) => {
                          // Skip undefined or null values
                          if (value === undefined || value === null) return null;
                          
                          // Format the display value
                          let displayValue = value;
                          if (typeof value === 'object') {
                            displayValue = JSON.stringify(value);
                          } else if (typeof value === 'number') {
                            displayValue = value.toString();
                          }
                          
                          return (
                            <div key={key} className="exif-item">
                              <span className="exif-key">{key}:</span>
                              <span className="exif-value">{displayValue}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="exif-no-data">
                          <p>No EXIF data found in this image</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conversion Options */}
          {selectedFile && (
            <div className="card">
              <h2 className="card-title">Conversion Options</h2>
              
              <div className="conversion-grid">
                <div className="format-section">
                  <label className="label">
                    Target Format
                  </label>
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="format-select"
                  >
                    {supportedFormats.map(format => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => setShowFormatInfo(!showFormatInfo)}
                    className="format-info-btn"
                  >
                    What is {selectedFormat.toUpperCase()}?
                  </button>
                  
                  {showFormatInfo && (
                    <div className="format-explanation">
                      {formatExplanations[selectedFormat as keyof typeof formatExplanations]}
                    </div>
                  )}
                </div>
                
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
                      <span className="progress-text">{conversionProgress}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Download Section */}
          {convertedImage && (
            <div className="card">
              <h2 className="card-title">Download</h2>
              
              <div className="download-content">
                <div className="success-icon">✅</div>
                <p className="success-text">
                  Image converted successfully to {selectedFormat.toUpperCase()}!
                </p>
                <p className="filename">
                  Filename: {convertedImage.filename}
                </p>
                <button onClick={downloadImage} className="btn-primary">
                  Download {selectedFormat.toUpperCase()} File
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="footer">
          <p>Convertly - Convert and resize images instantly, no server required</p>
        </div>
      </div>
    </div>
  );
}

export default App;
