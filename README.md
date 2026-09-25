# Exchange Rates — Chrome Extension

A minimal Chrome extension that shows live **EUR/USD** and **USD/DKK** exchange rates, with the daily change, in a toolbar popup.

Built for personal daily use: click the icon, read the rates, close it.

## Features

- Live EUR/USD and USD/DKK rates with % change vs. previous close (color-coded)
- Refreshes **once per minute** while the popup is open
- **No background activity** — see [Design](#design)
- Manual refresh via the ⟲ button, the timestamp, or an errored card
- Light and dark mode aware

## Install (unpacked)

1. Open `chrome://extensions` and enable **Developer mode** (top-right)
2. Click **Load unpacked** and select this folder
3. Click the puzzle-piece icon in the toolbar and **pin** "Exchange Rates"

Chrome reads this folder in place, so don't move or rename it. After editing a file, hit the ⟲ reload button on the extension's card at `chrome://extensions` to apply the change.

Chrome will show a *"Disable developer mode extensions"* bubble on startup — that's expected for unpacked extensions and can be dismissed.

## Design

**There is no service worker.** The entire program is the popup page (`popup.js`). When the popup closes, Chrome destroys that document and its `setInterval` and any in-flight fetches with it. That's what enforces "update only while open" — it isn't a flag or a suspend/resume handler, it's structural. Closing the popup can't leave anything running, and there's no state to clean up.

You can confirm this at `chrome://extensions`: the extension lists no "service worker" entry.

## Data source

Yahoo Finance's chart API — free, no API key, near-real-time:

```
https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d
```

| Pair | Yahoo ticker | Notes |
| --- | --- | --- |
| EUR/USD | `EURUSD=X` | |
| USD/DKK | `DKK=X` | Yahoo has no `USDKK=X` |

Values are read from `chart.result[0].meta`: `regularMarketPrice`, `regularMarketChangePercent`, `chartPreviousClose`.

Behaviour worth knowing:

- The endpoint **rejects requests without a browser User-Agent**. The extension is unaffected (Chrome's `fetch` sends one automatically), but hand-testing with `curl` requires `-H "User-Agent: Mozilla/5.0 ..."`.
- `query1` and `query2` are mirrors; the extension falls back to `query2` on failure.
- This API is **unofficial and undocumented**, so it can change or rate-limit without notice. The blast radius is contained to `fetchRate()` in `popup.js` — swapping in a keyed provider (e.g. Twelve Data) is a change to that one function.

## Files

```
manifest.json   MV3 manifest; declares Yahoo host permissions, no background worker
popup.html      Markup + a <template> cloned once per pair
popup.css       Styling, light/dark via prefers-color-scheme
popup.js        All logic: fetch, parse, render, 60s interval (~100 lines)
icons/          16 / 48 / 128 px PNGs
```

## Adding another pair

Add an entry to `SYMBOLS` in `popup.js`:

```js
{ label: "GBP/USD", symbol: "GBPUSD=X" }
```

The card, fetch, and rendering are all generated from that list — no other file needs to change.
