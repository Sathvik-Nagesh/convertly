# Convertly 🖼️

A modern, professional-grade image converter that runs entirely in your browser. Convert, resize, and manage image metadata with zero server dependencies!

![Convertly Demo](https://img.shields.io/badge/Status-Live-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)

## ✨ Features

### 🎯 **Core Functionality**
- **Multiple Format Support**: Convert between JPG, PNG, WebP, GIF, and BMP
- **Real-time Image Resizing**: Interactive slider with live preview (10%-200%)
- **AI-Powered Upscaling**: Enhance image resolution using advanced neural networks
- **Background Removal**: AI-powered background removal with transparency support
- **EXIF Data Viewer & Remover**: View metadata and optionally remove it for privacy
- **Smart Compression**: Automatic optimization for JPEG and WebP formats
- **Drag & Drop Upload**: Intuitive file handling with visual feedback
- **Batch Processing**: Process multiple images simultaneously with drag & drop
- **Color Palette Extraction**: Extract dominant colors from images with AI analysis
- **ZIP Download**: Download all processed images as a single ZIP file

### 🎨 **User Experience**
- **Dark Minimal Theme**: Professional black interface with blue accents
- **Real-time Preview**: See changes instantly with Canvas-based rendering
- **Progress Indicators**: Animated progress bars during conversion and upscaling
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Format Education**: Learn about each image format with detailed explanations

### 🔒 **Privacy & Security**
- **100% Client-side**: No data ever leaves your browser
- **EXIF Removal**: Protect privacy by removing metadata
- **No Server Dependencies**: Everything runs locally

### 🤖 **AI Upscaling Features**
- **Smart AI Models**: ESRGAN Default, Medium, and Thick models for different image types
- **Configurable Scaling**: 1.5x to 4x resolution enhancement
- **Intelligent Fallbacks**: Automatic fallback to basic upscaling when AI fails
- **WebGL Optimization**: Smart patch sizing and memory management
- **Real-time Progress**: Track upscaling progress with detailed feedback

### 🎭 **Background Removal Features**
- **AI-Powered Segmentation**: Advanced algorithms for precise background removal
- **Transparency Support**: Export as PNG with alpha channel
- **Quality Optimization**: High-quality canvas rendering and export
- **Smart Fallbacks**: Automatic quality improvements and error handling
- **User Expectations**: Clear disclaimer about limitations and best use cases

### 📦 **Batch Processing Features**
- **Multi-Image Upload**: Drag & drop multiple images at once
- **Bulk Conversion**: Convert all images to the same format simultaneously
- **Batch Upscaling**: Apply AI upscaling to all images in the batch
- **Progress Tracking**: Real-time progress for each image in the batch
- **ZIP Export**: Download all processed images as a single ZIP file
- **Individual Downloads**: Download each processed image separately
- **Smart Error Handling**: Continue processing even if some images fail

### 🎨 **Color Palette Extraction Features**
- **AI Color Analysis**: Extract dominant colors using K-means clustering
- **Multiple Extraction Methods**: Vibrant, muted, dark, light, and custom algorithms
- **Color Information**: Get HEX, RGB, and HSL values for each color
- **Export Options**: Download color palettes as CSS, SCSS, GPL, or ASE files
- **Visual Color Swatches**: See colors in a beautiful grid layout
- **Copy to Clipboard**: Easy copying of color codes for design work

## 🚀 Quick Start

### Live Demo
🌐 **[Try Convertly Live](https://sathvik-nagesh.github.io/convertly)** - Your images, converted instantly!

### Local Development

```bash
# Clone the repository
git clone https://github.com/Sathvik-Nagesh/convertly.git
cd convertly

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## 🛠️ Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | Frontend Framework | 18+ |
| **TypeScript** | Type Safety | 4.9+ |
| **Canvas API** | Image Processing | Native |
| **EXIF.js** | Metadata Extraction | 2.3+ |
| **FileSaver.js** | File Downloads | 2.0+ |
| **browser-image-compression** | Smart Compression | 2.0+ |
| **JSZip** | ZIP File Creation | 3.10+ |
| **Framer Motion** | Animations | 10.0+ |

## 📱 How to Use

### 1. **Upload Your Image**
- Drag and drop any image file
- Or click "Choose File" to browse
- Supports: JPG, PNG, WebP, GIF, BMP

### 2. **Resize (Optional)**
- Use the interactive slider (10% - 200%)
- Quick preset buttons: 50%, 100%, 150%
- Real-time preview updates
- Maintain aspect ratio toggle

### 3. **Review EXIF Data**
- View camera settings, location data, device info
- Choose to remove metadata for privacy
- Understand what information your images contain

### 4. **AI Upscaling (Optional)**
- Select AI model (ESRGAN Default, Medium, or Thick)
- Choose scaling factor (1.5x to 4x)
- Watch real-time upscaling progress
- Preview enhanced image quality
- Automatic fallback to basic upscaling if AI fails

### 5. **Background Removal (Optional)**
- Upload image for background removal
- AI processes image with transparency
- Preview result with removed background
- Download as high-quality PNG with alpha channel
- Clear limitations and best practices shown

### 6. **Batch Processing (New!)**
- Switch to the "Batch" tab
- Drag & drop multiple images at once
- Configure settings for all images (format, resize, upscale)
- Watch real-time progress for each image
- Download all images as a ZIP file or individually

### 7. **Color Palette Extraction (New!)**
- Switch to the "Color Palette" tab
- Upload an image to extract colors from
- Choose extraction method (K-means, vibrant, muted, etc.)
- Adjust color count (3-16 colors)
- View color swatches with HEX, RGB, and HSL values
- Export color palette as CSS, SCSS, GPL, or ASE files

### 8. **Convert & Download**
- Select target format
- Watch the animated progress bar
- Download your optimized image
- Filename includes size and EXIF status

## 🔧 Supported Formats

| Format | Type | Compression | Best For | Quality |
|--------|------|-------------|----------|---------|
| **JPEG** | Lossy | High | Photos, web images | Adjustable |
| **PNG** | Lossless | Medium | Graphics, logos, transparency | Perfect |
| **WebP** | Lossy/Lossless | Very High | Modern web | Excellent |
| **GIF** | Lossless | Low | Simple graphics, animations | Limited colors |
| **BMP** | Uncompressed | None | Maximum quality | Largest files |

## 🎯 Key Benefits

- ✅ **Privacy First**: No data uploads, everything local
- ✅ **Professional Quality**: Advanced compression algorithms
- ✅ **AI-Powered**: Neural network upscaling and background removal
- ✅ **Smart Fallbacks**: Automatic fallbacks when AI processing fails
- ✅ **Lightning Fast**: Real-time processing and preview
- ✅ **User Friendly**: Intuitive interface with helpful guidance
- ✅ **Mobile Ready**: Responsive design works everywhere
- ✅ **Open Source**: Free to use, modify, and contribute
- ✅ **Batch Processing**: Handle multiple images efficiently
- ✅ **Color Analysis**: Extract and export color palettes
- ✅ **Modern UI**: Neo-Brutalism design with smooth animations

## 🆕 Recent Updates

### Version 2.0 - Major Feature Release
- **🎨 Color Palette Extraction**: Extract dominant colors with AI analysis
- **📦 Batch Processing**: Process multiple images simultaneously
- **🎯 Improved Upscaling**: Fixed and enhanced AI upscaling functionality
- **🎨 UI/UX Overhaul**: Complete redesign with Neo-Brutalism aesthetic
- **📱 Mobile Optimization**: Better responsive design and touch interactions
- **🐛 Bug Fixes**: Resolved font visibility and layout issues
- **⚡ Performance**: Optimized processing and reduced bundle size

## 🧪 Advanced Features

### EXIF Data Management
```typescript
// Example EXIF data you might see:
{
  "Camera": "iPhone 12 Pro",
  "DateTimeOriginal": "2024:01:15 14:30:22",
  "GPS Latitude": "37.7749° N",
  "GPS Longitude": "122.4194° W",
  "ISO Speed": 100,
  "Focal Length": "6mm"
}
```

### Smart Filename Generation
- `photo_800x600_no-exif.jpg` (resized with EXIF removed)
- `image_1920x1080.png` (resized, keeping EXIF)
- `original_100%.webp` (format change only)

## 🤝 Contributing

We love contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Maintain the existing code style

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Canvas API** for native image processing
- **EXIF.js** for metadata extraction
- **React** team for the amazing framework
- **Open source community** for inspiration and tools

## 📊 Project Status

- ✅ **Core Features**: Complete
- ✅ **EXIF Management**: Complete
- ✅ **AI Upscaling**: Complete with fallbacks
- ✅ **Background Removal**: Complete with disclaimer
- ✅ **Responsive Design**: Complete
- ✅ **Smart Fallbacks**: Complete
- ✅ **Batch Processing**: Complete with ZIP export
- ✅ **Color Palette Extraction**: Complete with multiple algorithms
- ✅ **UI/UX Improvements**: Complete with Neo-Brutalism design
- 🚧 **Advanced Filters**: Planned
- 🚧 **PWA Support**: Planned
- 🚧 **More AI Models**: Planned

---

<div align="center">

**[⭐ Star this repository](https://github.com/your-username/convertly)** if you find it useful!

**Convertly** - Professional image conversion, right in your browser 🚀

[Demo](https://your-demo-link.com) • [Issues](https://github.com/your-username/convertly/issues) • [Contribute](https://github.com/your-username/convertly/pulls)

</div>