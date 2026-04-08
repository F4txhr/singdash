# Testing API - Port-Specific Testing Guide

Panduan testing proxy dengan port customization.

---

## ✅ **Features:**

1. ✅ **Ping Test** - Cek apakah port terbuka (TCP connection)
2. ✅ **HTTP Test** - Cek apakah HTTP proxy berfungsi
3. ✅ **HTTPS Test** - Cek apakah HTTPS proxy berfungsi  
4. ✅ **SOCKS5 Test** - Cek apakah SOCKS5 proxy berfungsi
5. ✅ **Custom Port** - Bisa test port apapun (80, 443, 8080, dll)

---

## 🧪 **Test Commands:**

### **1. Single Proxy Test dengan Port**

```bash
# Test dengan port spesifik
curl -X POST http://localhost:3001/api/proxies/test-single \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "103.152.112.162",
    "port": 80,
    "protocol": "quick"
  }' | jq .
```

Response:
```json
{
  "success": true,
  "data": {
    "ip": "103.152.112.162",
    "port": 80,
    "status": "alive",
    "response_time": 234,
    "protocols_supported": ["http"],
    "details": {
      "ping_success": true,
      "http_success": true,
      "tcp_response_time": 230,
      "http_response_time": 234
    }
  }
}
```

---

### **2. Ping Only Test (Cek Port Open/Closed)**

```bash
# Test hanya ping (TCP connection)
curl -X POST http://localhost:3001/api/proxies/test-single \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "103.152.112.162",
    "port": 80,
    "protocol": "ping"
  }' | jq .
```

Response:
```json
{
  "success": true,
  "data": {
    "ip": "103.152.112.162",
    "port": 80,
    "status": "alive",
    "response_time": 230,
    "protocols_supported": ["tcp_open"],
    "details": {
      "ping_success": true,
      "http_success": false
    }
  }
}
```

---

### **3. Comprehensive Test (All Protocols)**

```bash
# Test semua protokol (HTTP + HTTPS + SOCKS5 + Ping)
curl -X POST http://localhost:3001/api/proxies/test-single \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "103.152.112.162",
    "port": 8080,
    "protocol": "all"
  }' | jq .
```

Response:
```json
{
  "success": true,
  "data": {
    "ip": "103.152.112.162",
    "port": 8080,
    "status": "alive",
    "response_time": 345,
    "protocols_supported": ["http", "https", "socks5"],
    "details": {
      "http": true,
      "https": true,
      "socks5": true,
      "ping_success": true
    }
  }
}
```

---

### **4. Test Berbagai Port Populer**

```bash
# Port 80 (HTTP)
curl -X POST http://localhost:3001/api/proxies/test-single \
  -H "Content-Type: application/json" \
  -d '{"ip": "103.152.112.162", "port": 80}' | jq '.data.status, .data.response_time'

# Port 443 (HTTPS)
curl -X POST http://localhost:3001/api/proxies/test-single \
  -H "Content-Type: application/json" \
  -d '{"ip": "103.152.112.162", "port": 443}' | jq '.data.status, .data.response_time'

# Port 8080 (HTTP Alt)
curl -X POST http://localhost:3001/api/proxies/test-single \
  -H "Content-Type: application/json" \
  -d '{"ip": "103.152.112.162", "port": 8080}' | jq '.data.status, .data.response_time'

# Port 1080 (SOCKS)
curl -X POST http://localhost:3001/api/proxies/test-single \
  -H "Content-Type: application/json" \
  -d '{"ip": "103.152.112.162", "port": 1080}' | jq '.data.status, .data.response_time'
```

---

### **5. Bulk Test dengan Port Filtering**

```bash
# Test proxies dari GitHub, filter by country
curl -X POST http://localhost:3001/api/proxies/test \
  -H "Content-Type: application/json" \
  -d '{
    "source_url": "https://raw.githubusercontent.com/backup-heavenly-demons/gateway/main/kvProxyList.json",
    "countries": ["ID", "SG"],
    "concurrent": 20,
    "save_to_db": false
  }' | jq '.data.by_country'
```

Response:
```json
{
  "ID": {
    "total": 50,
    "alive": 23,
    "slow": 5,
    "dead": 22
  },
  "SG": {
    "total": 30,
    "alive": 15,
    "slow": 3,
    "dead": 12
  }
}
```

---

## 📊 **Understanding Response:**

### **Status Values:**

| Status | Meaning | Response Time |
|--------|---------|---------------|
| `alive` | Proxy working | < 1000ms |
| `slow` | Port open but HTTP slow/fail | > 1000ms |
| `dead` | No response/timeout | null |

---

### **Protocols Supported:**

| Value | Description |
|-------|-------------|
| `http` | HTTP proxy working |
| `https` | HTTPS proxy working |
| `socks5` | SOCKS5 proxy working |
| `tcp_open` | Port open but no HTTP (ping only) |

---

### **Details Object:**

```json
{
  "ping_success": true,        // TCP connection successful
  "http_success": true,        // HTTP request through proxy successful
  "tcp_response_time": 230,    // Ping time in ms
  "http_response_time": 234    // HTTP request time in ms
}
```

---

## 🎯 **Common Use Cases:**

### **Case 1: Verify Proxy Before Using**

```bash
# Quick check if proxy is usable
RESPONSE=$(curl -s -X POST http://localhost:3001/api/proxies/test-single \
  -H "Content-Type: application/json" \
  -d '{"ip": "103.152.112.162", "port": 80}')

STATUS=$(echo $RESPONSE | jq -r '.data.status')

if [ "$STATUS" = "alive" ]; then
  echo "✅ Proxy is good to use!"
elif [ "$STATUS" = "slow" ]; then
  echo "⚠️  Proxy works but slow"
else
  echo "❌ Proxy is dead"
fi
```

---

### **Case 2: Find Best Proxy by Response Time**

```bash
# Test multiple proxies, pick fastest
for proxy in "103.152.112.162:80" "180.250.95.24:8080" "114.7.92.108:443"; do
  IP=$(echo $proxy | cut -d: -f1)
  PORT=$(echo $proxy | cut -d: -f2)
  
  RESULT=$(curl -s -X POST http://localhost:3001/api/proxies/test-single \
    -H "Content-Type: application/json" \
    -d "{\"ip\": \"$IP\", \"port\": $PORT}")
  
  STATUS=$(echo $RESULT | jq -r '.data.status')
  TIME=$(echo $RESULT | jq -r '.data.response_time')
  
  echo "$proxy - Status: $STATUS, Time: ${TIME}ms"
done
```

---

### **Case 3: Check Specific Port on Multiple IPs**

```bash
# Check if port 8080 is open on multiple IPs
for ip in "103.152.112.162" "180.250.95.24" "114.7.92.108"; do
  RESULT=$(curl -s -X POST http://localhost:3001/api/proxies/test-single \
    -H "Content-Type: application/json" \
    -d "{\"ip\": \"$ip\", \"port\": 8080, \"protocol\": \"ping\"}")
  
  STATUS=$(echo $RESULT | jq -r '.data.status')
  TIME=$(echo $RESULT | jq -r '.data.response_time')
  
  if [ "$STATUS" != "dead" ]; then
    echo "$ip:8080 - OPEN (${TIME}ms)"
  else
    echo "$ip:8080 - CLOSED"
  fi
done
```

---

## 🔧 **Advanced Configuration:**

### **Custom Timeout**

Edit `.env`:
```bash
TEST_TIMEOUT=3000  # Default 3 seconds
```

Or pass in request:
```bash
curl -X POST http://localhost:3001/api/proxies/test-single \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "103.152.112.162",
    "port": 80,
    "timeout": 5000
  }'
```

---

### **Concurrent Testing**

```bash
# Test 50 proxies at once
curl -X POST http://localhost:3001/api/proxies/test \
  -H "Content-Type: application/json" \
  -d '{
    "countries": ["ID"],
    "concurrent": 50
  }'
```

---

## 📝 **Summary:**

| Feature | Available? | How To |
|---------|------------|--------|
| **Ping Test** | ✅ Yes | `protocol: "ping"` |
| **Custom Port** | ✅ Yes | Specify `port` parameter |
| **HTTP Test** | ✅ Yes | Default in `testQuick` |
| **HTTPS Test** | ✅ Yes | `protocol: "all"` |
| **SOCKS5 Test** | ✅ Yes | `protocol: "all"` |
| **Bulk Test** | ✅ Yes | `/api/proxies/test` endpoint |

---

**Happy Testing!** 🚀
