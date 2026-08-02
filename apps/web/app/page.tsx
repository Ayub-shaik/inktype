import Link from "next/link";
import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingShell";

export default function LandingPage() {
  return (
    <div className="m-page">
      <MarketingNav />

      <main>
        <section className="m-hero">
          <div className="m-hero-bg" aria-hidden />
          <div className="m-hero-inner">
            <p className="m-kicker">Aysentra Labs · SaaS · Beta</p>
            <h1>
              Ink<span>Type</span>
            </h1>
            <p className="m-lead">
              Turn plain text into handwritten-style notes, flow diagrams, and
              shareable images — live as you type.
            </p>
            <div className="m-hero-actions">
              <Link href="/login?next=/studio" className="m-btn primary">
                Start creating
              </Link>
              <Link href="/about" className="m-btn ghost">
                How it works
              </Link>
            </div>
          </div>
          <div className="m-hero-visual" aria-hidden>
            <div className="m-mock-card paper">
              <div className="m-mock-title">Your idea, inked</div>
              <div className="m-mock-line" />
              <div className="m-mock-line short" />
              <div className="m-mock-line" />
            </div>
          </div>
        </section>

        <section className="m-section">
          <h2>One text box. Many visual forms.</h2>
          <p className="m-section-lead">
            Paste notes or bullets once. Switch layouts instantly — notes, flows,
            layers, cards — without retyping.
          </p>
          <ul className="m-features">
            <li>
              <strong>Live preview</strong>
              <span>See every layout update as you type.</span>
            </li>
            <li>
              <strong>Drag &amp; place</strong>
              <span>Move elements on the canvas like a design board.</span>
            </li>
            <li>
              <strong>Export ready</strong>
              <span>Download JPEGs sized for stories and slides.</span>
            </li>
          </ul>
        </section>

        <section className="m-section m-cta-band">
          <h2>Built for creators, teachers, and builders</h2>
          <p>No design tool required. Sign in and open the studio.</p>
          <Link href="/login?next=/studio" className="m-btn primary">
            Open studio
          </Link>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
