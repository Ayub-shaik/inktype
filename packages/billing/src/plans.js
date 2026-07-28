/**
 * Plans, pricing, quotas — InkType INR product rules.
 *
 * guest  → 1 preview + 1 export (lifetime / session)
 * free   → 10 exports / month; previews with anti-misuse caps
 * pro    → 300 credits (= 300 exports) / month; list ₹300, 20% off → ₹260
 * admin  → unlimited
 */

export const PLANS = {
  guest: {
    id: "guest",
    label: "Guest",
    exportsPerMonth: 1,
    /** Lifetime for guest (not monthly reset) */
    lifetimeExports: 1,
    lifetimePreviews: 1,
    previewsPerMonth: 1,
    previewFamiliesMax: 1,
    previewsPerFamily: 1,
    cleanPreview: false,
    cleanExport: false,
    heavyWatermark: true,
    blurBottom: true,
  },
  free: {
    id: "free",
    label: "Free",
    exportsPerMonth: 10,
    previewsPerMonth: 40,
    previewFamiliesMax: 15,
    previewsPerFamily: 2,
    cleanPreview: false,
    cleanExport: false,
    heavyWatermark: true,
    blurBottom: true,
  },
  pro: {
    id: "pro",
    label: "Pro",
    exportsPerMonth: 300,
    creditsPerMonth: 300,
    previewsPerMonth: 3000,
    previewFamiliesMax: 1000,
    previewsPerFamily: 50,
    cleanPreview: true,
    cleanExport: true,
    heavyWatermark: false,
    blurBottom: false,
    pricing: {
      currency: "INR",
      listCredits: 300,
      listPriceInr: 300,
      discountPct: 20,
      /** Always show 20% off */
      payPriceInr: 260,
      display: "₹300 → ₹260 (20% off) · 300 credits / month",
    },
  },
  admin: {
    id: "admin",
    label: "Admin",
    exportsPerMonth: Infinity,
    previewsPerMonth: Infinity,
    previewFamiliesMax: Infinity,
    previewsPerFamily: Infinity,
    cleanPreview: true,
    cleanExport: true,
    heavyWatermark: false,
    blurBottom: false,
  },
};

export function planOf(role) {
  const id = String(role || "guest").toLowerCase();
  return PLANS[id] || PLANS.guest;
}

export function proPricing() {
  return PLANS.pro.pricing;
}

/** Calendar month key in Asia/Kolkata */
export function monthKey(date = new Date(), timeZone = "Asia/Kolkata") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}`;
}
