/**
 * Run this script to generate PWA icon PNGs and splash screens from the SVG source.
 * Requires: npm install -D sharp
 * Usage: node public/icons/generate-icons.mjs
 */
import sharp from 'sharp'
import { mkdirSync, existsSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..', '..')
const iconsDir = join(projectRoot, 'public', 'icons')
const splashDir = join(projectRoot, 'public', 'splash')

if (!existsSync(splashDir)) mkdirSync(splashDir, { recursive: true })

// SVG source for the app icon
const iconSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#16a34a"/>
  <text x="256" y="320" font-family="Arial,Helvetica,sans-serif" font-size="200" font-weight="bold" fill="white" text-anchor="middle">SG</text>
</svg>`)

// Icon sizes
const icons = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.png', size: 32 },
]

console.log('Generating icons...')
for (const { name, size } of icons) {
  const outPath = join(iconsDir, name)
  await sharp(iconSvg)
    .resize(size, size)
    .png()
    .toFile(outPath)
  console.log(`  Generated ${name} (${size}x${size})`)
}

// Splash screens: green background with centered icon
const splashSizes = [
  { name: 'splash-1170x2532.png', width: 1170, height: 2532 },  // iPhone 14
  { name: 'splash-1125x2436.png', width: 1125, height: 2436 },  // iPhone X/11 Pro
  { name: 'splash-1242x2688.png', width: 1242, height: 2688 },  // iPhone 11 Pro Max
  { name: 'splash-750x1334.png',  width: 750,  height: 1334  }, // iPhone 8
  { name: 'splash-640x1136.png',  width: 640,  height: 1136  }, // iPhone SE
  { name: 'splash-2048x2732.png', width: 2048, height: 2732 },  // iPad Pro 12.9
]

console.log('Generating splash screens...')
for (const { name, width, height } of splashSizes) {
  const iconSize = Math.round(Math.min(width, height) * 0.3)
  const iconLeft = Math.round((width - iconSize) / 2)
  const iconTop = Math.round((height - iconSize) / 2)

  const iconPng = await sharp(iconSvg).resize(iconSize, iconSize).png().toBuffer()

  const outPath = join(splashDir, name)
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 22, g: 163, b: 74, alpha: 1 },
    },
  })
    .composite([{ input: iconPng, left: iconLeft, top: iconTop }])
    .png()
    .toFile(outPath)

  console.log(`  Generated ${name} (${width}x${height})`)
}

// Generate favicon.ico (16x16 + 32x32 PNG-in-ICO)
console.log('Generating favicon.ico...')
const png16 = await sharp(iconSvg).resize(16, 16).png().toBuffer()
const png32 = await sharp(iconSvg).resize(32, 32).png().toBuffer()
const images = [png16, png32]
const sizes = [16, 32]
const headerSize = 6 + images.length * 16
let icoOffset = headerSize
const offsets = images.map(img => { const o = icoOffset; icoOffset += img.length; return o })
const icoBuf = Buffer.alloc(icoOffset)
let pos = 0
icoBuf.writeUInt16LE(0, pos); pos += 2
icoBuf.writeUInt16LE(1, pos); pos += 2
icoBuf.writeUInt16LE(images.length, pos); pos += 2
for (let i = 0; i < images.length; i++) {
  icoBuf.writeUInt8(sizes[i], pos); pos += 1
  icoBuf.writeUInt8(sizes[i], pos); pos += 1
  icoBuf.writeUInt8(0, pos); pos += 1
  icoBuf.writeUInt8(0, pos); pos += 1
  icoBuf.writeUInt16LE(1, pos); pos += 2
  icoBuf.writeUInt16LE(32, pos); pos += 2
  icoBuf.writeUInt32LE(images[i].length, pos); pos += 4
  icoBuf.writeUInt32LE(offsets[i], pos); pos += 4
}
for (const img of images) { img.copy(icoBuf, pos); pos += img.length }
writeFileSync(join(iconsDir, 'favicon.ico'), icoBuf)
writeFileSync(join(projectRoot, 'src', 'app', 'favicon.ico'), icoBuf)
console.log(`  Generated favicon.ico (16x16 + 32x32)`)

console.log('Done.')
