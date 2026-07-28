import { headers } from "next/headers";

export type NextSearchParams = Record<string, string | string[] | undefined>;

export function toURLSearchParams(input: NextSearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value != null) {
      params.set(key, value);
    }
  }
  return params;
}

// Both parts of the origin come from request headers, which a client may be
// able to influence depending on what proxies sit in front of the app, and the
// result is embedded in page markup (breadcrumb JSON-LD). Neither is trusted:
// the host must look like a host, and the scheme is restricted to http/https so
// a header can't smuggle in something like `javascript:`. Escaping at the
// JSON-LD sink (see ./json-ld) is the second half of this defence.
const HOST_PATTERN = /^[a-zA-Z0-9.-]+(?::\d{1,5})?$/;
const FALLBACK_HOST = "localhost:3000";

export async function getRequestOrigin() {
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") === "https" ? "https" : "http";
  const rawHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const host = rawHost && HOST_PATTERN.test(rawHost) ? rawHost : FALLBACK_HOST;
  return `${protocol}://${host}`;
}
