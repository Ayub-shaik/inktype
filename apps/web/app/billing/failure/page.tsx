export default function BillingFailurePage() {
  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <h1 style={{ fontFamily: "Georgia, serif", marginBottom: 8 }}>Payment not completed</h1>
        <p style={{ opacity: 0.75, marginBottom: 20 }}>
          No charge went through, or checkout was cancelled. You can try again anytime.
        </p>
        <a href="/" style={{ textDecoration: "underline" }}>
          Back to InkType
        </a>
      </div>
    </main>
  );
}
