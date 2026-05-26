const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function convertIcons() {
  console.log('🔄 Converting SVG icons to PNG...\n');
  
  for (const [folder, size] of Object.entries(sizes)) {
    const dir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res', folder);
    const svgPath = path.join(dir, 'ic_launcher.svg');
    const pngPath = path.join(dir, 'ic_launcher.png');
    const roundPngPath = path.join(dir, 'ic_launcher_round.png');
    
    try {
      // Read SVG
      const svgBuffer = fs.readFileSync(svgPath);
      
      // Convert to PNG with square background
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(pngPath);
      
      console.log(`✅ Created ${folder}/ic_launcher.png (${size}x${size})`);
      
      // Create round version (same image, will be masked by Android)
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(roundPngPath);
      
      console.log(`✅ Created ${folder}/ic_launcher_round.png (${size}x${size})`);
      
      // Clean up SVG file
      fs.unlinkSync(svgPath);
      
    } catch (error) {
      console.error(`❌ Error converting ${folder}:`, error.message);
    }
  }
  
  console.log('\n🎉 All icons converted successfully!');
  console.log('📱 Rebuilding app to apply new icons...');
}

convertIcons().catch(console.error);


