// Capture a page as a series of viewport slices, so each is readable.
// argv: <url> <width> <sliceHeight> <outPrefix> [count]
const [, , targetUrl, widthArg, sliceArg, outPrefix, countArg] = process.argv;
const width = Number(widthArg);
const sliceHeight = Number(sliceArg);
const count = Number(countArg || 6);
import { writeFile } from "node:fs/promises";

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

const isMobile = width < 700;
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: sliceHeight,
  deviceScaleFactor: 1,
  mobile: isMobile,
  screenWidth: width,
  screenHeight: sliceHeight,
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
await new Promise((r) => setTimeout(r, 3500));

await evaluate(`(async () => {
  const total = document.documentElement.scrollHeight;
  for (let y = 0; y < total; y += window.innerHeight) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 200));
  }
  document.querySelectorAll('[data-reveal]').forEach(el => el.dataset.shown = '1');
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 500));
})()`);

const total = await evaluate("document.documentElement.scrollHeight");
const slices = Math.min(count, Math.ceil(total / sliceHeight));

for (let i = 0; i < slices; i += 1) {
  await evaluate(`window.scrollTo(0, ${i * sliceHeight})`);
  await new Promise((r) => setTimeout(r, 800));
  const shot = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(`${outPrefix}-${i + 1}.png`, Buffer.from(shot.result.data, "base64"));
  console.log(`${outPrefix}-${i + 1}.png`);
}

ws.close();
process.exit(0);
