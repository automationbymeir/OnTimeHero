// Generate app icon using the OnTimeHeroLogo component
const fs = require('fs');
const path = require('path');

// Create SVG version of the logo
const createLogoSVG = (size) => {
  const scale = size / 120; // Base size is 120
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size * 1.125}" viewBox="0 0 ${size} ${size * 1.125}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#f59e0b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#d97706;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="clockGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="70%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </radialGradient>
  </defs>
  
  <!-- Outer Shield -->
  <path d="M ${size * 0.5} ${size * 0.05} 
           L ${size * 0.9} ${size * 0.15} 
           L ${size * 0.9} ${size * 0.6} 
           Q ${size * 0.9} ${size * 0.85} ${size * 0.5} ${size * 1.0}
           Q ${size * 0.1} ${size * 0.85} ${size * 0.1} ${size * 0.6}
           L ${size * 0.1} ${size * 0.15} Z"
        fill="url(#shieldGradient)" 
        stroke="#d97706" 
        stroke-width="${2 * scale}"/>
  
  <!-- Inner Shield Highlight -->
  <path d="M ${size * 0.5} ${size * 0.1} 
           L ${size * 0.85} ${size * 0.18} 
           L ${size * 0.85} ${size * 0.6} 
           Q ${size * 0.85} ${size * 0.82} ${size * 0.5} ${size * 0.95}
           Q ${size * 0.15} ${size * 0.82} ${size * 0.15} ${size * 0.6}
           L ${size * 0.15} ${size * 0.18} Z"
        fill="url(#shieldGradient)" 
        opacity="0.8"/>
  
  <!-- Clock Face -->
  <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.3}" 
          fill="url(#clockGradient)" 
          stroke="#d97706" 
          stroke-width="${2 * scale}"/>
  
  <!-- Clock Rim -->
  <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.28}" 
          fill="none" 
          stroke="#f59e0b" 
          stroke-width="${1 * scale}"/>
  
  <!-- Clock Ticks -->
  ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => {
    const rad = (angle - 90) * Math.PI / 180;
    const x1 = size * 0.5 + Math.cos(rad) * size * 0.26;
    const y1 = size * 0.5 + Math.sin(rad) * size * 0.26;
    const x2 = size * 0.5 + Math.cos(rad) * size * 0.23;
    const y2 = size * 0.5 + Math.sin(rad) * size * 0.23;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d97706" stroke-width="${1.5 * scale}" stroke-linecap="round"/>`;
  }).join('\n  ')}
  
  <!-- Hour Hand (pointing to 10) -->
  <line x1="${size * 0.5}" y1="${size * 0.5}" 
        x2="${size * 0.5 - Math.sin(60 * Math.PI / 180) * size * 0.15}" 
        y2="${size * 0.5 - Math.cos(60 * Math.PI / 180) * size * 0.15}" 
        stroke="#f59e0b" 
        stroke-width="${4 * scale}" 
        stroke-linecap="round"/>
  
  <!-- Minute Hand (pointing to 2) -->
  <line x1="${size * 0.5}" y1="${size * 0.5}" 
        x2="${size * 0.5 + Math.sin(60 * Math.PI / 180) * size * 0.2}" 
        y2="${size * 0.5 - Math.cos(60 * Math.PI / 180) * size * 0.2}" 
        stroke="#d97706" 
        stroke-width="${3 * scale}" 
        stroke-linecap="round"/>
  
  <!-- Center Dot -->
  <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.03}" 
          fill="#fbbf24" 
          stroke="#d97706" 
          stroke-width="${1 * scale}"/>
  
  <!-- Crown at top -->
  <g transform="translate(${size * 0.5}, ${size * 0.08})">
    <!-- Crown base -->
    <rect x="${-size * 0.08}" y="0" width="${size * 0.16}" height="${size * 0.05}" 
          fill="#fbbf24" 
          stroke="#d97706" 
          stroke-width="${1 * scale}" 
          rx="${2 * scale}"/>
    
    <!-- Crown points -->
    <polygon points="${-size * 0.06},0 ${-size * 0.04},-${size * 0.04} ${-size * 0.02},0" 
             fill="#fbbf24" 
             stroke="#d97706" 
             stroke-width="${1 * scale}"/>
    <polygon points="${-size * 0.01},0 ${size * 0.01},-${size * 0.05} ${size * 0.03},0" 
             fill="#fbbf24" 
             stroke="#d97706" 
             stroke-width="${1 * scale}"/>
    <polygon points="${size * 0.04},0 ${size * 0.06},-${size * 0.04} ${size * 0.08},0" 
             fill="#fbbf24" 
             stroke="#d97706" 
             stroke-width="${1 * scale}"/>
    
    <!-- Crown jewels -->
    <circle cx="${-size * 0.04}" cy="${-size * 0.02}" r="${size * 0.01}" fill="#ffffff" opacity="0.8"/>
    <circle cx="${size * 0.01}" cy="${-size * 0.025}" r="${size * 0.012}" fill="#ffffff" opacity="0.8"/>
    <circle cx="${size * 0.06}" cy="${-size * 0.02}" r="${size * 0.01}" fill="#ffffff" opacity="0.8"/>
  </g>
</svg>`;
};

// Create different sizes for Android
const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Generate SVG files for each size
Object.entries(sizes).forEach(([folder, size]) => {
  const svg = createLogoSVG(size);
  const dir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res', folder);
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write SVG file (we'll convert to PNG manually or use a tool)
  const svgPath = path.join(dir, 'ic_launcher.svg');
  fs.writeFileSync(svgPath, svg);
  console.log(`✅ Created ${folder}/ic_launcher.svg (${size}x${size * 1.125})`);
});

console.log('\n🎉 SVG files created!');
console.log('📝 Next steps:');
console.log('   1. Convert SVG files to PNG using an online tool or ImageMagick');
console.log('   2. Or use the provided SVG as reference to create PNG icons');
console.log('\n💡 You can use: https://cloudconvert.com/svg-to-png');
console.log('   Or run: brew install imagemagick && npm run convert-icons');


