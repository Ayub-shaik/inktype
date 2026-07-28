# InkType — monetization

## Tiers (enforced in `@inktype/billing`)

| Plan | Exports | JPEG preview | Protection |
|------|---------|--------------|------------|
| **Guest** | **1** lifetime | **1** lifetime | Heavy watermark + **bottom half blur**; stitch blocked |
| **Free** (signed in) | **10 / month** | 40 / month · ≤2 per near-duplicate family | Same protection |
| **Pro** | **300 credits / month** | Clean | No blur; clean export |
| **Admin** | Unlimited | Unlimited | Unrestricted |

## Pro pricing (INR)
- List: **₹300** for **300 credits** (1 credit = 1 export)
- Always shown with **20% off → ₹260**
- Display string: `₹300 → ₹260 (20% off) · 300 credits / month`

## Why guest preview is capped at 1
People can screenshot half a diagram, type the rest, and stitch. Guest gets **one** protected server JPEG. Live on-screen canvas stays low-fi local (slots/boxes) and does not replace the gated JPEG.

## Signed-in anti-misuse
1. Heavy watermark + bottom-half blur on previews  
2. Near-duplicate / prefix drafts share a **preview family** (max 2 JPEGs per family on free)  
3. Distinct draft families capped per month  
4. Exact same content can replay without burning another slot  

## API
- `GET /v1/pricing` · `GET /v1/entitlements` · `POST /v1/session`
- `POST /v1/preview` → 402 when gated
- `POST /v1/render` → consumes export credit · 402 when exhausted

Auth (dev): `Authorization: Bearer guest|free:<id>|pro:<id>|admin`
