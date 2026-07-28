# LinkedIn → InkType growth loop

When InkType is live, **Pager Notes / LinkedIn diagrams become the funnel**.

Teaching stays on the image. The caption stays mentor voice. Soft CTA at the end points to the product.

## Canonical URL
Set when deployed:

```bash
export INKTYPE_PUBLIC_URL=https://inktype.tomorrowtools.dev   # or inktype.app
```

UTM (always):

```
{INKTYPE_PUBLIC_URL}/?utm_source=linkedin&utm_medium=social&utm_campaign=pager_notes&utm_content={template}
```

## Caption pattern (do not dump the slide)

```
{mentor_voice 2–5 lines}

—
Create diagrams like this — type once, ink live:
{url}
```

## Niche CTA variants (rotate)

1. `Create diagrams like this quickly — type below, ink above: {url}`
2. `Sketch this professionally without opening Excalidraw: {url}`
3. `Turn a JD / runbook bullet list into a hand-inked slide: {url}`
4. `Mobile-first: type the flow, get the architecture card: {url}`
5. `Pager Notes craft, your words — try InkType (1 free guest image): {url}`

## Rules
- CTA is **optional append** after mentor caption — never replaces it
- Image must not say “buy Pro”; watermark on free exports is enough brand
- Guest landing should open template matching the post (`?t=flow|arch|notebook`)
- Track: `utm_campaign=pager_notes` vs `utm_campaign=whatsapp_channel`

## Code
- Copy bank: `@inktype/billing` → `growth.js` `linkedinCta()`
- Insights-ops: append via `appendInktypeCta(caption, { template })` when `INKTYPE_PUBLIC_URL` is set
