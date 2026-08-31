import type { NextConfig } from "next";

// Baseline security headers. These are the ones that can be applied without
// knowing anything about page content.
//
// Deliberately NOT set here: a script-src Content-Security-Policy. Next.js
// injects inline bootstrap scripts and this app embeds inline JSON-LD, so a
// meaningful script-src needs per-request nonces threaded through proxy.ts.
// Shipping `unsafe-inline` instead would be a CSP that permits exactly the
// attack it appears to prevent, so the clickjacking directive is set on its own
// and script-src is left for a deliberate nonce rollout.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The camera is scoped to this origin rather than blocked outright: WebXR
  // runs the "view in your room" session in the page and needs it. A phone
  // that hands AR to Scene Viewer or Quick Look leaves the browser entirely
  // and never asks. Third-party frames are still refused, and the ancestors
  // directive above means there are none.
  {
    key: "Permissions-Policy",
    value: "camera=(self), xr-spatial-tracking=(self), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Only meaningful over HTTPS; browsers ignore it on plain-http localhost.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Drops the `X-Powered-By: Next.js` version banner.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Apple's AR Quick Look expects this type on a .usdz. Served as a
        // generic byte stream, an iPhone can decline to open it in AR — and
        // `nosniff` above means the browser will not guess on our behalf.
        source: "/models/:file*.usdz",
        headers: [{ key: "Content-Type", value: "model/vnd.usdz+zip" }],
      },
    ];
  },
};

export default nextConfig;
