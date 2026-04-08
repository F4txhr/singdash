#!/bin/bash

# ============================================
# Singdash VPN - Supabase Database Setup
# ============================================
# This script helps setup the database schema in Supabase
# Usage: bash scripts/setup-supabase-db.sh

set -e

echo "🗄️  Singdash VPN - Supabase Database Setup"
echo "==========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCHEMA_FILE="$(pwd)/database/schema.sql"

echo -e "${BLUE}📋 Prerequisites:${NC}"
echo "   1. Supabase account (free tier is fine)"
echo "   2. A Supabase project created"
echo "   3. SQL Editor access to your project"
echo ""

read -p "Do you have a Supabase project ready? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Please create a Supabase project first:${NC}"
    echo "   1. Go to https://supabase.com"
    echo "   2. Click 'Start your project'"
    echo "   3. Create a new organization and project"
    echo "   4. Come back here when done"
    echo ""
    exit 1
fi

echo ""
echo -e "${BLUE}Step 1: Getting Supabase credentials...${NC}"
read -p "Enter your Supabase URL (https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Enter your Supabase anon/public key: " SUPABASE_KEY

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo -e "${RED}❌ Both URL and key are required!${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Preparing schema file...${NC}"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Schema file not found at $SCHEMA_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Schema file found${NC}"

echo ""
echo -e "${YELLOW}Step 3: Apply schema to Supabase...${NC}"
echo ""
echo -e "${BLUE}You have 2 options:${NC}"
echo ""
echo -e "${GREEN}Option 1: Via Supabase Dashboard (Recommended)${NC}"
echo "   1. Go to: https://app.supabase.com/project/_/sql"
echo "   2. Copy the contents of: database/schema.sql"
echo "   3. Paste into SQL Editor"
echo "   4. Click 'Run'"
echo ""
echo -e "${GREEN}Option 2: Via Command Line (psql)${NC}"
echo "   Run this command:"
echo "   PGPASSWORD='YOUR_DB_PASSWORD' psql -h db.YOUR_PROJECT_ID.supabase.co \\"
echo "     -U postgres -d postgres -f database/schema.sql"
echo ""

read -p "Do you want to open the schema file for copying? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cat "$SCHEMA_FILE"
    echo ""
    echo -e "${YELLOW}⬆️  Copy the output above and paste it into Supabase SQL Editor${NC}"
fi

echo ""
echo -e "${BLUE}Step 4: Verify database setup...${NC}"
echo ""
echo -e "${BLUE}After applying the schema, verify by running these queries in SQL Editor:${NC}"
echo ""
echo "-- Check tables exist:"
echo "SELECT table_name FROM information_schema.tables"
echo "WHERE table_schema = 'public';"
echo ""
echo "-- Expected tables:"
echo "-- proxy_cache"
echo "-- workers"
echo "-- worker_uptime_history"
echo "-- test_history"
echo ""

echo -e "${BLUE}Step 5: Get your API credentials...${NC}"
echo ""
echo -e "${YELLOW}Go to Supabase Dashboard → Settings → API${NC}"
echo "   - Project URL: https://xxxxx.supabase.co"
echo "   - Anon/Public Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo ""
echo -e "${BLUE}Save these credentials! You'll need them for:${NC}"
echo "   - Testing API (.env file)"
echo "   - Cron jobs (.env file)"
echo "   - Dashboard configuration"
echo ""

# Create .env template
echo -e "${BLUE}Creating environment template...${NC}"
cat > "$(pwd)/.env.template" << EOF
# Singdash VPN Configuration
# Copy this to .env and fill in your values

# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_KEY

# Testing API Configuration
API_PORT=3001
NODE_ENV=production

# GitHub Proxy Sources (comma-separated URLs)
GITHUB_PROXY_SOURCES=https://github.com/FoolVPN-ID/Nautica/raw/main/proxyList.txt

# Optional: Custom proxy sources
# Add more sources separated by commas
# GITHUB_PROXY_SOURCES=https://github.com/user/repo/raw/main/proxies.txt,https://example.com/proxies.csv
EOF

echo -e "${GREEN}✅ Environment template created at: .env.template${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Database Setup Guide Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "   1. Apply schema.sql to your Supabase project"
echo "   2. Copy .env.template to .env"
echo "   3. Fill in your Supabase credentials"
echo "   4. Test the connection with your API"
echo ""
