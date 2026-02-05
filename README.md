# SingDash (Offline Dashboard)

Dashboard statis bergaya YACD untuk Sing-box/Clash API.

## Apakah bisa offline?
Bisa. UI ini 100% file statis (`index.html`, `styles.css`, `app.js`) tanpa dependency CDN.

Selama file tersedia di local filesystem atau diserve dari local web server, dashboard tetap bisa dibuka tanpa internet.

## Menjalankan lokal (offline)

### Opsi 1: langsung dari file
Buka `index.html` di browser.

### Opsi 2: local server
```bash
python3 -m http.server 8000
```
Lalu buka `http://127.0.0.1:8000`.

## Integrasi ke sing-box (non-root)
Untuk mode non-root, umumnya dashboard diarahkan lewat `external_ui` + `external_ui_download_url` (atau pre-bundled folder, tergantung build/app).

Jika environment kamu mengizinkan path lokal:
1. Letakkan file dashboard ini di folder, misalnya `./dashboard/singdash`.
2. Arahkan konfigurasi sing-box agar `external_ui` mengarah ke folder tersebut.
3. Akses panel dari alamat API sing-box (`external_controller`) sesuai konfigurasi app/manager yang kamu pakai.

> Catatan: nama field bisa sedikit berbeda antar wrapper/app (misalnya Android client, manager panel, atau build khusus). Intinya: arahkan **external UI** ke folder statis lokal ini.

## Catatan teknis
Saat ini metrik masih simulasi di `app.js` untuk demo UI. Agar benar-benar menampilkan data sing-box, hubungkan endpoint API Clash-compatible (contoh: `/proxies`, `/rules`, `/connections`, `/logs`) dari `external_controller`.
