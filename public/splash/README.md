# iPad Splash Screens

Apple requires specific splash screen images for PWA "Add to Home Screen" on iOS.
These must be generated as PNG files at the exact device resolutions.

## Required Resolutions

| Device                    | Resolution  | Filename                          |
|---------------------------|-------------|-----------------------------------|
| iPad Pro 12.9" (3rd+)    | 2048x2732   | apple-splash-2048-2732.png        |
| iPad Pro 11" (1st+)      | 1668x2388   | apple-splash-1668-2388.png        |
| iPad Air 10.9"           | 1640x2360   | apple-splash-1640-2360.png        |
| iPad 10.2"               | 1620x2160   | apple-splash-1620-2160.png        |
| iPad Mini 8.3"           | 1488x2266   | apple-splash-1488-2266.png        |

## Generation

Use a tool such as [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator):

```bash
npx pwa-asset-generator public/icons/icon.svg public/splash \
  --splash-only \
  --landscape-only \
  --background "#ffffff"
```

## Adding to Layout

Once generated, add link tags to `src/app/layout.tsx`:

```html
<link
  rel="apple-touch-startup-image"
  media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
  href="/splash/apple-splash-2048-2732.png"
/>
```

Note: SG POS is locked to landscape orientation per the manifest.
