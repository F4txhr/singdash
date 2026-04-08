#!/bin/bash

# ============================================
# Singdash VPN - Cron Job Setup Script
# ============================================
# This script sets up automated cron jobs for:
# 1. Auto-test proxies 4x daily (every 6 hours)
# 2. Worker health check every 5 minutes
# Usage: bash scripts/setup-cron.sh

set -e

echo "🚀 Singdash VPN - Cron Job Setup"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CRON_DIR="/opt/singdash-cron"
SCRIPTS_DIR="$(pwd)/deploy/cron-jobs"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠️  It's recommended to run this script with sudo${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${BLUE}Step 1: Setting up cron job directory...${NC}"
mkdir -p "$CRON_DIR"

# Copy cron scripts
echo -e "${BLUE}Step 2: Copying cron scripts...${NC}"
cp "$SCRIPTS_DIR/auto-test.js" "$CRON_DIR/"
cp "$SCRIPTS_DIR/check-workers.js" "$CRON_DIR/"

# Install dependencies if needed
if [ ! -d "$CRON_DIR/node_modules" ]; then
    echo -e "${BLUE}Step 3: Installing dependencies...${NC}"
    cd "$CRON_DIR"
    npm init -y > /dev/null 2>&1
    npm install node-fetch dotenv @supabase/supabase-js
fi

# Configure environment
echo -e "${BLUE}Step 4: Configuring environment variables...${NC}"
cat > "$CRON_DIR/.env" << EOF
# Singdash VPN Cron Jobs Configuration
# Generated on $(date)

# Testing API Endpoint
API_URL=http://localhost:3001

# Supabase Configuration
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# GitHub Proxy Sources (comma-separated)
GITHUB_SOURCES=https://github.com/FoolVPN-ID/Nautica/raw/main/proxyList.txt

# Logging
LOG_FILE=/var/log/singdash-cron.log
EOF

echo -e "${YELLOW}⚠️  Please edit $CRON_DIR/.env with your configuration:${NC}"
read -p "Open .env file now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    nano "$CRON_DIR/.env"
fi

# Setup logging
echo -e "${BLUE}Step 5: Setting up log file...${NC}"
touch /var/log/singdash-cron.log
chmod 644 /var/log/singdash-cron.log

# Add cron jobs
echo -e "${BLUE}Step 6: Adding cron jobs...${NC}"

# Create temporary crontab file
TEMP_CRON=$(mktemp)

# Export current crontab or create empty
crontab -l 2>/dev/null > "$TEMP_CRON" || true

# Check if cron jobs already exist
if grep -q "singdash.*auto-test" "$TEMP_CRON"; then
    echo -e "${YELLOW}⚠️  Auto-test cron job already exists${NC}"
    read -p "Replace it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remove old cron job
        sed -i '/singdash.*auto-test/d' "$TEMP_CRON"
    fi
fi

if grep -q "singdash.*check-workers" "$TEMP_CRON"; then
    echo -e "${YELLOW}⚠️  Worker check cron job already exists${NC}"
    read -p "Replace it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remove old cron job
        sed -i '/singdash.*check-workers/d' "$TEMP_CRON"
    fi
fi

# Add new cron jobs
cat >> "$TEMP_CRON" << 'EOF'

# Singdash VPN - Auto-test proxies 4x daily (at 00:00, 06:00, 12:00, 18:00)
0 */6 * * * /usr/bin/node /opt/singdash-cron/auto-test.js >> /var/log/singdash-cron.log 2>&1

# Singdash VPN - Worker health check every 5 minutes
*/5 * * * * /usr/bin/node /opt/singdash-cron/check-workers.js >> /var/log/singdash-cron.log 2>&1
EOF

# Install new crontab
crontab "$TEMP_CRON"
rm "$TEMP_CRON"

echo -e "${GREEN}✅ Cron jobs installed successfully!${NC}"
echo ""

# Display cron schedule
echo -e "${BLUE}📅 Installed Cron Schedule:${NC}"
echo "   Auto-test proxies:  Every 6 hours (00:00, 06:00, 12:00, 18:00)"
echo "   Worker health check: Every 5 minutes"
echo ""

# Verify cron jobs
echo -e "${BLUE}🔍 Current Crontab:${NC}"
crontab -l | grep singdash
echo ""

# Test run
echo -e "${YELLOW}💡 Optional: Run a test now?${NC}"
read -p "Run auto-test now to verify setup? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Running auto-test...${NC}"
    cd "$CRON_DIR"
    node auto-test.js
    echo ""
    echo -e "${GREEN}✅ Test complete! Check logs at: /var/log/singdash-cron.log${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Cron Job Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📝 Useful Commands:${NC}"
echo "   View logs:      tail -f /var/log/singdash-cron.log"
echo "   List cron jobs: crontab -l"
echo "   Edit cron jobs: crontab -e"
echo "   Manual test:    cd $CRON_DIR && node auto-test.js"
echo ""
