#!/bin/bash
npm run build
rm -rf chrome-dist edge-dist
cp -r dist/ chrome-dist/
cp -r dist/ edge-dist/
cp public/manifest.json chrome-dist/manifest.json
cp public/manifest-edge.json edge-dist/manifest.json
echo "Built chrome-dist and edge-dist"
