# SingDash (Offline Dashboard + Live Sing-box API)

Dashboard statis bergaya YACD untuk Sing-box/Clash API.

## Apakah bisa offline?
Bisa. UI ini 100% file statis (`index.html`, `styles.css`, `app.js`) tanpa dependency CDN.

- **Offline UI**: tampilan tetap bisa dibuka tanpa internet.
- **Live data**: butuh akses ke endpoint controller Sing-box (`external_controller`).

## Menjalankan lokal

### Opsi 1: langsung dari file
Buka `index.html` di browser.

### Opsi 2: local server
```bash
python3 -m http.server 8000
```
Lalu buka `http://127.0.0.1:8000`.

## Integrasi ke sing-box (non-root)
1. Letakkan file dashboard ini di folder, misalnya `./dashboard/singdash`.
2. Arahkan konfigurasi sing-box/app manager ke folder itu sebagai external UI.
3. Pastikan controller API aktif (contoh: `http://127.0.0.1:9090`) dan isi URL tersebut di panel **Sing-box Controller** pada dashboard.
4. Jika pakai secret, isi field Secret di dashboard.

> Nama field config bisa berbeda antar wrapper/app. Intinya: UI statis diarahkan ke folder ini, dan dashboard mengakses Clash-compatible API dari controller.

## Endpoint yang dipakai dashboard
- `GET /traffic`
- `GET /connections`
- `GET /proxies`
- `PUT /proxies/{group}`
- `GET /rules`
- `WS /logs?level=info`

Jika endpoint logs tidak tersedia, dashboard tetap jalan dengan polling metrik lain.
