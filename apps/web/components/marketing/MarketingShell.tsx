"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/support", label: "Support" },
];

export function MarketingNav({ ctaHref = "/login", ctaLabel = "Open studio" }) {
  const path = usePathname();
  return (
    <header className="m-nav">
      <Link href="/" className="m-brand">
        Ink<span>Type</span>
      </Link>
      <nav className="m-links" aria-label="Site">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={path === l.href ? "active" : undefined}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <Link href={ctaHref} className="m-cta">
        {ctaLabel}
      </Link>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="m-footer">
      <div>
        <strong>InkType</strong>
        <p>Text to handwritten visuals — by Aysentra Labs</p>
      </div>
      <div className="m-footer-links">
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/support">Support</Link>
        <Link href="/settings">Settings</Link>
        <a href="https://aysentra.com">Aysentra</a>
      </div>
      <p className="m-copy">© {new Date().getFullYear()} Aysentra Labs</p>
    </footer>
  );
}
