# Storefront verification scripts

Headless-Chrome checks driven over the DevTools protocol. No dependencies —
they use Node's built-in `fetch` and `WebSocket`.

## Open the shared browser first

Every script talks to Chrome on port 9333, so start it once:

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --headless=new --disable-gpu --hide-scrollbars \
  --remote-debugging-port=9333 --user-data-dir=/tmp/cdp about:blank &
```

Then start the storefront (`pnpm build && pnpm start -p 3120`).

## `crawl.mjs` — does every route work?

Walks the whole site at one viewport and reports per route: product count,
collection-card count, horizontal overflow, broken images, uncaught JS errors,
and whether the nav / mobile tab bar / cart trigger rendered.

```bash
export HANDLES='["shop-all","living-room-1","dining-room-1","bedroom-1","outdoor","bathroom","long-afternoons","soft-texture","warm-timber","pale-and-quiet","lived-in-leather","small-spaces","armchairs","ottomans","coffee-tables","side-tables","bedside-tables","dining-tables","sofas","chairs","tables"]'
export PRODUCTS='["ark-sofa-boucle","ester-armchair-oyster","cove-side-table-clay","eclipse-round-dining-table-oak"]'

node scripts/verify/crawl.mjs http://localhost:3120 1440   # desktop
node scripts/verify/crawl.mjs http://localhost:3120 390    # mobile
```

Empty collections (Outdoor, Bathroom) are expected to have no products and are
not flagged.

## `probe.mjs` — what is causing horizontal overflow?

Lists the elements extending past the viewport, skipping any with a clipping
ancestor so it names the actual culprit rather than its children.

```bash
node scripts/verify/probe.mjs http://localhost:3120/ 390
```

## `shoot.mjs` / `slice.mjs` — screenshots

`shoot.mjs` captures one full-page PNG; `slice.mjs` captures a series of
viewport-sized slices, which stay readable for long pages. Both scroll the page
first so lazy images and reveal-on-scroll sections have settled.

```bash
node scripts/verify/shoot.mjs http://localhost:3120/ 1440 home-desktop.png 3200
node scripts/verify/slice.mjs http://localhost:3120/ 390 844 mobile 11
```
