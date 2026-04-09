# Vercel Deployment (Full-stack Dashboard)

Singdash dashboard ini berjalan sebagai **full-stack app di Vercel**:
- Frontend: `index.html`
- Backend bridge (serverless): `api/db.js` untuk akses Supabase secara server-side

## Deploy

```bash
cd deploy/vercel-dashboard
vercel --prod
```

## Environment Variables (Wajib di Vercel Project)

- `SUPABASE_URL` = `https://xxxxx.supabase.co`
- `SUPABASE_ANON_KEY` = `eyJ...`

## Environment Variables (Opsional / UI Settings)

- Testing API URL akan diisi dari dashboard settings.
- Arahkan ke API di VPS Alibaba, contoh:
  - `https://your-alibaba-vps-domain:3001`

## Arsitektur

1. Browser memanggil endpoint internal Vercel `/api/db`.
2. Endpoint `/api/db` yang memanggil Supabase REST (credentials disimpan di Vercel env, tidak terekspos ke browser).
3. Untuk test proxy / generate config, browser memanggil Testing API URL (VPS Alibaba) yang diinput di settings dashboard.
