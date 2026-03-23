/**
 * Generate PWA icon files from the existing icon.png
 *
 * Prerequisites: npm install sharp
 * Usage: node scripts/generate-pwa-icons.js
 *
 * This script resizes public/icon.png into the required PWA icon sizes:
 *   - public/icon-192.png  (192x192)
 *   - public/icon-512.png  (512x512)
 *
 * If you don't have sharp installed, you can manually create these icons
 * by resizing public/icon.png to 192x192 and 512x512 pixels using any
 * image editor or online tool (e.g., https://squoosh.app).
 */

const sharp = require('sharp');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'public', 'icon.png');
const OUTPUT_DIR = path.join(__dirname, '..', 'public');

const sizes = [
  { width: 192, height: 192, name: 'icon-192.png' },
  { width: 512, height: 512, name: 'icon-512.png' },
];

async function generate() {
  for (const size of sizes) {
    const output = path.join(OUTPUT_DIR, size.name);
    await sharp(SOURCE)
      .resize(size.width, size.height, { fit: 'cover' })
      .png()
      .toFile(output);
    console.log(`Created ${size.name} (${size.width}x${size.height})`);
  }
  console.log('Done! PWA icons generated.');
}

generate().catch((err) => {
  console.error('Error generating icons:', err.message);
  console.log('\nTo install sharp: npm install sharp --save-dev');
  console.log('Or manually resize public/icon.png to 192x192 and 512x512.');
  process.exit(1);
});
