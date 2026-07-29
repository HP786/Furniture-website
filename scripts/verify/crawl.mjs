// Functional crawl of every storefront route at a given viewport.
// argv: <origin> <width>
const [, , origin, widthArg] = process.argv;
const width = Number(widthArg);
const isMobile = width < 700;

const targets = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
if (!page) throw new Error("no CDP page target");

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
await new Promise((r) => ws.addEventListener("open", r));
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result
    ?.result?.value;

await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: isMobile ? 844 : 900,
  deviceScaleFactor: 1,
  mobile: isMobile,
  screenWidth: width,
  screenHeight: isMobile ? 844 : 900,
});
if (isMobile) {
  await send("Emulation.setUserAgentOverride", {
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
}
await send("Page.enable");
await send("Runtime.enable");

// Collect console errors and failed requests per page.
const problems = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method === "Runtime.exceptionThrown") {
    problems.push(m.params?.exceptionDetails?.exception?.description?.split("\n")[0] ?? "exception");
  }
});

async function visit(path) {
  problems.length = 0;
  await send("Page.navigate", { url: origin + path });
  await new Promise((r) => setTimeout(r, 2200));

  return evaluate(`(() => {
    const q = (s) => document.querySelectorAll(s).length;
    const docWidth = document.documentElement.clientWidth;
    let overflow = 0;
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      let clipped = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ov = getComputedStyle(p).overflowX;
        if (ov !== 'visible') { clipped = true; break; }
      }
      if (!clipped) overflow = Math.max(overflow, Math.round(r.right + window.scrollX - docWidth));
    }
    return {
      title: document.title.slice(0, 60),
      h1: (document.querySelector('h1')?.textContent || '').trim().slice(0, 50),
      products: q('[data-testid="product-card"]'),
      collectionCards: q('[data-testid="collection-card"]'),
      navLinks: q('header nav a'),
      tabBar: q('nav[aria-label="Quick navigation"] a'),
      search: q('input[type="search"]'),
      cartTrigger: q('[data-testid="cart-trigger"]'),
      brokenImages: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length,
      scrollWidth: document.documentElement.scrollWidth,
      docWidth,
      overflow: Math.max(0, overflow),
      notFound: /404|not found/i.test(document.body.innerText.slice(0, 400)),
    };
  })()`).then((r) => ({ ...r, jsErrors: [...problems] }));
}

const handles = JSON.parse(process.env.HANDLES || "[]");
const productHandles = JSON.parse(process.env.PRODUCTS || "[]");

const routes = [
  "/",
  "/collections",
  "/search?q=sofa",
  "/cart",
  ...handles.map((h) => `/collections/${h}`),
  ...productHandles.map((h) => `/products/${h}`),
];

console.log(`\n=== ${width}px ${isMobile ? "(mobile)" : "(desktop)"} ===`);
let failures = 0;
for (const route of routes) {
  const r = await visit(route);
  const issues = [];
  if (r.notFound) issues.push("404");
  if (r.overflow > 1) issues.push(`overflow +${r.overflow}px`);
  if (r.brokenImages > 0) issues.push(`${r.brokenImages} broken img`);
  if (r.jsErrors.length) issues.push(`js: ${r.jsErrors[0].slice(0, 60)}`);
  if (route.startsWith("/collections/") && r.products === 0 && !/outdoor|bathroom/.test(route)) {
    issues.push("no products");
  }
  if (isMobile && r.tabBar === 0) issues.push("no tab bar");
  if (!isMobile && r.navLinks === 0) issues.push("no nav");
  if (r.cartTrigger === 0) issues.push("no cart trigger");

  if (issues.length) failures += 1;
  console.log(
    `${issues.length ? "FAIL" : "ok  "} ${route.padEnd(38)} p=${String(r.products).padStart(2)} c=${String(r.collectionCards).padStart(2)} sw=${r.scrollWidth} ${issues.join("; ")}`,
  );
}
console.log(`\n${failures} route(s) with issues`);
ws.close();
process.exit(0);
