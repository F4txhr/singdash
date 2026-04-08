#!/bin/bash

# ============================================
# Singdash Worker Deploy Script
# ============================================
# Script ini akan:
# 1. Deploy worker ke Cloudflare
# 2. Auto-update timestamp last_deploy ke KV
# 3. Initialize stats counters jika belum ada
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Singdash Worker Deployment${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: Wrangler CLI not found!${NC}"
    echo "Please install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Cloudflare. Please login...${NC}"
    wrangler login
fi

echo -e "${GREEN}✓ Wrangler is installed and logged in${NC}"
echo ""

# Get environment from argument or default to production
ENV=${1:-production}
echo -e "${YELLOW}Deploying to environment: ${ENV}${NC}"
echo ""

# Deploy worker
echo -e "${YELLOW}Deploying worker...${NC}"
if [ "$ENV" = "production" ]; then
    wrangler deploy --env production
else
    wrangler deploy --env $ENV
fi

echo ""
echo -e "${GREEN}✓ Worker deployed successfully!${NC}"
echo ""

# Get KV namespace ID from wrangler.toml
KV_ID=$(grep -A 1 'binding = "KV"' wrangler.toml | grep 'id =' | cut -d'"' -f2)

if [ -z "$KV_ID" ]; then
    echo -e "${RED}Warning: KV namespace ID not found in wrangler.toml${NC}"
    echo "Please create KV namespace first:"
    echo "  wrangler kv:namespace create \"KV\""
    echo ""
    echo -e "${YELLOW}Skipping KV initialization...${NC}"
else
    echo -e "${GREEN}✓ Found KV namespace ID: ${KV_ID}${NC}"
    echo ""
    
    # Initialize last_deploy timestamp
    echo -e "${YELLOW}Initializing KV storage...${NC}"
    
    TIMESTAMP=$(date +%s)
    echo "Setting last_deploy to: $TIMESTAMP ($(date -d @$TIMESTAMP))"
    wrangler kv:key put last_deploy $TIMESTAMP
    
    # Initialize counters if not exist
    echo "Initializing total_requests counter..."
    wrangler kv:key put total_requests 0 || true
    
    echo "Initializing total_bandwidth counter..."
    wrangler kv:key put total_bandwidth 0 || true
    
    echo ""
    echo -e "${GREEN}✓ KV storage initialized!${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Show useful commands
echo -e "${YELLOW}Useful commands:${NC}"
echo "  Test uptime:     curl https://your-worker.workers.dev/uptime"
echo "  Test ping:       curl https://your-worker.workers.dev/ping"
echo "  View stats:      curl https://your-worker.workers.dev/stats"
echo "  View info:       curl https://your-worker.workers.dev/info"
echo ""
echo -e "${YELLOW}Monitor logs:${NC}"
echo "  wrangler tail"
echo ""
