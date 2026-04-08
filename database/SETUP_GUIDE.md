# 🗄️ Setup Supabase Database

## 📋 Langkah-langkah

### **Step 1: Buat Project Supabase**

1. Buka: [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Login dengan GitHub
4. Click "New Project"
5. Isi form:
   - **Name**: `singdash`
   - **Database Password**: (save password ini!)
   - **Region**: Singapore (closest to Indonesia)
6. Click "Create new project"
7. Tunggu ~2 menit (database provisioning)

---

### **Step 2: Get Connection Details**

Setelah project jadi:

1. Dashboard Supabase → Settings → Database
2. Copy informasi berikut:
   ```
   Host: db.xxxxx.supabase.co
   Port: 5432
   Database: postgres
   User: postgres
   Password: YOUR_PASSWORD
   ```

3. Juga copy **Project URL** dan **anon key**:
   - Settings → API
   - Project URL: `https://xxxxx.supabase.co`
   - anon/public key: `eyJhbG...`

---

### **Step 3: Run SQL Schema**

1. Dashboard Supabase → SQL Editor (sidebar kiri)
2. Click "New Query"
3. Copy isi file `/root/singdash/database/schema.sql`
4. Paste ke SQL Editor
5. Click "Run" (atau Ctrl+Enter)
6. **DONE!** ✅

Verify dengan query:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

Harusnya muncul:
- `proxy_cache`
- `workers`
- `worker_uptime_history`
- `test_history`

---

### **Step 4: Setup Environment Variables**

#### **Di VPS** (untuk API & cron jobs):

Edit/create file: `/root/singdash/deploy/vps-api/.env`

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Connection (optional, for direct connection)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

#### **Di Dashboard** (untuk frontend):

Edit file: `/root/singdash/deploy/vercel-dashboard/index.html`

Tambahkan di bagian atas `<script>`:
```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_KEY = 'eyJhbG...';
```

---

## 🔧 Install Supabase Client

### **Untuk API (VPS)**:

```bash
cd /root/singdash/deploy/vps-api
npm install @supabase/supabase-js
```

### **Untuk Cron Jobs**:

```bash
cd /root/singdash/deploy/cron-jobs
npm init -y
npm install @supabase/supabase-js axios dotenv
```

---

## ✅ Testing Connection

Buat file test sederhana:

```bash
nano /root/singdash/database/test-connection.js
```

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xxxxx.supabase.co',
  'YOUR_ANON_KEY'
);

async function test() {
  console.log('Testing Supabase connection...');
  
  // Test read
  const { data, error } = await supabase
    .from('proxy_cache')
    .select('count')
    .limit(1);
  
  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Connected successfully!');
    console.log('Tables accessible: proxy_cache, workers, etc.');
  }
}

test();
```

Run test:
```bash
node /root/singdash/database/test-connection.js
```

---

## 📊 Database Management

### **Backup Database**:

```bash
# Via Supabase Dashboard
Settings → Database → Backups → Create backup

# Via CLI (pg_dump)
pg_dump -h db.xxxxx.supabase.co -U postgres postgres > backup.sql
```

### **Restore Database**:

```bash
psql -h db.xxxxx.supabase.co -U postgres postgres < backup.sql
```

### **Monitor Usage**:

Dashboard Supabase → Settings → Usage
- Free tier: 500MB database
- Enough untuk ~1M proxy records!

---

## 🎯 Next Steps

Setelah database ready:

1. ✅ Update API code untuk use Supabase
2. ✅ Setup cron jobs untuk auto-save
3. ✅ Update dashboard untuk load dari cache
4. ✅ Test end-to-end flow

---

## 🐛 Troubleshooting

### Error: "Invalid API key"
- **Fix**: Check anon key di Settings → API
- Make sure pakai **anon/public** key, bukan service_role

### Error: "Connection timeout"
- **Fix**: Check firewall tidak block port 5432
- Verify Supabase project status is "Active"

### RLS policy error
- **Fix**: Verify policies sudah dibuat di schema.sql
- Atau temporary disable RLS untuk testing

---

**Database Ready! 🎉**
