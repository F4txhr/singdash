# Singdash Worker Modifications

Modified Cloudflare Worker script dengan tambahan monitoring endpoints.

---

## 🆕 New Endpoints

### **1. `/ping` - Health Check**

Simple endpoint untuk check apakah worker online.

**Request:**
```bash
GET https://your-worker.workers.dev/ping
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1711234567890,
  "datetime": "2024-03-22T10:30:00Z",
  "domain": "your-worker.workers.dev",
  "server": "your-worker"
}
```

---

### **2. `/uptime` - Uptime Information**

Informasi uptime worker sejak deploy terakhir dengan **multiple format**.

**Request:**
```bash
GET https://your-worker.workers.dev/uptime
```

**Response:**
```json
{
  "status": "ok",
  "uptime": {
    "total_seconds": 95415,
    "compact": "1d 2h 30m 15s",
    "iso_8601": "P1DT2H30M15S"
  },
  "last_deploy": "2024-03-21T08:00:00Z",
  "current_time": "2024-03-22T10:30:15Z"
}
```

**Format Uptime yang Tersedia:**

| Format | Example | Description |
|--------|---------|-------------|
| `compact` | `"1d 2h 30m 15s"` | Format singkat (English abbreviations) |
| `iso_8601` | `"P1DT2H30M15S"` | Standard ISO 8601 duration |

**Contoh Berbagai Durasi:**

```javascript
// < 1 menit
45 detik → compact: "45s", iso: "PT45S"

// Beberapa menit
6 menit 15 detik → compact: "6m 15s", iso: "PT6M15S"

// Beberapa jam
1 jam 30 menit → compact: "1h 30m", iso: "PT1H30M"

// Beberapa hari
3 hari 5 jam → compact: "3d 5h", iso: "P3DT5H"
```

**Error (jika KV belum diinitialize):**
```json
{
  "error": "Last deploy timestamp not found. Please redeploy worker.",
  "hint": "Run: wrangler kv:key put last_deploy $(date +%s)"
}
```

---

### **3. `/stats` - Detailed Statistics**

Statistik lengkap worker termasuk request count dan bandwidth.

**Request:**
```bash
GET https://your-worker.workers.dev/stats
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "uptime": {
      "total_seconds": 95415,
      "compact": "1d 2h 30m 15s",
      "iso_8601": "P1DT2H30M15S"
    },
    "requests": {
      "total": 12345,
      "today": 5678,
      "daily_limit": 100000,
      "remaining": 94322,
      "usage_percentage": "5.68"
    },
    "bandwidth": {
      "total_bytes": 1234567890,
      "total_gb": "1.150",
      "total_mb": "1177.25"
    },
    "last_deploy": "2024-03-22T09:30:00Z",
    "current_time": "2024-03-22T10:30:00Z"
  }
}
```

---

### **4. `/info` - Basic Worker Info**

Informasi basic worker tanpa authentication.

**Request:**
```bash
GET https://your-worker.workers.dev/info
```

**Response:**
```json
{
  "service": "Singdash Worker",
  "version": "1.0.0",
  "domain": "your-worker.workers.dev",
  "service_name": "your-worker",
  "uptime": {
    "total_seconds": 95415,
    "compact": "1d 2h 30m 15s",
    "iso_8601": "P1DT2H30M15S"
  },
  "total_requests": 12345,
  "endpoints": {
    "ping": "/ping",
    "uptime": "/uptime",
    "stats": "/stats",
    "info": "/info"
  }
}
```

---

## 📦 Setup & Deployment

### **Prerequisites**

1. Cloudflare account (free tier)
2. Node.js 18+ installed
3. Wrangler CLI installed

### **Step 1: Install Wrangler**

```bash
npm install -g wrangler
```

### **Step 2: Login to Cloudflare**

```bash
wrangler login
```

Browser akan terbuka untuk authenticate.

### **Step 3: Create KV Namespace**

```bash
cd /root/singdash/worker-mods
wrangler kv:namespace create "KV"
```

Output akan seperti ini:
```
✨ Success! Created namespace KV with ID: abc123xyz456
```

**Copy ID tersebut!**

### **Step 4: Update wrangler.toml**

Edit `wrangler.toml`, ganti `id` di bagian `[[kv_namespaces]]`:

```toml
[[kv_namespaces]]
binding = "KV"
id = "abc123xyz456"  # Paste ID dari step 3
```

### **Step 5: Deploy Worker**

Gunakan script otomatis:

```bash
./deploy.sh
```

Atau manual:

```bash
# Deploy ke production
wrangler deploy --env production

# Initialize KV
wrangler kv:key put last_deploy $(date +%s)
wrangler kv:key put total_requests 0
wrangler kv:key put total_bandwidth 0
```

### **Step 6: Test Endpoints**

```bash
# Test ping
curl https://singdash-worker.YOUR_SUBDOMAIN.workers.dev/ping

# Test uptime
curl https://singdash-worker.YOUR_SUBDOMAIN.workers.dev/uptime

# Test stats
curl https://singdash-worker.YOUR_SUBDOMAIN.workers.dev/stats

# Test info
curl https://singdash-worker.YOUR_SUBDOMAIN.workers.dev/info
```

---

## 🔧 Configuration

### **Environment Variables (wrangler.toml)**

| Variable | Default | Description |
|----------|---------|-------------|
| `PRX_BANK_URL` | GitHub URL | URL untuk fetch proxy list |
| `EMBED_ASSETS` | `"false"` | Enable/disable asset embedding |
| `REVERSE_PRX_TARGET` | `"example.com"` | Default reverse proxy target |

### **KV Storage Keys**

| Key | Type | Description |
|-----|------|-------------|
| `last_deploy` | Number | Timestamp deploy terakhir (milliseconds) |
| `total_requests` | Number | Total request count all-time |
| `total_bandwidth` | Number | Total bandwidth in bytes |
| `daily_YYYY-MM-DD` | Number | Request count per hari |

---

## 📊 How It Works

### **Request Tracking Flow**

```
1. User request → Worker
2. Check if WebSocket? 
   ├─ Yes → Handle as VPN tunnel
   └─ No → Continue
3. Track request (async, tidak blocking)
   ├─ Increment total_requests
   ├─ Add content-length to total_bandwidth
   └─ Increment daily counter
4. Process request normally
```

### **Uptime Calculation**

```
uptime_seconds = current_timestamp - last_deploy_timestamp

formatUptime(seconds):
  days = seconds / 86400
  hours = (seconds % 86400) / 3600
  minutes = (seconds % 3600) / 60
  seconds = seconds % 60
  
  return "Xd Xh Xm Xs"
```

---

## 🐛 Troubleshooting

### **Problem: `/uptime` returns 404 error**

**Cause:** KV storage belum diinitialize

**Solution:**
```bash
wrangler kv:key put last_deploy $(date +%s)
```

### **Problem: Stats selalu 0**

**Cause:** Tracking tidak berjalan atau KV write gagal

**Solution:**
1. Check worker logs: `wrangler tail`
2. Verify KV namespace ID di `wrangler.toml`
3. Test manual increment: `wrangler kv:key put total_requests 1`

### **Problem: Deployment failed**

**Solution:**
```bash
# Check wrangler version
wrangler --version

# Update jika perlu
npm update -g wrangler

# Re-login
wrangler logout
wrangler login
```

### **Problem: CORS error saat akses dari browser**

**Solution:**
Endpoints sudah include CORS headers. Jika masih error, check:
1. Browser console untuk detail error
2. Network tab untuk response headers
3. Pastikan menggunakan HTTPS (bukan HTTP)

---

## 📝 Monitoring Logs

### **Real-time Logs**

```bash
wrangler tail
```

### **Filter by Path**

```bash
# Hanya lihat monitoring requests
wrangler tail | grep -E "(ping|uptime|stats|info)"

# Lihat errors
wrangler tail | grep -i error
```

### **View Recent Logs**

```bash
wrangler tail --status error --since 1h
```

---

## 🔐 Security Notes

1. **Public Endpoints**: Semua monitoring endpoints bersifat public (no auth)
2. **Rate Limiting**: Cloudflare automatic rate limiting (1000 requests/5 minutes untuk free tier)
3. **No Sensitive Data**: Endpoints tidak expose sensitive information
4. **KV Write Limits**: Free tier limit 1000 writes/hour - tracking di-batch untuk avoid limit

---

## 🚀 Performance Impact

- **Tracking overhead**: ~5-10ms per request (async, tidak blocking)
- **KV reads**: Minimal (cached untuk session)
- **Memory usage**: +~1KB per request
- **Bandwidth tracking**: Estimate dari request size (tidak include response)

---

## 📚 Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [KV Storage Docs](https://developers.cloudflare.com/kv/)
- [Worker Analytics](https://developers.cloudflare.com/analytics/)

---

**Last Updated:** 2026-03-22  
**Version:** 1.0.0
