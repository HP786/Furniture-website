// Serialises a JSON-LD payload for embedding in an inline <script> tag.
//
// `JSON.stringify` escapes quotes but NOT `<`, so any value reaching it that
// contains `</script>` closes the block early and everything after it parses as
// markup - an XSS sink. The request host reaches these payloads (breadcrumb
// `item` URLs), and so does merchant text like a collection title, so the
// output is escaped rather than trusted.
//
// The block is `type="application/ld+json"` and is never evaluated as JS, so
// escaping the markup-significant characters is sufficient here.
const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
};

export function toJsonLd(payload: unknown): string {
  return JSON.stringify(payload).replace(/[<>&]/g, (char) => ESCAPES[char]);
}
