import { NextResponse } from "next/server";

const COOKIE = "inktype_session";

function authConfigured() {
  if (process.env.INKTYPE_AUTH_DISABLE === "1") return false;
  const user =
    process.env.INKTYPE_AUTH_USER || process.env.JDI_AUTH_USER || "";
  const pass =
    process.env.INKTYPE_AUTH_PASSWORD || process.env.JDI_AUTH_PASSWORD || "";
  const secret =
    process.env.INKTYPE_SESSION_SECRET ||
    process.env.JDI_SESSION_SECRET ||
    "";
  return Boolean(user && pass && secret);
}

async function hmacHex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verify(token: string | undefined) {
  const user =
    process.env.INKTYPE_AUTH_USER || process.env.JDI_AUTH_USER || "";
  const secret =
    process.env.INKTYPE_SESSION_SECRET ||
    process.env.JDI_SESSION_SECRET ||
    "";
  if (!token) return false;
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [username, expS, sig] = parts;
  const exp = Number(expS);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  if (username !== user) return false;
  const expect = await hmacHex(secret, `${username}:${expS}`);
  return expect === sig;
}

export async function middleware(
  req: Request & {
    cookies: { get: (n: string) => { value: string } | undefined };
    nextUrl: URL;
  },
) {
  const request = req as unknown as import("next/server").NextRequest;
  if (!authConfigured()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const publicPaths = [
    "/",
    "/about",
    "/contact",
    "/support",
    "/studio",
    "/settings",
    "/billing/success",
    "/billing/failure",
  ];
  if (
    publicPaths.includes(pathname) ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/v1/") ||
    pathname === "/health" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/vendor/") ||
    pathname.startsWith("/Virgil")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE)?.value;
  if (await verify(token)) return NextResponse.next();

  const publicUrl = process.env.INKTYPE_PUBLIC_URL || "";
  const url = publicUrl
    ? new URL(publicUrl)
    : request.nextUrl.clone();
  // Fallback to forwarded host/proto only when no explicit public URL exists.
  if (!publicUrl) {
    const xfHost = request.headers.get("x-forwarded-host");
    const xfProto = request.headers.get("x-forwarded-proto");
    if (xfHost) url.host = xfHost.split(",")[0].trim().replace(/:\d+$/, "");
    if (xfProto) url.protocol = `${xfProto.split(",")[0].trim()}:`;
  }
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
