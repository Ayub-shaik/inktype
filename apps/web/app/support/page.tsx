import Link from "next/link";
import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingShell";

export default function SupportPage() {
  return (
    <div className="m-page">
      <MarketingNav ctaHref="/login?next=/studio" />
      <main className="m-doc">
        <h1>Support</h1>
        <h2>Getting started</h2>
        <ol>
          <li>Sign in at the studio</li>
          <li>Type or paste your content in the editor</li>
          <li>Pick a layout strip below the canvas</li>
          <li>Drag elements to adjust placement</li>
          <li>Export when satisfied</li>
        </ol>
        <h2>Plans</h2>
        <p>
          Free includes limited previews and exports. Pro unlocks clean exports and
          higher monthly volume. Pricing is shown at checkout in your local currency.
        </p>
        <h2>Need help?</h2>
        <p>
          Email{" "}
          <a href="mailto:support@aysentra.com">support@aysentra.com</a> with your
          account email and a screenshot if something fails.
        </p>
        <Link href="/settings" className="m-btn secondary">
          Account &amp; usage
        </Link>
      </main>
      <MarketingFooter />
    </div>
  );
}
