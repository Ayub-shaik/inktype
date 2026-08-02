"use client";

import { useEffect, useRef, useState } from "react";
import { DodoPayments } from "dodopayments-checkout";

type Props = {
  label?: string;
  disabled?: boolean;
  onStatus?: (msg: string) => void;
  className?: string;
};

export function UpgradeButton({
  label = "Upgrade to Pro",
  disabled,
  onStatus,
  className = "s-btn ghost",
}: Props) {
  const [busy, setBusy] = useState(false);
  const ready = useRef(false);

  useEffect(() => {
    const mode =
      (process.env.NEXT_PUBLIC_DODO_MODE as "test" | "live" | undefined) ||
      "test";
    DodoPayments.Initialize({
      mode,
      displayType: "overlay",
      onEvent: (event) => {
        if (event.event_type === "checkout.opened") setBusy(false);
        if (event.event_type === "checkout.error") {
          setBusy(false);
          const msg =
            typeof event.data?.message === "string"
              ? event.data.message
              : "Checkout error";
          onStatus?.(msg);
        }
        if (event.event_type === "checkout.closed") setBusy(false);
      },
    });
    ready.current = true;
  }, [onStatus]);

  async function openCheckout() {
    try {
      setBusy(true);
      const res = await fetch("/v1/billing/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        setBusy(false);
        onStatus?.(data.message || data.code || "Checkout unavailable");
        return;
      }
      if (!ready.current) {
        setBusy(false);
        onStatus?.("Checkout SDK not ready");
        return;
      }
      await DodoPayments.Checkout.open({ checkoutUrl: data.checkoutUrl });
    } catch (err) {
      setBusy(false);
      onStatus?.((err as Error).message || "Checkout failed");
    }
  }

  return (
    <button
      type="button"
      className={className}
      disabled={disabled || busy}
      onClick={openCheckout}
    >
      {busy ? "Opening…" : label}
    </button>
  );
}
