# PWA Icons

The `icon.svg` file is the source icon for SG POS.

## Required PNG files

The following PNG files are required by the PWA manifest but must be generated from the SVG source:

- `icon-192.png` — 192x192px (for Android/Chrome PWA)
- `icon-512.png` — 512x512px (for Android/Chrome PWA splash)
- `apple-touch-icon.png` — 180x180px (for iOS Safari Add to Home Screen)

## Generating PNGs

Using Inkscape:
```
inkscape icon.svg --export-png=icon-192.png --export-width=192 --export-height=192
inkscape icon.svg --export-png=icon-512.png --export-width=512 --export-height=512
inkscape icon.svg --export-png=apple-touch-icon.png --export-width=180 --export-height=180
```

Using ImageMagick:
```
convert -background none icon.svg -resize 192x192 icon-192.png
convert -background none icon.svg -resize 512x512 icon-512.png
convert -background none icon.svg -resize 180x180 apple-touch-icon.png
```

Using Node (sharp):
```
npx sharp-cli --input icon.svg --output icon-192.png --resize 192
npx sharp-cli --input icon.svg --output icon-512.png --resize 512
npx sharp-cli --input icon.svg --output apple-touch-icon.png --resize 180
```
