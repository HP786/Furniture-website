// Full-page screenshots via CDP with real device-metric emulation.
// argv: <url> <width> <outfile> [maxHeight]
const [, , targetUrl, widthArg, outFile, maxHeightArg] = process.argv;
const width = Number(widthArg);
const maxHeight = Number(maxHeightArg || 8000);
const CDP = "http://127.0.0.1:9333";
import { writeFile } from "node:fs/promises";

const deadline = Date.now() + 20000;
let page = null;
while (Date.now() < deadline) {
  try {
    const targets = await (await fetch(`${CDP}/json/list`)).json();
    page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    if (page) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 300));
}
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

const isMobile = width < 700;
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: 900,
  deviceScaleFactor: 1,
  mobile: isMobile,
  screenWidth: width,
  screenHeight: 900,
});
if (isMobile) {
  await send("Emulation.setUserAgentOverride", {
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
}
await send("Page.enable");
await send("Page.navigate", { url: targetUrl });
await new Promise((r) => setTimeout(r, 3000));

// Scroll through the page so lazy images and reveal-on-scroll sections settle.
const evaluate = async (expression) => {
  const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return res.result?.result?.value;
};
const fullHeight = await evaluate(`(async () => {
  const step = window.innerHeight;
  const total = document.documentElement.scrollHeight;
  for (let y = 0; y < total; y += step) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 220));
  }
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 500));
  document.querySelectorAll('[data-reveal]').forEach(el => el.dataset.shown = '1');
  await new Promise(r => setTimeout(r, 400));
  return document.documentElement.scrollHeight;
})()`);

const height = Math.min(fullHeight, maxHeight);
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: isMobile,
  screenWidth: width,
  screenHeight: height,
});
await new Promise((r) => setTimeout(r, 900));

const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
await writeFile(outFile, Buffer.from(shot.result.data, "base64"));
console.log(`${outFile} ${width}x${height}`);
ws.close();
process.exit(0);
