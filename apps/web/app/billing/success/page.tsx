export default function BillingSuccessPage() {
  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <h1 style={{ fontFamily: "Georgia, serif", marginBottom: 8 }}>Payment received</h1>
        <p style={{ opacity: 0.75, marginBottom: 20 }}>
          Pro unlocks after Dodo confirms the payment (usually a few seconds).
        </p>
        <a href="/" style={{ textDecoration: "underline" }}>
          Back to InkType
        </a>
      </div>
    </main>
  );
}
