"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingShell";
import { UpgradeButton } from "@/components/studio/UpgradeButton";

export default function SettingsPage() {
  const [ent, setEnt] = useState<Record<string, unknown> | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setUsername(d.username || null);
      });
    fetch("/v1/entitlements", { credentials: "same-origin" })
      .then((r) => r.json())
      .then(setEnt)
      .catch(() => setEnt(null));
  }, []);

  async function logout() {
    await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = "/";
  }

  const unlimited = Boolean(ent?.unlimited);
  const plan = ent?.plan ? String(ent.plan) : "—";

  return (
    <div className="m-page">
      <MarketingNav ctaHref="/studio" ctaLabel="Studio" />
      <main className="m-doc settings-doc">
        <h1>Settings</h1>
        {username ? (
          <p>
            Signed in as <strong>{username}</strong>
          </p>
        ) : null}

        <section className="settings-block">
          <h2>Plan &amp; usage</h2>
          <dl className="settings-dl">
            <div>
              <dt>Plan</dt>
              <dd>{unlimited ? "Pro (unlimited)" : plan}</dd>
            </div>
            {!unlimited && ent ? (
              <>
                <div>
                  <dt>Exports</dt>
                  <dd>
                    {String(ent.exportsUsed)}/{String(ent.exportsLimit ?? "∞")}
                  </dd>
                </div>
                <div>
                  <dt>Previews</dt>
                  <dd>
                    {String(ent.previewsUsed)}/{String(ent.previewsLimit ?? "∞")}
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
          {!unlimited ? (
            <UpgradeButton onStatus={setStatus} className="m-btn primary" />
          ) : null}
          {status ? <p className="settings-status">{status}</p> : null}
        </section>

        <section className="settings-block">
          <h2>Studio</h2>
          <Link href="/studio" className="m-btn secondary">
            Open studio
          </Link>
        </section>

        <section className="settings-block">
          <h2>Session</h2>
          <button type="button" className="m-btn ghost" onClick={logout}>
            Sign out
          </button>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
