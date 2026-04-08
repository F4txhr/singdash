#!/bin/bash

# ============================================
# Singdash VPN - VPS API Setup Script
# ============================================
# This script sets up the Testing API on your VPS
# Usage: bash scripts/setup-vps.sh

set -e  # Exit on error

echo "🚀 Singdash VPN - VPS API Setup"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠️  It's recommended to run this script with sudo${NC}"
    echo "Some commands may fail without proper permissions"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${BLUE}📍 Current directory: $(pwd)${NC}"
echo ""

# Step 1: Check Node.js installation
echo -e "${YELLOW}Step 1: Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Installing Node.js 18.x...${NC}"

    # Install Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs

    echo -e "${GREEN}✅ Node.js installed: $(node -v)${NC}"
else
    echo -e "${GREEN}✅ Node.js found: $(node -v)${NC}"
fi

# Step 2: Check PM2 installation
echo -e "${YELLOW}Step 2: Checking PM2 installation...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2 process manager...${NC}"
    npm install -g pm2
    echo -e "${GREEN}✅ PM2 installed${NC}"
else
    echo -e "${GREEN}✅ PM2 found: $(pm2 -v)${NC}"
fi

# Step 3: Setup API application
echo -e "${YELLOW}Step 3: Setting up Testing API...${NC}"

API_DIR="/opt/singdash-api"
if [ -d "$API_DIR" ]; then
    echo -e "${YELLOW}⚠️  API directory already exists at $API_DIR${NC}"
    read -p "Do you want to reinstall? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$API_DIR"
    else
        echo -e "${BLUE}Using existing installation${NC}"
    fi
fi

if [ ! -d "$API_DIR" ]; then
    echo -e "${BLUE}Creating API directory...${NC}"
    mkdir -p "$API_DIR"

    # Copy API files
    echo -e "${BLUE}Copying API files...${NC}"
    cp -r deploy/vps-api/testing-api/* "$API_DIR/"

    # Install dependencies
    echo -e "${BLUE}Installing dependencies...${NC}"
    cd "$API_DIR"
    npm install

    # Create .env from example if not exists
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        echo -e "${BLUE}Creating .env file from template...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please edit $API_DIR/.env with your configuration${NC}"
    fi
fi

# Step 4: Configure environment
echo -e "${YELLOW}Step 4: Configuring environment variables...${NC}"
echo ""
echo -e "${BLUE}Please provide the following information:${NC}"

read -p "Supabase URL (or press Enter to skip): " SUPABASE_URL
read -p "Supabase Anon Key (or press Enter to skip): " SUPABASE_KEY
read -p "API Port (default 3001): " API_PORT
read -p "GitHub Proxy Sources (comma-separated, default: FoolVPN-ID/Nautica): " GITHUB_SOURCES

API_PORT=${API_PORT:-3001}

# Update .env file
if [ -f "$API_DIR/.env" ]; then
    echo -e "${BLUE}Updating .env file...${NC}"
    sed -i "s|SUPABASE_URL=.*|SUPABASE_URL=$SUPABASE_URL|" "$API_DIR/.env"
    sed -i "s|SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$SUPABASE_KEY|" "$API_DIR/.env"
    sed -i "s|PORT=.*|PORT=$API_PORT|" "$API_DIR/.env"
    if [ ! -z "$GITHUB_SOURCES" ]; then
        sed -i "s|GITHUB_PROXY_SOURCES=.*|GITHUB_PROXY_SOURCES=$GITHUB_SOURCES|" "$API_DIR/.env"
    fi
fi

# Step 5: Setup PM2 process
echo -e "${YELLOW}Step 5: Setting up PM2 process...${NC}"

# Delete existing process if any
pm2 delete singdash-api 2>/dev/null || true

# Start with PM2
cd "$API_DIR"
pm2 start src/server.js --name singdash-api --env production

# Save PM2 process list
pm2 save

# Setup PM2 startup script
echo -e "${BLUE}Setting up PM2 startup on boot...${NC}"
pm2 startup systemd -u $USER --hp /home/$USER 2>/dev/null || pm2 startup -u $USER

echo -e "${GREEN}✅ API started with PM2${NC}"

# Step 6: Configure firewall
echo -e "${YELLOW}Step 6: Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    echo -e "${BLUE}Allowing port $API_PORT through UFW...${NC}"
    ufw allow $API_PORT/tcp
    ufw reload
    echo -e "${GREEN}✅ Firewall configured${NC}"
else
    echo -e "${YELLOW}⚠️  UFW not found. Please configure firewall manually.${NC}"
fi

# Step 7: Display status
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Singdash API Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
pm2 status singdash-api
echo ""
echo -e "${BLUE}🔗 API Endpoints:${NC}"
echo "   Health Check: http://YOUR-VPS-IP:$API_PORT/health"
echo "   API Stats:    http://YOUR-VPS-IP:$API_PORT/api/v1/stats"
echo ""
echo -e "${BLUE}📝 Useful Commands:${NC}"
echo "   View logs:     pm2 logs singdash-api"
echo "   Restart:       pm2 restart singdash-api"
echo "   Stop:          pm2 stop singdash-api"
echo "   Monitor:       pm2 monit"
echo ""
echo -e "${YELLOW}⚠️  Important: Don't forget to:${NC}"
echo "   1. Update .env file with your Supabase credentials"
echo "   2. Restart PM2 after updating: pm2 restart singdash-api"
echo "   3. Setup cron jobs for auto-testing (see deploy/cron-jobs/)"
echo ""
