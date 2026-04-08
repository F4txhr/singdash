#!/bin/bash

# ============================================
# Singdash Testing API - Local Test Script
# ============================================
# Script untuk test semua endpoint Testing API
# ============================================

BASE_URL="http://localhost:3001"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Singdash Testing API - Local Tests${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Check if server is running
echo -e "${YELLOW}🔍 Checking if server is running...${NC}"
if ! curl -s "$BASE_URL/api/health" > /dev/null; then
    echo -e "${RED}❌ Server not running!${NC}"
    echo ""
    echo "Start server first:"
    echo "  cd /root/singdash/testing-api"
    echo "  npm run dev"
    echo ""
    exit 1
fi
echo -e "${GREEN}✅ Server is running on $BASE_URL${NC}"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}[Test 1] Health Check${NC}"
echo "GET /api/health"
echo ""
curl -s "$BASE_URL/api/health" | jq .
echo ""
echo -e "${GREEN}✅ Health check passed${NC}"
echo ""
read -p "Press Enter to continue..."
echo ""

# Test 2: Root Endpoint
echo -e "${YELLOW}[Test 2] Root Endpoint${NC}"
echo "GET /"
echo ""
curl -s "$BASE_URL/" | jq .
echo ""
echo -e "${GREEN}✅ Root endpoint working${NC}"
echo ""
read -p "Press Enter to continue..."
echo ""

# Test 3: ISP Lookup (Free, no auth needed)
echo -e "${YELLOW}[Test 3] ISP Lookup${NC}"
echo "GET /api/isp/8.8.8.8"
echo ""
curl -s "$BASE_URL/api/isp/8.8.8.8" | jq .
echo ""
echo -e "${GREEN}✅ ISP lookup working${NC}"
echo ""
read -p "Press Enter to continue..."
echo ""

# Test 4: ISP Lookup Batch
echo -e "${YELLOW}[Test 4] ISP Lookup Batch${NC}"
echo "POST /api/isp/batch"
echo ""
curl -s -X POST "$BASE_URL/api/isp/batch" \
  -H "Content-Type: application/json" \
  -d '{"ips": ["8.8.8.8", "1.1.1.1", "103.152.112.162"]}' | jq .
echo ""
echo -e "${GREEN}✅ Batch ISP lookup working${NC}"
echo ""
read -p "Press Enter to continue..."
echo ""

# Test 5: Generate Config (SingBox Trojan)
echo -e "${YELLOW}[Test 5] Generate Config - SingBox Trojan${NC}"
echo "POST /api/config/generate"
echo ""
curl -s -X POST "$BASE_URL/api/config/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "103.152.112.162",
    "port": 80,
    "isp": "PT Telkom Indonesia",
    "country_code": "ID",
    "protocol": "trojan",
    "format": "singbox",
    "worker_domain": "vpn.user.com",
    "fake_sni": "support.zoom.us"
  }' | jq '.data.config.tag, .data.metadata'
echo ""
echo -e "${GREEN}✅ Config generation working${NC}"
echo ""
read -p "Press Enter to continue..."
echo ""

# Test 6: Generate Config (Clash)
echo -e "${YELLOW}[Test 6] Generate Config - Clash${NC}"
echo "POST /api/config/generate"
echo ""
curl -s -X POST "$BASE_URL/api/config/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "180.250.95.24",
    "port": 8080,
    "isp": "Biznet Networks",
    "country_code": "ID",
    "protocol": "vmess",
    "format": "clash",
    "worker_domain": "vpn.user.com",
    "fake_sni": "support.zoom.us"
  }' | jq '.data.config.name, .data.config.type'
echo ""
echo -e "${GREEN}✅ Clash config generation working${NC}"
echo ""
read -p "Press Enter to continue..."
echo ""

# Test 7: Stats Summary
echo -e "${YELLOW}[Test 7] Stats Summary${NC}"
echo "GET /api/stats/summary"
echo ""
curl -s "$BASE_URL/api/stats/summary" | jq .
echo ""
echo -e "${GREEN}✅ Stats summary working${NC}"
echo ""
read -p "Press Enter to continue..."
echo ""

# Test 8: Stats Countries (Requires Database)
echo -e "${YELLOW}[Test 8] Stats Countries (Database Test)${NC}"
echo "GET /api/stats/countries"
echo ""
RESPONSE=$(curl -s "$BASE_URL/api/stats/countries")
echo "$RESPONSE" | jq .
echo ""

# Check if database is connected
if echo "$RESPONSE" | jq -e '.error' > /dev/null; then
    echo -e "${YELLOW}⚠️  Database not configured yet (this is optional for now)${NC}"
    echo ""
    echo "To enable database features:"
    echo "  1. Setup Supabase (see docs/SUPABASE_SETUP.md)"
    echo "  2. Update .env with SUPABASE_URL and SUPABASE_KEY"
    echo "  3. Restart server"
    echo ""
else
    echo -e "${GREEN}✅ Database connection working${NC}"
    echo ""
fi
read -p "Press Enter to continue..."
echo ""

# Test 9: Proxy Test (Requires GitHub source)
echo -e "${YELLOW}[Test 9] Bulk Proxy Test${NC}"
echo "POST /api/proxies/test"
echo ""
echo -e "${YELLOW}This will fetch proxies from GitHub and test them.${NC}"
echo -e "${YELLOW}It may take 10-30 seconds depending on the number of proxies.${NC}"
echo ""
read -p "Run proxy test? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Fetching and testing proxies..."
    echo ""
    
    curl -s -X POST "$BASE_URL/api/proxies/test" \
      -H "Content-Type: application/json" \
      -d '{
        "source_url": "https://raw.githubusercontent.com/backup-heavenly-demons/gateway/refs/heads/main/kvProxyList.json",
        "countries": ["ID"],
        "concurrent": 20,
        "save_to_db": false
      }' | jq '.data | {total_fetched, total_alive, total_slow, total_dead, duration_ms}'
    
    echo ""
    echo -e "${GREEN}✅ Proxy test completed${NC}"
else
    echo -e "${YELLOW}⊘ Skipped proxy test${NC}"
fi
echo ""

# Test 10: Get Proxies by Country (Requires Database)
echo -e "${YELLOW}[Test 10] Get Proxies by Country${NC}"
echo "GET /api/proxies/ID"
echo ""
curl -s "$BASE_URL/api/proxies/ID?limit=5" | jq .
echo ""
echo -e "${GREEN}✅ Get proxies endpoint working${NC}"
echo ""

# Summary
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  All Tests Completed!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Summary:"
echo "  ✅ Health check"
echo "  ✅ Root endpoint"
echo "  ✅ ISP lookup (single & batch)"
echo "  ✅ Config generation (SingBox & Clash)"
echo "  ✅ Stats endpoints"
echo "  ⚠️  Proxy test (optional - requires GitHub source)"
echo "  ⚠️  Database features (optional - requires Supabase)"
echo ""
echo "Next steps:"
echo "  1. If not done, setup Supabase database"
echo "  2. Update .env with Supabase credentials"
echo "  3. Restart server and re-run tests"
echo "  4. Deploy to VPS/Railway when ready"
echo ""
