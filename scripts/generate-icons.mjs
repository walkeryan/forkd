// One-off asset pipeline: render public/icon.svg into all the PNG sizes the
// PWA / favicons need, plus a favicon.ico. Run with: node scripts/generate-icons.mjs
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pub = path.join(root, 'public')
const svg = await readFile(path.join(pub, 'icon.svg'))

// size -> output filename
const targets = [
  [16, 'favicon-16.png'],
  [32, 'favicon-32.png'],
  [180, 'apple-touch-icon.png'],
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [512, 'icon-512-maskable.png'],
]

for (const [size, name] of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(pub, name))
  console.log(`wrote ${name} (${size}x${size})`)
}

// favicon.ico bundling the 16 + 32 px renders
const ico = await pngToIco([
  path.join(pub, 'favicon-16.png'),
  path.join(pub, 'favicon-32.png'),
])
await writeFile(path.join(pub, 'favicon.ico'), ico)
console.log('wrote favicon.ico (16 + 32)')
