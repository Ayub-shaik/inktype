# Deploy: inktype.tomorrowtools.dev

## Architecture
```
Internet → Cloudflare (TLS) → cloudflared tunnel
  → 127.0.0.1:3040 Next.js (auth middleware + security headers)
       ↳ rewrite /auth /v1 /health → 127.0.0.1:3041 API
```

Origins bind **loopback only**. Auth = same single-user gate as JDI `/ops`
(2 failed logins → permanent IP ban via `CF-Connecting-IP`).

## Go live
```bash
cd /home/shaik/Desktop/projects/inktype
npm install
npm run build

# DNS (once)
cloudflared tunnel --config ~/.cloudflared/tomorrowtools-config.yml \
  route dns tomorrowtools inktype.tomorrowtools.dev

systemctl --user daemon-reload
systemctl --user enable --now inktype-api.service inktype-web.service
systemctl --user restart cloudflared-tomorrowtools.service
```

## Env
- `llmapp/.env` supplies `JDI_AUTH_USER` / `JDI_AUTH_PASSWORD` / `JDI_SESSION_SECRET`
- `inktype/.env` sets `INKTYPE_PUBLIC_URL=https://inktype.tomorrowtools.dev`

## Security checklist
- [x] Loopback bind
- [x] Session cookie HttpOnly + Secure + SameSite=Lax
- [x] IP ban after 2 failures
- [x] Security headers + CSP + noindex
- [x] `x-powered-by` disabled
- [x] Body size limit 1mb
- [x] Internal `/v1/package` token for channel daemons
