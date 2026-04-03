/**
 * Run this script to generate PWA icon PNGs from the SVG source.
 * Requires: npm install -D sharp
 * Usage: node public/icons/generate-icons.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { createCanvas } from 'canvas'

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of sizes) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  const radius = size * 0.125
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.quadraticCurveTo(size, 0, size, radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fillStyle = '#16a34a'
  ctx.fill()

  // Text
  ctx.fillStyle = 'white'
  ctx.font = `bold ${size * 0.4}px system-ui`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('SG', size / 2, size / 2)

  writeFileSync(`public/icons/${name}`, canvas.toBuffer('image/png'))
  console.log(`Generated ${name} (${size}x${size})`)
}
