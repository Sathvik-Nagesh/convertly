# Convertly 🖼️

A modern, professional-grade image converter that runs entirely in your browser. Convert, resize, and manage image metadata with zero server dependencies!

![Convertly Demo](https://img.shields.io/badge/Status-Live-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)

## ✨ Features

### 🎯 **Core Functionality**
- **Multiple Format Support**: Convert between JPG, PNG, WebP, GIF, and BMP
- **Real-time Image Resizing**: Interactive slider with live preview (10%-200%)
- **EXIF Data Viewer & Remover**: View metadata and optionally remove it for privacy
- **Smart Compression**: Automatic optimization for JPEG and WebP formats
- **Drag & Drop Upload**: Intuitive file handling with visual feedback

### 🎨 **User Experience**
- **Dark Minimal Theme**: Professional black interface with blue accents
- **Real-time Preview**: See changes instantly with Canvas-based rendering
- **Progress Indicators**: Animated progress bars during conversion
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Format Education**: Learn about each image format with detailed explanations

### 🔒 **Privacy & Security**
- **100% Client-side**: No data ever leaves your browser
- **EXIF Removal**: Protect privacy by removing metadata
- **No Server Dependencies**: Everything runs locally

## 🚀 Quick Start

### Live Demo
🌐 **[Try Convertly Live](https://your-github-username.github.io/convertly)** (Coming soon)

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/convertly.git
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

### 4. **Convert & Download**
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
- ✅ **Lightning Fast**: Real-time processing and preview
- ✅ **User Friendly**: Intuitive interface with helpful guidance
- ✅ **Mobile Ready**: Responsive design works everywhere
- ✅ **Open Source**: Free to use, modify, and contribute

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
- ✅ **Responsive Design**: Complete
- 🚧 **Batch Processing**: Planned
- 🚧 **Advanced Filters**: Planned
- 🚧 **PWA Support**: Planned

---

<div align="center">

**[⭐ Star this repository](https://github.com/your-username/convertly)** if you find it useful!

**Convertly** - Professional image conversion, right in your browser 🚀

[Demo](https://your-demo-link.com) • [Issues](https://github.com/your-username/convertly/issues) • [Contribute](https://github.com/your-username/convertly/pulls)

</div>