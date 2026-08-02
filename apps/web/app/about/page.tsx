import Link from "next/link";
import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingShell";

export default function AboutPage() {
  return (
    <div className="m-page">
      <MarketingNav ctaHref="/login?next=/studio" />
      <main className="m-doc">
        <h1>About InkType</h1>
        <p>
          InkType is a digital platform from{" "}
          <a href="https://aysentra.com">Aysentra Labs</a> that converts text into
          handwritten-style notes and diagram images.
        </p>
        <p>
          Type or paste content once, preview multiple visual forms in real time,
          adjust layout on a canvas, and export when you are ready to share.
        </p>
        <h2>Delivery</h2>
        <ul>
          <li>Instant access after sign-in</li>
          <li>Browser studio today; Android app planned</li>
          <li>Free tier with limits; Pro for higher export volume</li>
        </ul>
        <Link href="/login?next=/studio" className="m-btn primary">
          Open studio
        </Link>
      </main>
      <MarketingFooter />
    </div>
  );
}
