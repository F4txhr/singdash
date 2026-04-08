# Singdash Testing API

Backend API untuk testing proxy, ISP lookup, dan generate VPN configurations.

---

## 🚀 Quick Start

### Installation

```bash
cd /root/singdash/testing-api
npm install
```

### Configuration

Copy `.env.example` ke `.env` dan sesuaikan:

```bash
cp .env.example .env
nano .env
```

**Required:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key

**Optional:**
- `MAXMIND_USER_ID` - MaxMind user ID (untuk ISP lookup)
- `MAXMIND_LICENSE_KEY` - MaxMind license key

### Run Development

```bash
npm run dev
```

Server akan running di `http://localhost:3001`

### Run Production

```bash
npm start
```

---

## 📡 API Endpoints

### **Proxy Testing**

#### **POST /api/proxies/test**
Bulk test proxies dari GitHub source.

```bash
curl -X POST http://localhost:3001/api/proxies/test \
  -H "Content-Type: application/json" \
  -d '{
    "source_url": "https://raw.githubusercontent.com/backup-heavenly-demons/gateway/main/kvProxyList.json",
    "countries": ["ID", "SG"],
    "concurrent": 50
  }'
```

#### **GET /api/proxies/:country**
Get tested proxies by country.

```bash
curl http://localhost:3001/api/proxies/ID?limit=20&status=alive
```

#### **POST /api/proxies/test-single**
Test single proxy.

```bash
curl -X POST http://localhost:3001/api/proxies/test-single \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "103.152.112.162",
    "port": 80,
    "protocol": "all"
  }'
```

---

### **ISP Lookup**

#### **GET /api/isp/:ip**
Lookup ISP info untuk IP address.

```bash
curl http://localhost:3001/api/isp/103.152.112.162
```

#### **POST /api/isp/batch**
Batch ISP lookup.

```bash
curl -X POST http://localhost:3001/api/isp/batch \
  -H "Content-Type: application/json" \
  -d '{
    "ips": ["103.152.112.162", "180.250.95.24"],
    "concurrency": 10
  }'
```

---

### **Config Generator**

#### **POST /api/config/generate**
Generate VPN configuration.

```bash
curl -X POST http://localhost:3001/api/config/generate \
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
  }'
```

#### **GET /api/config/singbox**
Direct download SingBox config.

```bash
curl "http://localhost:3001/api/config/singbox?ip=103.152.112.162&port=80&protocol=trojan&worker_domain=vpn.user.com" \
  -o config.json
```

#### **GET /api/config/clash**
Direct download Clash config (YAML).

```bash
curl "http://localhost:3001/api/config/clash?ip=103.152.112.162&port=80&protocol=trojan&worker_domain=vpn.user.com" \
  -o config.yaml
```

---

### **Stats & Health**

#### **GET /api/health**
Health check.

```bash
curl http://localhost:3001/api/health
```

#### **GET /api/stats/countries**
Statistics per country.

```bash
curl http://localhost:3001/api/stats/countries
```

#### **GET /api/stats/summary**
Quick summary.

```bash
curl http://localhost:3001/api/stats/summary
```

---

## 🗂️ Project Structure

```
testing-api/
├── src/
│   ├── routes/
│   │   ├── proxy.js          # Proxy testing endpoints
│   │   ├── isp.js            # ISP lookup endpoints
│   │   ├── config.js         # Config generator endpoints
│   │   └── health.js         # Health & stats endpoints
│   ├── services/
│   │   ├── proxyTester.js    # Proxy testing logic
│   │   ├── githubFetcher.js  # Fetch from GitHub
│   │   ├── ispLookup.js      # MaxMind ISP lookup
│   │   └── configGenerator.js # VPN config generator
│   ├── utils/
│   │   └── supabase.js       # Database client
│   ├── jobs/
│   │   └── proxyRefresh.js   # Cron job for auto-refresh
│   └── index.js              # Main Express app
├── data/                     # MaxMind databases
├── tests/                    # Test files
├── .env
├── .env.example
├── package.json
└── README.md
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3001` | Server port |
| `SUPABASE_URL` | - | Supabase project URL |
| `SUPABASE_KEY` | - | Supabase anon key |
| `MAXMIND_USER_ID` | - | MaxMind user ID |
| `MAXMIND_LICENSE_KEY` | - | MaxMind license key |
| `PROXY_SOURCE_URL` | GitHub URL | Default proxy source |
| `TEST_TIMEOUT` | `5000` | Proxy test timeout (ms) |
| `TEST_CONCURRENT` | `50` | Concurrent tests |
| `PROXY_REFRESH_CRON` | `0 */6 * * *` | Auto-refresh schedule |

---

## 🔄 Auto-Refresh

API automatically refreshes proxy list setiap 6 jam (configurable via `PROXY_REFRESH_CRON`).

Cron job akan:
1. Fetch proxy list dari GitHub
2. Test semua proxies (HTTP, HTTPS, SOCKS5)
3. Lookup ISP info
4. Save ke database

Manual trigger:
```bash
curl -X POST http://localhost:3001/api/proxies/test
```

---

## 🧪 Testing

```bash
npm test
```

---

## 📊 Sample Responses

### Proxy Test Response

```json
{
  "success": true,
  "data": {
    "total_fetched": 500,
    "total_alive": 234,
    "total_slow": 50,
    "total_dead": 216,
    "by_country": {
      "ID": { "total": 50, "alive": 23, "slow": 5, "dead": 22 },
      "SG": { "total": 30, "alive": 15, "slow": 3, "dead": 12 }
    },
    "duration_ms": 15234,
    "proxies": [
      {
        "ip": "103.152.112.162",
        "port": 80,
        "country_code": "ID",
        "country_name": "Indonesia",
        "isp": "PT Telkom Indonesia",
        "status": "alive",
        "response_time": 234,
        "protocols_supported": ["http", "https"]
      }
    ]
  }
}
```

### Config Generation Response

```json
{
  "success": true,
  "data": {
    "config": {
      "type": "trojan",
      "tag": "1 🇮🇩 PT Telkom Indonesia WS TLS [proxy]",
      "server": "support.zoom.us",
      "server_port": 443,
      "password": "uuid-here",
      "tls": {
        "enabled": true,
        "server_name": "vpn.user.com",
        "insecure": true
      },
      "transport": {
        "type": "ws",
        "path": "/103.152.112.162-80",
        "headers": {
          "Host": "vpn.user.com"
        }
      }
    },
    "metadata": {
      "username": "PT Telkom Indonesia",
      "flag_emoji": "🇮🇩",
      "proxy_ip": "103.152.112.162",
      "protocol": "trojan",
      "format": "singbox",
      "generated_at": "2024-03-22T10:30:00Z"
    }
  }
}
```

---

## 🚨 Troubleshooting

### Problem: MaxMind databases not found

**Solution:**
```bash
# Download manually dari https://www.maxmind.com/en/geolite2/signup
# Extract ke ./data/ folder
```

Atau gunakan fallback (ip-api.com) tanpa setup MaxMind.

### Problem: Database connection failed

**Solution:**
1. Check `SUPABASE_URL` dan `SUPABASE_KEY` di `.env`
2. Verify tables sudah dibuat di Supabase
3. Check network access (allow all IPs)

### Problem: Proxy test selalu timeout

**Solution:**
1. Increase `TEST_TIMEOUT` di `.env`
2. Check firewall/network connectivity
3. Reduce `TEST_CONCURRENT` untuk avoid rate limiting

---

## 📝 License

MIT
