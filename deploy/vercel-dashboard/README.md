# Vercel Deployment

Singdash VPN Dashboard - Static HTML

## Deploy

```bash
vercel --prod
```

## Environment Variables

Set di Vercel dashboard:
- `NEXT_PUBLIC_API_URL` = `http://YOUR-VPS-IP:3001`

Atau edit langsung di `index.html` line ~400:
```javascript
const API_URL = 'http://YOUR-VPS-IP:3001';
```
