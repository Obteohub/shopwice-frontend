#!/bin/bash

# Deployment Fix Script for Vultr/CloudPanel
# Usage: ./deploy.sh

echo ">>> Stopping shopwice-web process..."
# Using || true to prevent script failure if app doesn't exist yet
pm2 delete shopwice-web || true

echo ">>> Pulling latest code..."
git pull origin main

echo ">>> Rebuilding project..."
npm ci --include=dev
npm run build

echo ">>> Copying static assets to standalone folder..."
mkdir -p .next/standalone/.next

# Clean old assets to prevent nesting issues
rm -rf .next/standalone/public
rm -rf .next/standalone/.next/static

# Copy public folder (images, favicon, etc)
cp -r public .next/standalone/

# Copy static assets (CSS, JS chunks)
cp -r .next/static .next/standalone/.next/

# Copy environment variables usually needed if not loaded by system
cp .env.production .next/standalone/.env.production 2>/dev/null || cp .env .next/standalone/.env 2>/dev/null || echo "No .env file copied"

echo ">>> Checking PM2 Config..."
cat ecosystem.config.js

echo ">>> Starting Server with PM2..."
pm2 start ecosystem.config.js
pm2 save

echo ">>> Done! Server should be running on Port 3001."
pm2 list
