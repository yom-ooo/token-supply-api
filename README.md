# YOM Token Supply API

Public API that returns YOM token circulating and total supply, built for
CoinMarketCap / [CoinGecko](https://www.coingecko.com/en/methodology) supply
verification (served at `https://supply.yom.net`, Fly app `yom-token-supply`).

Circulating supply is computed **live from the Avalanche C-Chain**:

```
circulating = 750,000,000 − Σ balanceOf(reserve wallet)
```

The reserve wallet set (team/treasury vesting escrows, deployer, team wallet,
launchpad claim contracts) lives in [`src/onchain-supply.js`](src/onchain-supply.js)
and mirrors two other surfaces that must stay in sync with it:

- `yom-token-monitor/data/wallet_registry.yaml` (`supply_class: reserve`)
- the red rows of the CMC "Verified Supply" Annex C submission sheet

This is the same formula aggregators apply when independently verifying
supply, so the API always agrees with what a reviewer computes from the
explorer.

## Endpoints

| Endpoint | Response | Description |
|----------|----------|-------------|
| `GET /circulating-supply` | Plain number | Live on-chain circulating supply |
| `GET /total-supply` | Plain number | Total supply: `750000000` |
| `GET /token-supply` | JSON | Circulating + per-reserve-wallet breakdown |
| `GET /health` | JSON | Health check |

### Example: `/circulating-supply`
```
117200572
```

### Example: `/token-supply`
```json
{
  "circulatingSupply": 117200572,
  "totalSupply": 750000000,
  "reserve": 632799427.93,
  "method": "circulating = totalSupply - sum(balanceOf(reserve wallets)), read live from Avalanche C-Chain",
  "reserveWallets": [
    { "address": "0xc1028208B5Fa8E034B90c74B620C0855f85659F5", "label": "Team Finance vesting vault (treasury/ecosystem/HODL)", "balance": 610594750.17 }
  ],
  "date": "2026-07-15"
}
```

Balances are cached for 1 hour. On RPC failure the last good value keeps
being served; a cold boot during an RPC outage serves a pinned last-verified
figure marked `"stale": true`.

## Run Locally

```bash
npm install
npm start        # http://localhost:3000
npm run dev      # with auto-reload
npm test         # live smoke test against the Avalanche RPC
```

## Deploy

Merging to `main` deploys to Fly.io via GitHub Actions
([`.github/workflows/fly-deploy.yml`](.github/workflows/fly-deploy.yml),
requires the org `FLY_API_TOKEN` secret). Manual: `flyctl deploy`.

### Docker
```bash
docker build -t yom-token-supply .
docker run -p 3000:3000 yom-token-supply
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `AVAX_RPC_URL` | `https://api.avax.network/ext/bc/C/rpc` | Avalanche C-Chain JSON-RPC endpoint |

## Aggregator Requirements

Per CMC verified-supply / CoinGecko Section C:
- Publicly accessible, no authentication
- Returns plain number
- Adequate rate limits (polled every ~30 minutes)
- Responses include `Cache-Control` headers

## Historical note

`src/vesting-schedule.js` holds the original theoretical vesting schedule
(TGE 2026-03-25, monthly cumulative unlocks). It over-reported circulating
supply because scheduled unlocks are not executed on-chain on the paper
timeline — the escrows still hold the tokens. It is kept for reference but no
endpoint serves it.
