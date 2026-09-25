// Exchange Rates popup — all logic lives here; no service worker.
// When the popup closes this document is destroyed, so fetches and
// timers stop automatically. Nothing runs in the background.

const SYMBOLS = [
  { label: "EUR/USD", symbol: "EURUSD=X" },
  { label: "USD/DKK", symbol: "DKK=X" },
];

const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

const REFRESH_MS = 60_000;

const cardsEl = document.getElementById("cards");
const cardTemplate = document.getElementById("card-template");
const updatedEl = document.getElementById("updated");
const refreshBtn = document.getElementById("refresh");

// Build one card per pair, keep references to its live elements.
const cards = SYMBOLS.map(({ label }) => {
  const node = cardTemplate.content.cloneNode(true);
  node.querySelector(".pair-name").textContent = label;
  cardsEl.appendChild(node);
  const card = cardsEl.lastElementChild;
  return {
    card,
    rate: card.querySelector(".rate"),
    chip: card.querySelector(".change-chip"),
    prevClose: card.querySelector(".pair-quotes"),
  };
});

/** Fetch one pair's rate, trying each Yahoo mirror in order. */
async function fetchRate(symbol) {
  for (const host of HOSTS) {
    try {
      const res = await fetch(
        `${host}/v8/finance/chart/${symbol}?interval=1d&range=1d`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta || meta.regularMarketPrice == null) {
        throw new Error("Unexpected response shape");
      }
      return meta;
    } catch (err) {
      // Try the next mirror; the last error propagates to the caller.
      console.warn(`${host} failed for ${symbol}:`, err.message);
    }
  }
  throw new Error("All Yahoo hosts failed");
}

function formatChange(pct) {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function render(card, meta) {
  card.card.classList.remove("error");
  card.rate.textContent = meta.regularMarketPrice.toFixed(4);
  const pct = meta.regularMarketChangePercent ?? 0;
  card.chip.textContent = formatChange(pct);
  card.chip.className = `change-chip ${pct > 0 ? "up" : pct < 0 ? "down" : "flat"}`;
  card.prevClose.textContent = `Prev close: ${(meta.chartPreviousClose ?? meta.regularMarketPrice).toFixed(4)}`;
}

function renderError(card) {
  card.card.classList.add("error");
  card.rate.textContent = "Failed to load — click to retry";
  card.chip.textContent = "";
  card.chip.className = "change-chip";
  card.prevClose.textContent = "";
}

/** Fetch all pairs in parallel and render the results. */
async function refreshAll() {
  refreshBtn.classList.add("spinning");
  const results = await Promise.allSettled(SYMBOLS.map(({ symbol }) => fetchRate(symbol)));
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      render(cards[i], result.value);
    } else {
      renderError(cards[i]);
    }
  });
  updatedEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  refreshBtn.classList.remove("spinning");
}

// Clicking an errored card, the refresh button, or the timestamp refreshes now.
cards.forEach((card) =>
  card.card.addEventListener("click", () => {
    if (card.card.classList.contains("error")) refreshAll();
  })
);
refreshBtn.addEventListener("click", refreshAll);
updatedEl.addEventListener("click", refreshAll);

// First paint immediately, then once per minute while the popup is open.
refreshAll();
setInterval(refreshAll, REFRESH_MS);