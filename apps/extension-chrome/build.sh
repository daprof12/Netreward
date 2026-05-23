#!/bin/bash
# build.sh — Build once, package twice (Chrome + Edge)
set -e

echo "🔨 Building extension..."
npm run build

echo ""
echo "📦 Packaging for Chrome..."
rm -rf chrome-dist
cp -r dist/ chrome-dist/

echo "📦 Packaging for Edge..."
rm -rf edge-dist
cp -r dist/ edge-dist/
# Replace manifest with Edge-specific version
cp public/manifest-edge.json edge-dist/manifest.json

echo ""
echo "✅ Done!"
echo "   Chrome: ./chrome-dist/"
echo "   Edge:   ./edge-dist/"
echo ""
echo "To load in Chrome:"
echo "  1. Go to chrome://extensions"
echo "  2. Enable Developer Mode"
echo "  3. Click 'Load unpacked' → select chrome-dist/"
echo ""
echo "To load in Edge:"
echo "  1. Go to edge://extensions"
echo "  2. Enable Developer Mode"
echo "  3. Click 'Load unpacked' → select edge-dist/"
