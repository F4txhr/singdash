# Singdash VPN Dashboard

Dashboard untuk mengelola Cloudflare Workers sebagai VPN endpoints.

## Quick Start

### 1. Setup Supabase (sekali saja)

1. Buka https://supabase.com
2. Create project baru
3. Buka SQL Editor
4. Copy paste isi `database/schema.sql` → Run
5. Ambil credentials dari Settings → API:
   - URL: `https://xxxxx.supabase.co`
   - Anon Key: `eyJhbG...`

### 2. Jalankan Dashboard

```bash
# Cara 1: Pake script
chmod +x start.sh
./start.sh

# Cara 2: Manual
cd /root/singdash
python3 -m http.server 8080
```

Buka: http://localhost:8080

### 3. Setup di Dashboard

1. Klik **Settings** (⚙️)
2. Masukin:
   - **Supabase URL**: dari step 1
   - **Supabase Key**: dari step 1
   - **API URL**: `http://localhost:3001` (atau IP VPS)
3. Save

### 4. Mulai Pakai

1. **Fetch from GitHub** - Ambil proxy dari proxy bank
2. **Test All** - Cek semua proxy via API
3. **Generate Config** - Download VPN config

## Structure

```
singdash/
├── dashboard.html              # Dashboard utama
├── start.sh                    # Start localhost
├── database/
│   └── schema.sql              # Supabase schema
├── deploy/
│   ├── vercel-dashboard/       # Buat deploy ke Vercel
│   ├── vps-api/                # API buat VPS
│   ├── cloudflare-worker/      # Worker files
│   └── cron-jobs/              # Auto-test scripts
└── scripts/                    # Helper scripts
```

## Fitur

✅ Fetch proxy dari GitHub (proxy bank)
✅ Save ke Supabase
✅ Test connectivity via API
✅ Generate VPN config (SingBox/Clash)
✅ Monitor workers
✅ Test history
✅ Auto-refresh status

## API Setup (Optional)

Dashboard bisa jalan tanpa API, tapi butuh API buat:
- Test proxy connectivity
- Generate VPN config

Setup API di VPS:
```bash
bash scripts/setup-vps.sh
```

## Deploy ke Vercel

```bash
bash scripts/deploy-vercel.sh
```

Atau upload manual `deploy/vercel-dashboard/` ke Vercel.
