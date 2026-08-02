"use client";

import { UpgradeButton } from "@/components/studio/UpgradeButton";

type Props = {
  open: boolean;
  reason?: string;
  onClose: () => void;
  onStatus?: (msg: string) => void;
};

export function PaywallModal({ open, reason, onClose, onStatus }: Props) {
  if (!open) return null;
  return (
    <div
      className="paywall-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="paywall-card">
        <button
          type="button"
          className="paywall-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <p className="paywall-kicker">InkType Pro</p>
        <h2 id="paywall-title">Unlock clean exports</h2>
        <p className="paywall-body">
          {reason ||
            "You've used this plan's export allowance. Upgrade for clean JPEG/PNG downloads and higher monthly volume."}
        </p>
        <ul className="paywall-perks">
          <li>Clean JPEG &amp; PNG downloads</li>
          <li>300 credits every month</li>
          <li>No watermark or blur on exports</li>
          <li>Keep trying layouts, paper styles, and share targets</li>
        </ul>
        <div className="paywall-actions">
          <UpgradeButton
            label="Upgrade to Pro"
            className="s-btn primary"
            onStatus={onStatus}
          />
          <button type="button" className="s-btn ghost" onClick={onClose}>
            Keep editing
          </button>
        </div>
      </div>
    </div>
  );
}
