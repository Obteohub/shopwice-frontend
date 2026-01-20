#!/bin/bash

# Deployment Fix Script for Vultr/CloudPanel
# Usage: ./deploy.sh

echo ">>> Stopping all Node processes to clear ports..."
pkill -f node
pm2 delete all

echo ">>> Pulling latest code..."
git pull origin main

echo ">>> Rebuilding project..."
npm ci
npm run build

echo ">>> Checking PM2 Config..."
cat ecosystem.config.js

echo ">>> Starting Server with PM2..."
pm2 start ecosystem.config.js
pm2 save

echo ">>> Done! Server should be running on Port 3001."
pm2 list
