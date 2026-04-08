# Singdash Testing API - Endpoint Usage Guide

## 📍 Base URL
```
Development: http://localhost:3001
Production: https://your-api-domain.com
```

---

## 1. Health Check

### `GET /api/health`
Cek apakah API sehat dan berjalan.

**Contoh:**
```bash
curl http://localhost:3001/api/health
```

**Response:**
```json
{
  "success": true,
  "message": "API is healthy",
  "data": {
    "status": "ok",
    "timestamp": "2026-03-22T18:18:38.668Z",
    "uptime_seconds": 120,
    "database": "not_applicable",
    "mode": "pure_on_demand",
    "version": "1.0.0"
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-03-22T18:18:38.668Z",
    "response_time": 5
  }
}
```

---

## 2. ISP Lookup

### `GET /api/isp/:ip`
Cari informasi ISP dari sebuah IP address.

**Contoh 1 - IPv4:**
```bash
curl http://localhost:3001/api/isp/8.8.8.8
```

**Contoh 2 - IPv4 (IP Proxy):**
```bash
curl http://localhost:3001/api/isp/103.152.112.162
```

**Response:**
```json
{
  "success": true,
  "message": "ISP lookup successful",
  "data": {
    "ip": "8.8.8.8",
    "isp": "Google LLC",
    "country_code": "US",
    "country_name": "United States",
    "city": "Mountain View",
    "timezone": "America/Los_Angeles"
  },
  "meta": {
    "request_id": "req_xyz789",
    "timestamp": "2026-03-22T18:20:15.123Z",
    "response_time": 45
  }
}
```

**Error - Invalid IP:**
```bash
curl http://localhost:3001/api/isp/invalid-ip
```
```json
{
  "success": false,
  "message": "Invalid IP address format",
  "error": {
    "code": "BAD_REQUEST",
    "type": "ClientError",
    "details": {
      "provided": "invalid-ip",
      "format": "IPv4 or IPv6"
    }
  },
  "meta": {
    "request_id": "req_err001",
    "timestamp": "2026-03-22T18:21:00.000Z"
  }
}
```

---

## 3. Test Single Proxy

### `POST /api/proxies/test-single`
Test satu proxy IP untuk cek connectivity.

**Body Parameters:**
- `ip` (required): IP address
- `port` (required): Port number (1-65535)
- `protocol` (optional): `quick` (default), `all`, atau `ping`

**Contoh 1 - Quick Test:**
```bash
curl -X POST http://localhost:3001/api/proxies/test-single \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "103.152.112.162",
    "port": 80
  }'
```

**Contoh 2 - Full Test (All Protocols):**
```bash
curl -X POST http://localhost:3001/api/proxies/test-single \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "103.152.112.162",
    "port": 443,
    "protocol": "all"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Proxy test completed",
  "data": {
    "ip": "103.152.112.162",
    "port": 80,
    "status": "alive",
    "ping_ms": 45,
    "protocols": {
      "http": {"available": true, "latency_ms": 45},
      "https": {"available": true, "latency_ms": 52},
      "socks5": {"available": false, "latency_ms": null}
    },
    "country_code": "ID",
    "country_name": "Indonesia",
    "isp": "PT Cloud Hosting Indonesia"
  },
  "meta": {
    "request_id": "req_test001",
    "timestamp": "2026-03-22T18:25:00.000Z",
    "response_time": 1250
  }
}
```

**Status Values:**
- `"alive"` - Ping < 200ms (good)
- `"slow"` - Ping 200-1000ms (usable)
- `"dead"` - Ping > 1000ms atau timeout

---

## 4. Bulk Proxy Test

### `POST /api/proxies/test`
Test semua proxy dari GitHub source sekaligus.

**Body Parameters:**
- `source_url` (required): URL raw GitHub yang berisi daftar proxy
- `countries` (optional): Filter country codes (array)
- `concurrent` (optional): Jumlah concurrent tests (default: 50)

**Contoh 1 - Test Semua Proxy:**
```bash
curl -X POST http://localhost:3001/api/proxies/test \
  -H "Content-Type: application/json" \
  -d '{
    "source_url": "https://raw.githubusercontent.com/user/repo/main/proxy-list.txt"
  }'
```

**Contoh 2 - Filter by Country:**
```bash
curl -X POST http://localhost:3001/api/proxies/test \
  -H "Content-Type: application/json" \
  -d '{
    "source_url": "https://raw.githubusercontent.com/user/repo/main/proxy-list.txt",
    "countries": ["ID", "SG", "MY"],
    "concurrent": 100
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk proxy test completed",
  "data": {
    "total_fetched": 500,
    "total_tested": 500,
    "total_alive": 320,
    "total_slow": 150,
    "total_dead": 30,
    "duration_ms": 15000,
    "by_country": {
      "ID": {"total": 150, "alive": 100, "slow": 40, "dead": 10},
      "SG": {"total": 200, "alive": 150, "slow": 40, "dead": 10},
      "MY": {"total": 150, "alive": 70, "slow": 70, "dead": 10}
    },
    "proxies": [
      {
        "ip": "103.152.112.162",
        "port": 80,
        "status": "alive",
        "ping_ms": 45,
        "country_code": "ID",
        "country_name": "Indonesia",
        "isp": "PT Cloud Hosting Indonesia"
      },
      // ... more proxies
    ],
    "tested_at": "2026-03-22T18:30:00.000Z"
  },
  "meta": {
    "request_id": "req_bulk001",
    "timestamp": "2026-03-22T18:30:15.000Z",
    "response_time": 15000
  }
}
```

---

## 5. Get Proxies by Country

### `GET /api/proxies/:country`
Dapatkan proxy untuk negara tertentu (auto-test on-demand).

**URL Parameters:**
- `country`: Country code (e.g., `ID`, `SG`, `US`)

**Query Parameters:**
- `limit`: Maximum proxies to return (default: 20)

**Contoh 1 - Get ID Proxies:**
```bash
curl "http://localhost:3001/api/proxies/ID"
```

**Contoh 2 - Get SG Proxies with Limit:**
```bash
curl "http://localhost:3001/api/proxies/SG?limit=50"
```

**Response:**
```json
{
  "success": true,
  "message": "Found 15 alive proxies in ID",
  "data": {
    "country_code": "ID",
    "total": 20,
    "alive": 15,
    "proxies": [
      {
        "ip": "103.152.112.162",
        "port": 80,
        "status": "alive",
        "ping_ms": 45,
        "country_code": "ID",
        "country_name": "Indonesia",
        "isp": "PT Cloud Hosting Indonesia"
      }
      // ... more
    ],
    "tested_at": "2026-03-22T18:35:00.000Z"
  },
  "meta": {
    "request_id": "req_country001",
    "timestamp": "2026-03-22T18:35:05.000Z",
    "response_time": 3500
  }
}
```

---

## 6. Generate VPN Config

### `POST /api/config/generate`
Generate VPN configuration (SingBox, Clash, V2Ray).

**Body Parameters:**
- `ip` (required): Proxy IP
- `worker_domain` (required): Domain worker Cloudflare
- `port` (optional): Port (default: 80)
- `protocol` (optional): `trojan` (default), `vmess`, `shadowsocks`, `vless`
- `format` (optional): `singbox` (default), `clash`, `v2ray`
- `isp` (optional): ISP name (untuk display)
- `country_code` (optional): Country code
- `country_name` (optional): Country name
- `fake_sni` (optional): Custom SNI
- `uuid` (optional): Custom UUID (auto-generated if not provided)

**Contoh 1 - Generate SingBox Config:**
```bash
curl -X POST http://localhost:3001/api/config/generate \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "103.152.112.162",
    "port": 443,
    "worker_domain": "my-worker.workers.dev",
    "protocol": "trojan",
    "format": "singbox",
    "isp": "PT Cloud Hosting Indonesia",
    "country_code": "ID"
  }'
```

**Contoh 2 - Generate Clash Config:**
```bash
curl -X POST http://localhost:3001/api/config/generate \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "103.152.112.162",
    "worker_domain": "my-worker.workers.dev",
    "protocol": "vmess",
    "format": "clash"
  }'
```

**Response (SingBox):**
```json
{
  "success": true,
  "message": "VPN configuration generated successfully",
  "data": {
    "config": {
      "log": {
        "level": "info",
        "timestamp": true
      },
      "dns": {...},
      "inbounds": [...],
      "outbounds": [
        {
          "type": "trojan",
          "tag": "proxy",
          "server": "103.152.112.162",
          "server_port": 443,
          "password": "auto-generated-uuid",
          "tls": {
            "enabled": true,
            "server_name": "my-worker.workers.dev",
            "utls": {...}
          },
          "transport": {
            "type": "ws",
            "path": "/?ed=2048",
            "headers": {
              "Host": "my-worker.workers.dev"
            }
          }
        }
      ]
    },
    "subscription_url": "https://your-api-domain.com/api/config/singbox?ip=103.152.112.162&...",
    "proxy_name": "🇮🇩 ID - PT Cloud Hosting Indonesia"
  },
  "meta": {
    "request_id": "req_config001",
    "timestamp": "2026-03-22T18:40:00.000Z",
    "response_time": 15,
    "protocol": "trojan",
    "format": "singbox"
  }
}
```

---

## 7. Download SingBox Config

### `GET /api/config/singbox`
Generate dan download file config SingBox langsung.

**Query Parameters:**
- `ip` (required): Proxy IP
- `worker_domain` (required): Worker domain
- `port` (optional): Port (default: 80)
- `protocol` (optional): Protocol (default: trojan)
- `fake_sni` (optional): Custom SNI
- `isp` (optional): ISP name
- `country_code` (optional): Country code

**Contoh:**
```bash
curl -o singbox-config.json \
  "http://localhost:3001/api/config/singbox?ip=103.152.112.162&worker_domain=my-worker.workers.dev&port=443"
```

Atau buka langsung di browser:
```
http://localhost:3001/api/config/singbox?ip=103.152.112.162&worker_domain=my-worker.workers.dev
```

**Response:**
- Content-Type: `application/json`
- Content-Disposition: `attachment; filename="singbox-103.152.112.162.json"`
- File JSON ready to import ke SingBox app

---

## 8. Download Clash Config

### `GET /api/config/clash`
Generate dan download file config Clash langsung.

**Query Parameters:**
- `ip` (required): Proxy IP
- `worker_domain` (required): Worker domain
- `port` (optional): Port (default: 80)
- `protocol` (optional): Protocol (default: trojan)
- `fake_sni` (optional): Custom SNI
- `isp` (optional): ISP name
- `country_code` (optional): Country code

**Contoh:**
```bash
curl -o clash-config.yaml \
  "http://localhost:3001/api/config/clash?ip=103.152.112.162&worker_domain=my-worker.workers.dev&port=443"
```

**Response:**
- Content-Type: `text/yaml`
- Content-Disposition: `attachment; filename="clash-103.152.112.162.yaml"`
- File YAML ready to import ke Clash app

---

## 9. Country Statistics

### `GET /api/stats/countries`
Dapatkan statistik proxy per negara dengan quick test.

**Contoh:**
```bash
curl http://localhost:3001/api/stats/countries
```

**Response:**
```json
{
  "success": true,
  "message": "Country statistics fetched successfully",
  "data": {
    "total_countries": 15,
    "total_proxies": 500,
    "countries": [
      {
        "code": "ID",
        "name": "Indonesia",
        "flag": "🇮🇩",
        "total": 150,
        "alive": 100,
        "slow": 40,
        "dead": 10
      },
      {
        "code": "SG",
        "name": "Singapore",
        "flag": "🇸🇬",
        "total": 200,
        "alive": 150,
        "slow": 40,
        "dead": 10
      }
    ],
    "tested_at": "2026-03-22T18:45:00.000Z"
  },
  "meta": {
    "request_id": "req_stats001",
    "timestamp": "2026-03-22T18:45:10.000Z",
    "response_time": 8500
  }
}
```

---

## 10. Proxy Summary

### `GET /api/stats/summary`
Quick summary tanpa testing.

**Contoh:**
```bash
curl http://localhost:3001/api/stats/summary
```

**Response:**
```json
{
  "success": true,
  "message": "Proxy summary fetched successfully",
  "data": {
    "total_countries": 15,
    "total_proxies": 500,
    "countries": [
      {"code": "ID", "count": 150},
      {"code": "SG", "count": 200},
      {"code": "MY", "count": 150}
    ],
    "tested_at": "2026-03-22T18:50:00.000Z"
  },
  "meta": {
    "request_id": "req_summary001",
    "timestamp": "2026-03-22T18:50:00.000Z",
    "response_time": 250,
    "note": "Use /api/stats/countries for detailed stats with testing"
  }
}
```

---

## 11. API Documentation

### `GET /api/docs`
Lihat dokumentasi API lengkap.

**Contoh:**
```bash
curl http://localhost:3001/api/docs
```

**Response:**
```json
{
  "api": "Singdash Testing API",
  "version": "v1",
  "base_url": "http://localhost:3001",
  "authentication": "None (Public API)",
  "rate_limit": "100 requests/minute",
  "endpoints": {
    "health": {...},
    "isp_lookup": {...},
    "generate_config": {...},
    "test_proxy": {...}
  },
  "response_format": {
    "success": {...},
    "error": {...}
  }
}
```

---

## 🔍 Common Use Cases

### Use Case 1: Complete Workflow untuk Dashboard

```bash
# 1. Fetch & test all proxies
TEST_RESULT=$(curl -X POST http://localhost:3001/api/proxies/test \
  -H "Content-Type: application/json" \
  -d '{"source_url": "https://raw.githubusercontent.com/user/repo/main/proxies.txt"}')

# 2. Get alive proxies only
ALIVE_PROXIES=$(echo $TEST_RESULT | jq '.data.proxies | map(select(.status == "alive"))')

# 3. Generate config for each alive proxy
echo $ALIVE_PROXIES | jq -c '.[]' | while read proxy; do
  IP=$(echo $proxy | jq -r '.ip')
  curl -X POST http://localhost:3001/api/config/generate \
    -H "Content-Type: application/json" \
    -d "{
      \"ip\": \"$IP\",
      \"worker_domain\": \"my-worker.workers.dev\",
      \"protocol\": \"trojan\",
      \"format\": \"singbox\"
    }"
done
```

### Use Case 2: Monitor Specific Country

```bash
# Get Singapore proxies every hour
while true; do
  curl "http://localhost:3001/api/proxies/SG?limit=50" | \
    jq '.data.proxies | map(select(.status == "alive")) | length'
  sleep 3600
done
```

### Use Case 3: Bulk Config Generation

```bash
# Generate configs for top 10 fastest proxies
curl -X POST http://localhost:3001/api/proxies/test \
  -H "Content-Type: application/json" \
  -d '{"source_url": "..."}' | \
  jq -r '.data.proxies | sort_by(.ping_ms) | .[0:10] | .[] | .ip' | \
  while read IP; do
    curl -o "config-$IP.json" \
      "http://localhost:3001/api/config/singbox?ip=$IP&worker_domain=my-worker.workers.dev"
  done
```

---

## 🎯 Tips

1. **Request Tracking**: Selalu cek `request_id` di response untuk debugging
2. **Response Time**: Gunakan `response_time` di meta untuk monitor performa
3. **Rate Limiting**: API limit 100 req/min - gunakan bulk endpoints untuk efficiency
4. **Error Handling**: Selalu check `success` field sebelum process data
5. **Headers**: Response headers include `X-Request-ID` dan `X-RateLimit-*`

---

## 📊 Response Headers

Setiap response akan include headers berikut:

```
X-Request-ID: req_abc123xyz
X-Response-Time: 45ms
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1679512800000
Access-Control-Allow-Origin: *
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
```

---

Untuk lebih detail, cek `/api/docs` atau source code di `/src/routes/`.
