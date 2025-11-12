# Backend Scripts

This folder contains backend utility scripts for the application.

## Image Metadata Extraction

The `extractImageMetadata.js` script extracts metadata from image files, including EXIF data and image properties.

### Installation

Install the required dependencies:

```bash
npm install
```

This will install:
- `exifr` - For extracting EXIF metadata from images
- `sharp` - For extracting image dimensions and properties

### Usage

```bash
# Extract metadata and print to console
node extractImageMetadata.js <image-path>

# Extract metadata and save to JSON file
node extractImageMetadata.js <image-path> --save
```

### Examples

```bash
# Extract metadata from an image
node extractImageMetadata.js ../images/photo.jpg

# Extract and save to JSON file
node extractImageMetadata.js ../images/photo.jpg --save
```

### Output

The script outputs JSON containing:
- **file**: Basic file information (path, size, dates, extension)
- **exif**: EXIF metadata (camera settings, GPS, timestamps, etc.)
- **image**: Image properties (dimensions, format, color space, etc.)

### Example Output

```json
{
  "file": {
    "path": "/path/to/image.jpg",
    "name": "image.jpg",
    "size": 2456789,
    "created": "2024-01-15T10:30:00.000Z",
    "modified": "2024-01-15T10:30:00.000Z",
    "extension": ".jpg"
  },
  "exif": {
    "Make": "Canon",
    "Model": "Canon EOS 5D Mark IV",
    "DateTimeOriginal": "2024-01-15T10:30:00.000Z",
    "ExposureTime": 0.008,
    "FNumber": 2.8,
    "ISO": 400,
    "FocalLength": 50,
    "LensModel": "EF 50mm f/1.8 STM"
  },
  "image": {
    "width": 6720,
    "height": 4480,
    "format": "jpeg",
    "channels": 3,
    "hasAlpha": false
  }
}
```

