const express = require('express');
const cors = require('cors');
const { getCirculatingSupply, TOTAL_SUPPLY } = require('./vesting-schedule');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Cache: recalculate at most once per hour (supply changes daily, not per-second)
let cache = { data: null, timestamp: 0 };
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCachedSupply() {
    const now = Date.now();
    if (!cache.data || now - cache.timestamp > CACHE_TTL_MS) {
        cache = { data: getCirculatingSupply(), timestamp: now };
    }
    return cache.data;
}

/**
 * GET /circulating-supply
 * Returns plain number (CoinGecko Section C format).
 * Example response: 472267194
 */
app.get('/circulating-supply', (req, res) => {
    const supply = getCachedSupply();
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=1800'); // 30 min
    res.send(String(supply.circulatingSupply));
});

/**
 * GET /total-supply
 * Returns plain number (CoinGecko Section C format).
 * Example response: 750000000
 */
app.get('/total-supply', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=86400'); // 24 hours (never changes)
    res.send(String(TOTAL_SUPPLY));
});

/**
 * GET /token-supply
 * Returns full JSON breakdown for dashboards.
 */
app.get('/token-supply', (req, res) => {
    const supply = getCachedSupply();
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
