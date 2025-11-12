const fs = require('fs');
const path = require('path');

/**
 * Extracts metadata from an image file
 * Supports JPEG, PNG, TIFF, and other common image formats
 * 
 * Usage: node extractImageMetadata.js <image-path>
 * Example: node extractImageMetadata.js ../images/photo.jpg
 */

async function extractImageMetadata(imagePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`File not found: ${imagePath}`);
    }

    // Check if it's a file (not a directory)
    const stats = fs.statSync(imagePath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${imagePath}`);
    }

    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Try to use exifr if available, otherwise use basic file info
    let metadata = {
      file: {
        path: imagePath,
        name: path.basename(imagePath),
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: path.extname(imagePath).toLowerCase(),
      },
    };

    // Try to extract EXIF data if exifr is installed
    try {
      const exifr = require('exifr');
      const exifData = await exifr.parse(imageBuffer, {
        // Extract all available tags
        pick: [
          'Make', 'Model', 'Software', 'DateTimeOriginal', 'DateTimeDigitized',
          'ExposureTime', 'FNumber', 'ISO', 'FocalLength', 'FocalLengthIn35mmFormat',
          'LensModel', 'LensMake', 'WhiteBalance', 'Flash', 'MeteringMode',
          'ExposureMode', 'ExposureProgram', 'ImageWidth', 'ImageHeight',
          'Orientation', 'ColorSpace', 'GPSLatitude', 'GPSLongitude', 'GPSAltitude',
          'Artist', 'Copyright', 'XResolution', 'YResolution', 'ResolutionUnit'
        ],
        // Also get raw EXIF data
        translateKeys: false,
      });

      if (exifData) {
        metadata.exif = exifData;
      }
    } catch (exifrError) {
      console.warn('exifr not installed. Install it with: npm install exifr');
      console.warn('Falling back to basic file metadata only.');
    }

    // Try to extract dimensions using sharp if available
    try {
      const sharp = require('sharp');
      const image = sharp(imageBuffer);
      const imageMetadata = await image.metadata();
      
      metadata.image = {
        width: imageMetadata.width,
        height: imageMetadata.height,
        format: imageMetadata.format,
        channels: imageMetadata.channels,
        density: imageMetadata.density,
        hasAlpha: imageMetadata.hasAlpha,
        hasProfile: imageMetadata.hasProfile,
        space: imageMetadata.space,
        depth: imageMetadata.depth,
        orientation: imageMetadata.orientation,
      };
    } catch (sharpError) {
      console.warn('sharp not installed. Install it with: npm install sharp');
      console.warn('Image dimensions not extracted.');
    }

    return metadata;
  } catch (error) {
    throw new Error(`Failed to extract metadata: ${error.message}`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node extractImageMetadata.js <image-path>');
    console.error('Example: node extractImageMetadata.js ../images/photo.jpg');
    process.exit(1);
  }

  const imagePath = path.resolve(args[0]);
  
  try {
    console.log(`Extracting metadata from: ${imagePath}\n`);
    const metadata = await extractImageMetadata(imagePath);
    
    // Output as JSON
    console.log(JSON.stringify(metadata, null, 2));
    
    // Optionally save to file
    if (args[1] === '--save') {
      const outputPath = imagePath.replace(/\.[^/.]+$/, '_metadata.json');
      fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
      console.log(`\nMetadata saved to: ${outputPath}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractImageMetadata };

