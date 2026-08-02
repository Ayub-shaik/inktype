import { MarketingFooter, MarketingNav } from "@/components/marketing/MarketingShell";

export default function ContactPage() {
  return (
    <div className="m-page">
      <MarketingNav ctaHref="/login?next=/studio" />
      <main className="m-doc">
        <h1>Contact</h1>
        <p>Questions about InkType, billing, or partnerships:</p>
        <ul className="m-contact-list">
          <li>
            <strong>Support</strong>{" "}
            <a href="mailto:support@aysentra.com">support@aysentra.com</a>
          </li>
          <li>
            <strong>General</strong>{" "}
            <a href="mailto:info@aysentra.com">info@aysentra.com</a>
          </li>
          <li>
            <strong>Founder</strong>{" "}
            <a href="https://ayubshaik.aysentra.com">ayubshaik.aysentra.com</a>
          </li>
        </ul>
      </main>
      <MarketingFooter />
    </div>
  );
}
