#!/bin/bash

# ============================================
# Singdash VPN - Vercel Dashboard Deployment
# ============================================
# This script helps deploy the dashboard to Vercel
# Usage: bash scripts/deploy-vercel.sh

set -e  # Exit on error

echo "🚀 Singdash VPN - Vercel Dashboard Deployment"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "deploy/vercel-dashboard/index.html" ]; then
    echo -e "${RED}❌ Error: index.html not found in deploy/vercel-dashboard/${NC}"
    echo "Please run this script from the /root/singdash directory"
    exit 1
fi

echo -e "${BLUE}📦 Preparing deployment files...${NC}"

# Create deployment ZIP
cd deploy/vercel-dashboard
zip -r ../singdash-vercel-deploy.zip ./*
cd ../..

echo -e "${GREEN}✅ Deployment package created: deploy/singdash-vercel-deploy.zip${NC}"
echo ""

echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Click 'Add New...' → 'Project'"
echo "3. Drag & drop the ZIP file or use GitHub integration"
echo "4. Configure project settings:"
echo "   - Framework Preset: Other"
echo "   - Root Directory: ./ (leave as is)"
echo "   - Build Command: Leave empty"
echo "   - Output Directory: Leave empty"
echo "5. Click 'Deploy'"
echo ""

echo -e "${BLUE}💡 Alternative: Deploy via CLI${NC}"
echo "If you have Vercel CLI installed:"
echo "  cd deploy/vercel-dashboard"
echo "  vercel --prod"
echo ""

echo -e "${GREEN}🎉 Dashboard ready for deployment!${NC}"
