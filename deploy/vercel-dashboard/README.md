# Vercel Deployment (Full-stack Dashboard)

Singdash dashboard ini berjalan sebagai **full-stack app di Vercel**:
- Frontend: `index.html`
- Backend bridge (serverless): `api/db.js` untuk akses Supabase secara server-side

## Deploy

```bash
cd deploy/vercel-dashboard
vercel --prod
```

## Local Development (Penting)

Jalankan dashboard ini dengan:

```bash
cd deploy/vercel-dashboard
vercel dev
```

> Jangan pakai `python -m http.server` untuk mode full-stack ini, karena endpoint `/api/db` tidak akan aktif dan browser bisa error `Unexpected token '<'`.

## Environment Variables (Wajib di Vercel Project)

- `SUPABASE_URL` = `https://xxxxx.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = `eyJ...` (**recommended** for server-side bridge, bypass RLS)
- `SUPABASE_ANON_KEY` = `eyJ...` (fallback kalau kamu tetap pakai RLS policy write)

> Jika kamu hanya set `SUPABASE_ANON_KEY`, pastikan RLS policy `INSERT/UPDATE/DELETE` untuk tabel yang dipakai dashboard sudah dibuka.

## Environment Variables (Opsional / UI Settings)

- Testing API URL akan diisi dari dashboard settings.
- Arahkan ke API di VPS Alibaba, contoh:
  - `https://your-alibaba-vps-domain:3001`

## Arsitektur

1. Browser memanggil endpoint internal Vercel `/api/db`.
2. Endpoint `/api/db` yang memanggil Supabase REST (credentials disimpan di Vercel env, tidak terekspos ke browser).
3. Untuk test proxy / generate config, browser memanggil Testing API URL (VPS Alibaba) yang diinput di settings dashboard.
