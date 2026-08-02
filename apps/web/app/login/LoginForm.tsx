"use client";

import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/studio";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.message ||
            (data.code === "BANNED"
              ? "IP banned after failed attempts."
              : "Login failed"),
        );
        return;
      }
      router.replace(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(1200px 600px at 20% 0%, #2a1810, #12100e)",
        color: "#fafaf9",
        fontFamily: "IBM Plex Sans, Segoe UI, sans-serif",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "min(100%, 380px)",
          display: "grid",
          gap: 12,
          padding: "28px 24px",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          background: "#1a1714",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.6rem", letterSpacing: "-0.03em" }}>
          Ink<span style={{ color: "#c2410c" }}>Type</span>
        </h1>
        <p style={{ margin: "0 0 8px", color: "#a8a29e", fontSize: "0.9rem" }}>
          Private access · single user
        </p>
        <label style={{ display: "grid", gap: 6, fontSize: "0.85rem" }}>
          Email / username
          <input
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: "0.85rem" }}>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        {error ? (
          <p style={{ color: "#fca5a5", margin: 0, fontSize: "0.85rem" }}>
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          style={{
            marginTop: 6,
            border: 0,
            borderRadius: 999,
            padding: "12px 16px",
            background: "#c2410c",
            color: "#fff7ed",
            fontWeight: 700,
            cursor: "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "…" : "Sign in"}
        </button>
        <p style={{ margin: "4px 0 0", color: "#78716c", fontSize: "0.75rem" }}>
          2 failed attempts permanently ban your IP. Contact admin if locked
          out.
        </p>
      </form>
    </main>
  );
}

const inputStyle: CSSProperties = {
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#0f0d0b",
  color: "#fafaf9",
  padding: "10px 12px",
  font: "inherit",
};
