# YOM Token Supply API

Public API that returns YOM token circulating and total supply, built for [CoinGecko integration](https://www.coingecko.com/en/methodology) (Section C).

## Endpoints

| Endpoint | Response | Description |
|----------|----------|-------------|
| `GET /circulating-supply` | Plain number | Current circulating supply (daily interpolated) |
| `GET /total-supply` | Plain number | Total supply: `750000000` |
| `GET /token-supply` | JSON | Full breakdown by category |
| `GET /health` | JSON | Health check |

### Example: `/circulating-supply`
```
472267194
```

### Example: `/token-supply`
```json
{
  "circulatingSupply": 472267194,
  "totalSupply": 750000000,
  "breakdown": {
    "private": 22500000,
    "exchanges": 6000000,
    "mindshare": 3000000,
    "team": 12375000,
    "ecosystem": 125000000,
    "treasury": 125000000,
    "community": 20860735,
    "hodl": 89231222,
    "liquidityPool": 68300237
  },
  "date": "2027-11-25",
  "tgeDate": "2026-03-25"
}
```

## Token Economics

- **Total Supply**: 750,000,000 YOM
- **TGE Date**: March 25, 2026
- **Full Vesting**: 60 months (month 45 reaches 750M)
- **Categories**: Private, Exchanges, Mindshare, Team, Ecosystem, Treasury, Community, HODL!, Liquidity Pool

Supply is calculated by linearly interpolating between monthly vesting milestones, giving daily granularity.

## Run Locally

```bash
npm install
npm start        # http://localhost:3000
npm run dev      # with auto-reload
npm test         # verify schedule math
```

## Deploy

### Docker
```bash
docker build -t yom-token-supply .
docker run -p 3000:3000 yom-token-supply
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |

## CoinGecko Requirements

Per [CoinGecko Section C](https://www.coingecko.com/en/methodology):
- Publicly accessible, no authentication
- Returns plain number with decimals
- Adequate rate limits (polled every ~30 minutes)
- Responses include `Cache-Control` headers
