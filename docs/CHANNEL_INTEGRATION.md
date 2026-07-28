# Channel + portfolio integration

InkType’s API is the **shared render plane** for:

| Surface | Caller today | InkType endpoint |
|---------|--------------|------------------|
| Public product | `apps/web` Export button | `POST /v1/render` (watermarked) |
| LinkedIn / Pager Notes | `insights-ops` | `POST /v1/package` `surface=linkedin` |
| WhatsApp channel | `content-ops` | `POST /v1/package` `surface=whatsapp` |
| Portfolio Insights | `insights-ops` sync | `POST /v1/package` `surface=portfolio` |

Posting (Telegram approve, WA Web Playwright, LinkedIn paste, portfolio `published.json`) **stays in automation**. InkType only owns **template HTML → JPEG**.

## Run API

```bash
cd /home/shaik/Desktop/projects/inktype
npm install
npm run smoke:api          # library smoke → apps/api/tmp/smoke-notebook.jpg
npm run start:api          # :3041
```

Env:

| Var | Meaning |
|-----|---------|
| `INKTYPE_API_PORT` | default `3041` |
| `INKTYPE_INTERNAL_TOKEN` | if set, required on `/v1/package` |
| `INKTYPE_USE_SYSTEM_CHROME` | `0` = Playwright bundled Chromium |
| `NEXT_PUBLIC_INKTYPE_API_URL` | web app → API (default `http://127.0.0.1:3041`) |

## Point insights-ops at InkType

```bash
export INKTYPE_API_URL=http://127.0.0.1:3041
# optional: export INKTYPE_INTERNAL_TOKEN=...
cd /home/shaik/Desktop/projects/automation/insights-ops
# generate / daemon will call renderInsightCard → InkType when URL is set
```

Client helper: `automation/shared/inktypeClient.js`

## Example: LinkedIn package

```bash
curl -s http://127.0.0.1:3041/v1/package \
  -H 'Content-Type: application/json' \
  -d '{
    "surface": "linkedin",
    "template": "notebook",
    "caption": "Saw this fail in prod twice. Mental model below.",
    "content": {
      "title": "Canary without drama",
      "subtitle": "Ship while users stay online",
      "bullets": ["Split traffic", "Watch error rate", "Auto-rollback on SLO burn"],
      "nodes": ["canary", "observe", "promote"],
      "simpleWords": "Never promote on green alone — watch burn."
    }
  }' | jq '{ok, warnings, template, width, height, note}'
```

## Canvas (matches `excalidraw-preferences.yaml`)

- Story (default): **1080×1350** JPEG q=92  
- Square: 1080×1080  
- Wide (flow): 1920×1080  

Brand for channel surfaces: **pager notes** / footer **fold**. Public InkType watermarks exports.

## LinkedIn CTA (when public URL is live)

Set `INKTYPE_PUBLIC_URL` (e.g. `https://inktype.tomorrowtools.dev`).  
Insights-ops `approveForLinkedIn` + Telegram packages append a soft product line + UTM link.  
Copy bank: `docs/GROWTH_LINKEDIN.md` · `automation/shared/inktypeGrowth.js`.

Pattern:

```
{mentor caption}

—
Create diagrams like this quickly — type below, ink above:
https://…/?t=notebook&utm_source=linkedin&utm_campaign=pager_notes
```

## Migration path

1. Run InkType API beside daemons  
2. Set `INKTYPE_API_URL` on insights-ops (done: optional branch in `renderInsightCard`)  
3. Same for content-ops `renderTipCard` when ready  
4. Delete duplicated HTML builders once confidence is high  

Forbidden phrase scan runs on `/v1/package` (same list as prefs YAML).
