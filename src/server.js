const express = require('express');
const cors = require('cors');
const { getOnchainSupply, MAX_SUPPLY, FALLBACK_CIRCULATING } = require('./onchain-supply');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Cache: recalculate at most once per hour. On RPC failure keep serving the
// last good value; only fall back to the pinned constant on a cold boot.
let cache = { data: null, timestamp: 0 };
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getCachedSupply() {
    const now = Date.now();
    if (cache.data && now - cache.timestamp <= CACHE_TTL_MS) return cache.data;
    try {
        cache = { data: await getOnchainSupply(), timestamp: now };
    } catch (err) {
        console.error('on-chain supply fetch failed:', err.message);
        if (!cache.data) {
            return {
                circulatingSupply: FALLBACK_CIRCULATING,
                totalSupply: MAX_SUPPLY,
                maxSupply: MAX_SUPPLY,
                stale: true,
                method: 'fallback (last verified figure) - live RPC unavailable',
                date: new Date().toISOString().split('T')[0],
            };
        }
    }
    return cache.data;
}

/**
 * GET /circulating-supply
 * Returns plain number (CMC/CoinGecko Section C format).
 * Example response: 117200572
 */
app.get('/circulating-supply', async (req, res) => {
    const supply = await getCachedSupply();
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=1800'); // 30 min
    res.send(String(supply.circulatingSupply));
});

/**
 * GET /total-supply
 * Returns plain number (CMC/CoinGecko Section C format): live on-chain
 * totalSupply(), i.e. genesis supply minus cumulative burn.
 * Example response: 749999332
 */
app.get('/total-supply', async (req, res) => {
    const supply = await getCachedSupply();
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=1800'); // 30 min
    res.send(String(supply.totalSupply));
});

/**
 * GET /max-supply
 * Returns plain number: tokens minted at genesis (fixed, never changes).
 * Example response: 750000000
 */
app.get('/max-supply', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
    res.send(String(MAX_SUPPLY));
});

/**
 * GET /burned-supply
 * Returns plain number: cumulative tokens burned (max supply - live totalSupply).
 */
app.get('/burned-supply', async (req, res) => {
    const supply = await getCachedSupply();
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=1800');
    res.send(String(Math.floor(supply.burned || 0)));
});

/**
 * GET /supply/circulating
 * CoinGecko format: JSON body {"result":"<number>"} (matches
 * https://api.coingecko.com/api/v3/supply/eth). CMC keeps polling the
 * plain-text /circulating-supply above.
 */
app.get('/supply/circulating', async (req, res) => {
    const supply = await getCachedSupply();
    res.set('Cache-Control', 'public, max-age=1800'); // 30 min
    res.json({ result: String(supply.circulatingSupply) });
});

/**
 * GET /supply/total
 * CoinGecko format: JSON body {"result":"<number>"} - live totalSupply().
 */
app.get('/supply/total', async (req, res) => {
    const supply = await getCachedSupply();
    res.set('Cache-Control', 'public, max-age=1800'); // 30 min
    res.json({ result: String(supply.totalSupply) });
});

/**
 * GET /supply/max
 * CoinGecko format: JSON body {"result":"<number>"} - genesis max supply.
 */
app.get('/supply/max', (req, res) => {
    res.set('Cache-Control', 'public, max-age=86400');
    res.json({ result: String(MAX_SUPPLY) });
});

/**
 * GET /token-supply
 * Returns full JSON breakdown: circulating, live total, max, burned, reserve
 * total, and the live balance of every reserve wallet the circulating figure
 * excludes.
 */
app.get('/token-supply', async (req, res) => {
    const supply = await getCachedSupply();
    res.set('Cache-Control', 'public, max-age=1800');
    res.json(supply);
});

/**
 * GET /health
 * Health check endpoint.
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Token Supply API running on port ${PORT}`);
});
