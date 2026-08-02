import { Webhook } from "standardwebhooks";

/**
 * Dodo Payments (overlay checkout + webhooks).
 *
 * Env:
 *   DODO_PAYMENTS_API_KEY
 *   DODO_PAYMENTS_WEBHOOK_KEY   (whsec_…)
 *   DODO_PAYMENTS_ENVIRONMENT  test_mode | live_mode
 *   DODO_PRODUCT_ID_PRO
 */

export function dodoConfig() {
  const apiKey =
    process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_API_KEY || "";
  const webhookKey =
    process.env.DODO_PAYMENTS_WEBHOOK_KEY ||
    process.env.DODO_PAYMENTS_WEBHOOK_SECRET ||
    process.env.DODO_WEBHOOK_KEY ||
    "";
  const rawEnv = String(
    process.env.DODO_PAYMENTS_ENVIRONMENT ||
      process.env.DODO_ENVIRONMENT ||
      "test_mode",
  )
    .trim()
    .toLowerCase();
  const live =
    rawEnv === "live_mode" || rawEnv === "live" || rawEnv === "production";
  const environment = live ? "live_mode" : "test_mode";
  const productIdPro =
    process.env.DODO_PRODUCT_ID_PRO || process.env.DODO_PRO_PRODUCT_ID || "";
  const apiBase = live
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
  const checkoutMode = live ? "live" : "test";
  return {
    apiKey,
    webhookKey,
    environment,
    productIdPro: String(productIdPro).trim(),
    apiBase,
    checkoutMode,
  };
}

export function verifyDodoWebhook(rawBody, headers, webhookKey) {
  if (!webhookKey) {
    const err = new Error("webhook_secret_missing");
    err.code = "WEBHOOK_SECRET_MISSING";
    throw err;
  }
  const id = String(headers["webhook-id"] || headers["Webhook-Id"] || "");
  const timestamp = String(
    headers["webhook-timestamp"] || headers["Webhook-Timestamp"] || "",
  );
  const signature = String(
    headers["webhook-signature"] || headers["Webhook-Signature"] || "",
  );
  if (!id || !timestamp || !signature) {
    const err = new Error("webhook_headers_missing");
    err.code = "WEBHOOK_HEADERS_MISSING";
    throw err;
  }
  const wh = new Webhook(webhookKey);
  wh.verify(String(rawBody), {
    "webhook-id": id,
    "webhook-timestamp": timestamp,
    "webhook-signature": signature,
  });
  return true;
}

export function parseDodoEvent(rawBody) {
  const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
  return {
    type: payload?.type || payload?.event || "unknown",
    businessId: payload?.business_id || null,
    timestamp: payload?.timestamp || null,
    data: payload?.data || {},
    raw: payload,
  };
}

/**
 * Create a checkout session for overlay checkout.
 * @returns {Promise<{ sessionId: string, checkoutUrl: string, mode: string }>}
 */
export async function createProCheckoutSession({
  userId,
  email,
  name,
  returnUrl,
  productId,
} = {}) {
  const cfg = dodoConfig();
  if (!cfg.apiKey) {
    const err = new Error("Dodo API key not configured");
    err.code = "DODO_API_KEY_MISSING";
    throw err;
  }
  const pid = productId || cfg.productIdPro;
  if (!pid) {
    const err = new Error(
      "DODO_PRODUCT_ID_PRO is empty — create the Pro product in Dodo and set its product_id",
    );
    err.code = "DODO_PRODUCT_MISSING";
    throw err;
  }

  const body = {
    product_cart: [{ product_id: pid, quantity: 1 }],
    return_url:
      returnUrl ||
      `${process.env.INKTYPE_PUBLIC_URL || "https://inktype.tomorrowtools.dev"}/billing/success`,
    metadata: {
      inktype_user_id: String(userId || "anon"),
      inktype_plan: "pro",
    },
  };
  if (email) {
    body.customer = {
      email: String(email),
      ...(name ? { name: String(name) } : {}),
    };
  }

  const res = await fetch(`${cfg.apiBase}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      data?.message || data?.error || `Dodo checkout failed (${res.status})`,
    );
    err.code = data?.code || "DODO_CHECKOUT_FAILED";
    err.status = res.status;
    err.details = data;
    throw err;
  }
  const checkoutUrl = data.checkout_url;
  if (!checkoutUrl) {
    const err = new Error("Dodo did not return checkout_url");
    err.code = "DODO_NO_CHECKOUT_URL";
    throw err;
  }
  return {
    sessionId: data.session_id,
    checkoutUrl,
    mode: cfg.checkoutMode,
    productId: pid,
  };
}
