# Testing API - Quick Test Commands

Kumpulan command untuk test Testing API secara local.

---

## 🚀 **Start Server**

```bash
cd /root/singdash/testing-api
npm run dev
```

Server akan running di `http://localhost:3001`

---

## 🧪 **Test Commands (Copy-Paste)**

### **1. Health Check**

```bash
curl http://localhost:3001/api/health | jq .
```

Expected:
```json
{
  "status": "ok",
  "uptime_seconds": 123,
  "database": "connected" or "not_configured",
  "version": "1.0.0"
}
```

---

### **2. Root Endpoint**

```bash
curl http://localhost:3001/ | jq .
```

Expected:
```json
{
  "name": "Singdash Testing API",
  "version": "1.0.0",
  "endpoints": { ... }
}
```

---

### **3. ISP Lookup (Single IP)**

```bash
curl http://localhost:3001/api/isp/8.8.8.8 | jq .
```

Expected:
```json
{
  "success": true,
  "data": {
    "ip": "8.8.8.8",
    "country_code": "US",
    "country_name": "United States",
    "isp": "Google LLC",
    ...
  }
}
```

---

### **4. ISP Lookup (Batch)**

```bash
curl -X POST http://localhost:3001/api/isp/batch \
  -H "Content-Type: application/json" \
  -d '{"ips": ["8.8.8.8", "1.1.1.1", "103.152.112.162"]}' | jq .
```

Expected: List of ISP info untuk setiap IP.

---

### **5. Generate SingBox Config (Trojan)**

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
  }' | jq '.data.config.tag'
```

Expected: `"1 🇮🇩 PT Telkom Indonesia WS TLS [proxy]"`

---

### **6. Generate Clash Config (VMess)**

```bash
curl -X POST http://localhost:3001/api/config/generate \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "180.250.95.24",
    "port": 8080,
    "isp": "Biznet Networks",
    "country_code": "ID",
    "protocol": "vmess",
    "format": "clash",
    "worker_domain": "vpn.user.com"
  }' | jq '.data.config.name, .data.config.type'
```

Expected: `"🇮🇩 Biznet Networks"` dan `"vmess"`

---

### **7. Stats Summary**

```bash
curl http://localhost:3001/api/stats/summary | jq .
```

Expected:
```json
{
  "success": true,
  "data": {
    "total_countries": 0,
    "total_proxies": 0,
    "total_alive": 0
  }
}
```

(Angka 0 karena belum ada data di database)

---

### **8. Stats Countries**

```bash
curl http://localhost:3001/api/stats/countries | jq .
```

Expected: List countries dengan stats (atau error kalau DB belum connect).

---

### **9. Get Proxies by Country**

```bash
curl "http://localhost:3001/api/proxies/ID?limit=10&status=alive" | jq .
```

Expected: Empty list kalau DB belum ada data.

---

### **10. Bulk Proxy Test (Manual Trigger)**

```bash
curl -X POST http://localhost:3001/api/proxies/test \
  -H "Content-Type: application/json" \
  -d '{
    "source_url": "https://raw.githubusercontent.com/backup-heavenly-demons/gateway/refs/heads/main/kvProxyList.json",
    "countries": ["ID", "SG"],
    "concurrent": 20,
    "save_to_db": false
  }' | jq '.data | {total_fetched, total_alive, duration_ms}'
```

⏱️ This will take 10-30 seconds!

Expected:
```json
{
  "total_fetched": 100,
  "total_alive": 45,
  "duration_ms": 15234
}
```

---

## 🎯 **All-in-One Test Script**

Atau kalau mau run semua test sekaligus:

```bash
cd /root/singdash/testing-api
./test.sh
```

Script ini akan:
1. Check server status
2. Run semua endpoint tests
3. Show results dengan color coding
4. Provide summary

---

## ✅ **Expected Results:**

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/health` | ✅ Should work | Database may show "not_configured" |
| `/api/isp/*` | ✅ Should work | Uses free ip-api.com fallback |
| `/api/config/generate` | ✅ Should work | No database needed |
| `/api/stats/*` | ⚠️ May show 0 | Needs Supabase database |
| `/api/proxies/*` | ⚠️ May show empty | Needs Supabase database |
| `/api/proxies/test` | ✅ Should work | Set `save_to_db: false` for testing |

---

## 🔧 **Troubleshooting:**

### Problem: `curl: command not found`

**Solution:**
```bash
# Install curl
apt update && apt install -y curl
```

### Problem: `jq: command not found`

**Solution:**
```bash
# Install jq
apt update && apt install -y jq
```

### Problem: Connection refused

**Solution:**
```bash
# Make sure server is running
cd /root/singdash/testing-api
npm run dev

# Or check if port 3001 is in use
lsof -i :3001
```

### Problem: Dependencies missing

**Solution:**
```bash
cd /root/singdash/testing-api
npm install
```

---

## 📊 **Test Without Database:**

Kalau belum setup Supabase, kamu masih bisa test:

1. ✅ ISP lookup (uses free fallback)
2. ✅ Config generation (no DB needed)
3. ✅ Health check (will show "not_configured")
4. ✅ Proxy test (set `save_to_db: false`)

Stats akan show 0 atau empty, tapi core functionality working!

---

## 📝 **Next Steps:**

Setelah local testing berhasil:

1. ✅ Setup Supabase database (optional but recommended)
2. ✅ Update `.env` dengan Supabase credentials
3. ✅ Re-test database-dependent endpoints
4. ✅ Deploy to VPS/Railway
5. ✅ Test production deployment

---

**Happy Testing!** 🚀
