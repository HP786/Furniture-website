// Drive headless Chrome over CDP to find what is wider than the viewport.
const [, , targetUrl, widthArg] = process.argv;
const width = Number(widthArg || 390);
const CDP = "http://127.0.0.1:9333";

async function listTargets() {
  const res = await fetch(`${CDP}/json/list`);
  return res.json();
}

const deadline = Date.now() + 20000;
let page = null;
while (Date.now() < deadline) {
  try {
    const targets = await listTargets();
    page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    if (page) break;
  } catch {
    /* chrome not up yet */
  }
  await new Promise((r) => setTimeout(r, 300));
}
if (!page) throw new Error("no CDP page target");

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

await new Promise((resolve) => ws.addEventListener("open", resolve));

function send(method, params = {}) {
  const msgId = ++id;
  return new Promise((resolve) => {
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

async function evaluate(expression) {
  const res = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.result?.exceptionDetails) {
    throw new Error(JSON.stringify(res.result.exceptionDetails));
  }
  return res.result?.result?.value;
}

await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: 900,
  deviceScaleFactor: 1,
  mobile: width < 600,
});
await send("Page.enable");
await send("Page.navigate", { url: targetUrl });
await new Promise((r) => setTimeout(r, 6000));

const report = await evaluate(`(() => {
  const docWidth = document.documentElement.clientWidth;
  const offenders = [];
  for (const el of document.querySelectorAll('*')) {
    const rect = el.getBoundingClientRect();
    const right = rect.right + window.scrollX;
    if (right > docWidth + 1 && rect.width > 0) {
      // Only report the element if no ancestor already clips it.
      let clipped = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ov = getComputedStyle(p).overflowX;
        if (ov === 'hidden' || ov === 'auto' || ov === 'scroll' || ov === 'clip') { clipped = true; break; }
      }
      if (clipped) continue;
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className || '')).slice(0, 140),
        right: Math.round(right),
        width: Math.round(rect.width),
        text: (el.textContent || '').trim().slice(0, 40),
      });
    }
  }
  return {
    docWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    offenders: offenders.slice(0, 25),
  };
})()`);

console.log(JSON.stringify(report, null, 2));
ws.close();
process.exit(0);
