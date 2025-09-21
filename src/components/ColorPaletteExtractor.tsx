import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { saveAs } from 'file-saver';

interface ColorPalette {
  colors: Array<{
    hex: string;
    rgb: { r: number; g: number; b: number };
    hsl: { h: number; s: number; l: number };
  }>;
}

interface ColorPaletteExtractorProps {
  imageUrl: string | null;
  onImageSelect: (file: File) => void;
  onReset: () => void;
}

const ColorPaletteExtractor: React.FC<ColorPaletteExtractorProps> = ({
  imageUrl,
  onImageSelect,
  onReset
}) => {
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMethod, setExtractionMethod] = useState<'kmeans' | 'vibrant' | 'muted' | 'dark' | 'light'>('kmeans');
  const [colorCount, setColorCount] = useState(8);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RGB to HSL conversion
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  // Extract colors using canvas and manual color analysis
  const extractColors = useCallback(async (imageUrl: string, method: string, count: number): Promise<ColorPalette> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ colors: [] });
          return;
        }

        // Set canvas size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Extract colors based on method
        let colors: Array<{ r: number; g: number; b: number; count: number }> = [];
        
        if (method === 'kmeans') {
          colors = extractKMeansColors(data, count);
        } else {
          colors = extractVibrantColors(data, method, count);
        }
        
        // Convert to hex and HSL
        const palette: ColorPalette = {
          colors: colors.map(color => {
            const hex = `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`;
            const hsl = rgbToHsl(color.r, color.g, color.b);
            
            return {
              hex,
              rgb: { r: color.r, g: color.g, b: color.b },
              hsl
            };
          })
        };
        
        resolve(palette);
      };
      
      img.onerror = () => resolve({ colors: [] });
      img.src = imageUrl;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // K-means clustering for color extraction
  const extractKMeansColors = (data: Uint8ClampedArray, k: number) => {
    const pixels: Array<{ r: number; g: number; b: number }> = [];
    
    // Sample pixels (every 10th pixel for performance)
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a > 128) { // Skip transparent pixels
        pixels.push({ r, g, b });
      }
    }
    
    if (pixels.length === 0) return [];
    
    // Initialize centroids randomly
    const centroids: Array<{ r: number; g: number; b: number }> = [];
    for (let i = 0; i < k; i++) {
      const randomPixel = pixels[Math.floor(Math.random() * pixels.length)];
      centroids.push({ ...randomPixel });
    }
    
    // K-means iterations
    for (let iter = 0; iter < 10; iter++) {
      const clusters: Array<Array<{ r: number; g: number; b: number }>> = Array(k).fill(null).map(() => []);
      
      // Assign pixels to closest centroid
      pixels.forEach(pixel => {
        let minDistance = Infinity;
        let closestCentroid = 0;
        
        centroids.forEach((centroid, index) => {
          const distance = Math.sqrt(
            Math.pow(pixel.r - centroid.r, 2) +
            Math.pow(pixel.g - centroid.g, 2) +
            Math.pow(pixel.b - centroid.b, 2)
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            closestCentroid = index;
          }
        });
        
        clusters[closestCentroid].push(pixel);
      });
      
      // Update centroids
      centroids.forEach((centroid, index) => {
        const cluster = clusters[index];
        if (cluster.length > 0) {
          centroid.r = cluster.reduce((sum, pixel) => sum + pixel.r, 0) / cluster.length;
          centroid.g = cluster.reduce((sum, pixel) => sum + pixel.g, 0) / cluster.length;
          centroid.b = cluster.reduce((sum, pixel) => sum + pixel.b, 0) / cluster.length;
        }
      });
    }
    
    // Convert to final format with counts
    return centroids.map(centroid => ({
      r: Math.round(centroid.r),
      g: Math.round(centroid.g),
      b: Math.round(centroid.b),
      count: 1
    }));
  };

  // Extract vibrant colors based on saturation and lightness
  const extractVibrantColors = (data: Uint8ClampedArray, method: string, count: number) => {
    const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();
    
    // Sample pixels
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a > 128) {
        const hsl = rgbToHsl(r, g, b);
        const colorKey = `${Math.floor(r/8)},${Math.floor(g/8)},${Math.floor(b/8)}`;
        
        let include = false;
        
        switch (method) {
          case 'vibrant':
            include = hsl.s > 50 && hsl.l > 20 && hsl.l < 80;
            break;
          case 'muted':
            include = hsl.s < 50 && hsl.l > 20 && hsl.l < 80;
            break;
          case 'dark':
            include = hsl.l < 30;
            break;
          case 'light':
            include = hsl.l > 70;
            break;
          default:
            include = true;
        }
        
        if (include) {
          if (colorMap.has(colorKey)) {
            const existing = colorMap.get(colorKey)!;
            existing.count++;
            existing.r = (existing.r + r) / 2;
            existing.g = (existing.g + g) / 2;
            existing.b = (existing.b + b) / 2;
          } else {
            colorMap.set(colorKey, { r, g, b, count: 1 });
          }
        }
      }
    }
    
    // Sort by count and return top colors
    return Array.from(colorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, count)
      .map(color => ({
        r: Math.round(color.r),
        g: Math.round(color.g),
        b: Math.round(color.b),
        count: color.count
      }));
  };

  const handleExtractColors = async () => {
    if (!imageUrl) return;
    
    setIsExtracting(true);
    try {
      const palette = await extractColors(imageUrl, extractionMethod, colorCount);
      setColorPalette(palette);
    } catch (error) {
      console.error('Error extracting colors:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const copyColorToClipboard = async (color: string) => {
    try {
      await navigator.clipboard.writeText(color);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy color:', err);
    }
  };

  const exportPalette = (format: 'json' | 'ase' | 'gpl' | 'css' | 'scss') => {
    if (!colorPalette) return;
    
    let content = '';
    let filename = '';
    let mimeType = '';
    
    switch (format) {
      case 'json':
        content = JSON.stringify(colorPalette, null, 2);
        filename = 'palette.json';
        mimeType = 'application/json';
        break;
      case 'css':
        content = generateCSSVariables(colorPalette);
        filename = 'palette.css';
        mimeType = 'text/css';
        break;
      case 'scss':
        content = generateSCSSVariables(colorPalette);
        filename = 'palette.scss';
        mimeType = 'text/scss';
        break;
      case 'gpl':
        content = generateGPLFile(colorPalette);
        filename = 'palette.gpl';
        mimeType = 'text/plain';
        break;
      case 'ase':
        content = generateASEFile(colorPalette);
        filename = 'palette.ase';
        mimeType = 'application/octet-stream';
        break;
    }
    
    const blob = new Blob([content], { type: mimeType });
    saveAs(blob, filename);
  };

  const generateCSSVariables = (palette: ColorPalette): string => {
    let content = ':root {\n';
    palette.colors.forEach((color, index) => {
      content += `  --color-${index + 1}: ${color.hex};\n`;
      content += `  --color-${index + 1}-rgb: ${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b};\n`;
    });
    content += '}\n';
    return content;
  };

  const generateSCSSVariables = (palette: ColorPalette): string => {
    let content = '$colors: (\n';
    palette.colors.forEach((color, index) => {
      content += `  color-${index + 1}: ${color.hex},\n`;
    });
    content += ');\n\n';
    
    palette.colors.forEach((color, index) => {
      content += `$color-${index + 1}: ${color.hex};\n`;
    });
    
    return content;
  };

  const generateGPLFile = (palette: ColorPalette): string => {
    let content = 'GIMP Palette\n';
    content += 'Name: Convertly Palette\n';
    content += 'Columns: 0\n';
    content += '#\n';
    
    palette.colors.forEach((color, index) => {
      const { r, g, b } = color.rgb;
      content += `${r.toString().padStart(3)} ${g.toString().padStart(3)} ${b.toString().padStart(3)} Color ${index + 1}\n`;
    });
    
    return content;
  };

  const generateASEFile = (palette: ColorPalette): string => {
    // Simplified ASE format - in a real implementation, you'd use a proper ASE library
    let content = 'ASEF';
    // Add header and color data (simplified)
    return content;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelect(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <div className="bg-neo-dark border-4 border-neo-pink p-8 shadow-neo-pink">
        <h2 className="text-3xl font-bold mb-8 text-neo-white text-center">COLOR PALETTE EXTRACTION</h2>
        
        {!imageUrl ? (
          <div className="color-upload-section">
            <div 
              className="neo-dropzone color-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="color-upload-icon">🎨</div>
              <div className="color-upload-text">
                <div className="color-upload-title">DROP IMAGE FOR COLOR EXTRACTION</div>
                <div className="color-upload-subtitle">OR CLICK TO BROWSE</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="color-palette-container">
            <div className="color-image-section">
              <img
                src={imageUrl}
                alt="Source"
                className="color-palette-image"
              />
              <button
                onClick={onReset}
                className="color-remove-btn"
              >
                ✕ REMOVE IMAGE
              </button>
            </div>
            
            <div className="color-palette-controls">
              <div className="color-control-row">
                <div className="color-control-group">
                  <label>EXTRACTION METHOD</label>
                  <select
                    value={extractionMethod}
                    onChange={(e) => setExtractionMethod(e.target.value as any)}
                  >
                    <option value="kmeans">K-Means Clustering</option>
                    <option value="vibrant">Vibrant Colors</option>
                    <option value="muted">Muted Colors</option>
                    <option value="dark">Dark Colors</option>
                    <option value="light">Light Colors</option>
                  </select>
                </div>
                
                <div className="color-control-group">
                  <label>COLOR COUNT: {colorCount}</label>
                  <input
                    type="range"
                    min="3"
                    max="16"
                    value={colorCount}
                    onChange={(e) => setColorCount(parseInt(e.target.value))}
                    className="slider"
                  />
                </div>
              </div>
              
              <motion.button
                onClick={handleExtractColors}
                disabled={isExtracting}
                className="neo-btn neo-btn-primary color-extract-btn"
                whileHover={{ scale: 1.05 }}
              >
                {isExtracting ? 'EXTRACTING...' : 'EXTRACT COLORS'}
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Color Palette Display */}
      {colorPalette && (
        <div className="bg-neo-dark border-4 border-neo-cyan p-8 shadow-neo-cyan">
          <h2 className="text-3xl font-bold mb-6 text-neo-white">EXTRACTED COLORS</h2>
          
          <div className="color-palette-grid">
            {colorPalette.colors.map((color, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.1 }}
                  className="color-swatch-item"
                >
                  {/* Color Preview - Above the codes */}
                  <div
                    className="color-preview"
                    style={{ backgroundColor: color.hex }}
                    onClick={() => copyColorToClipboard(color.hex)}
                    title={`Click to copy ${color.hex}`}
                  />
                  
                  {/* Color Codes - Below the preview */}
                  <div className="color-codes">
                    <div className="color-hex">{color.hex}</div>
                    <div className="color-rgb">RGB({color.rgb.r}, {color.rgb.g}, {color.rgb.b})</div>
                    <div className="color-hsl">HSL({color.hsl.h}°, {color.hsl.s}%, {color.hsl.l}%)</div>
                  </div>
                </motion.div>
              ))}
          </div>

          {/* Export Options */}
          <div className="border-t-4 border-neo-gray pt-6">
            <h3 className="text-xl font-bold text-neo-white mb-4">EXPORT PALETTE</h3>
            <div className="flex flex-wrap gap-4">
              <motion.button
                onClick={() => exportPalette('json')}
                className="neo-btn neo-btn-primary px-4 py-2"
                whileHover={{ scale: 1.05 }}
              >
                EXPORT JSON
              </motion.button>
              <motion.button
                onClick={() => exportPalette('css')}
                className="neo-btn neo-btn-secondary px-4 py-2"
                whileHover={{ scale: 1.05 }}
              >
                EXPORT CSS
              </motion.button>
              <motion.button
                onClick={() => exportPalette('scss')}
                className="neo-btn neo-btn-warning px-4 py-2"
                whileHover={{ scale: 1.05 }}
              >
                EXPORT SCSS
              </motion.button>
              <motion.button
                onClick={() => exportPalette('gpl')}
                className="neo-btn neo-btn-secondary px-4 py-2"
                whileHover={{ scale: 1.05 }}
              >
                EXPORT GPL
              </motion.button>
              <motion.button
                onClick={() => exportPalette('ase')}
                className="neo-btn neo-btn-warning px-4 py-2"
                whileHover={{ scale: 1.05 }}
              >
                EXPORT ASE
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPaletteExtractor;
