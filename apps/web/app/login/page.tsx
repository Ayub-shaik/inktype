import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="login-fallback">Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
