/**
 * YOM on-chain supply.
 *
 * Total       = totalSupply() read live from the token contract. The YOM token
 *               burns protocol fees via burn(), which lowers totalSupply
 *               on-chain, so total = MAX_SUPPLY − burned.
 * Burned      = MAX_SUPPLY − totalSupply()
 * Circulating = totalSupply() − Σ balanceOf(reserve wallet)
 *
 * All three are read live from the Avalanche C-Chain. This is the same formula
 * CoinMarketCap/CoinGecko apply when verifying self-reported supply, so these
 * endpoints always agree with what a reviewer can independently compute from
 * the explorer.
 *
 * RESERVE_WALLETS mirrors the `supply_class: reserve` set in
 * yom-token-monitor/data/wallet_registry.yaml and the red rows of the CMC
 * "Verified Supply" Annex C submission. Keep all three in sync when a wallet
 * is added, drained, or reclassified.
 */

// Minted at genesis; fixed. Live total supply is lower by the cumulative burn.
const MAX_SUPPLY = 750_000_000;
const TOTAL_SUPPLY = MAX_SUPPLY; // backwards-compatible alias (genesis supply)
const TOKEN = '0xb6314518b61b4864162c7aE7fdc36261e0A14C4b';
const RPC_URL = process.env.AVAX_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc';

// Last verified figure (2026-07-15). Served only when the RPC is unreachable
// and no cached live value exists yet (e.g. cold boot during an RPC outage).
const FALLBACK_CIRCULATING = 117_200_572;

const RESERVE_WALLETS = [
    { address: '0xc1028208B5Fa8E034B90c74B620C0855f85659F5', label: 'Team Finance vesting vault (treasury/ecosystem/HODL)' },
    { address: '0x7E72A9A032D5Ab75A89E017926F15e076D74A5C7', label: 'Team Finance vesting escrow' },
    { address: '0xba1151b7d33F0f6815473e90Faa858aAE4E3bc75', label: 'Team Finance vesting escrow (investor batch)' },
    { address: '0xdB728fd94c9200FCb602efBc382c4ED35E17d810', label: 'Team Finance vesting escrow (community program)' },
    { address: '0x42cBcf931661fAe375AFCA2585dD8fB3406ECc54', label: 'Team Finance vesting escrow' },
    { address: '0x20B9478863e072D2769d1F4A0fe6e885811B5fd4', label: 'Team Finance vesting micro-escrow' },
    { address: '0xFe63273E0e6C9A94Eab7BD10a53753ce887e1dB4', label: 'Team Finance vesting micro-escrow' },
    { address: '0xdF8bC5a5e9893529c96Ea111bEeECFc5BBC00F64', label: 'Deployer / admin' },
    { address: '0x263Cb1a3A967E2aFDdfBb48abc12B00935501e6C', label: 'Team wallet (2-of-3 Safe signer)' },
    { address: '0x2624248e8381e4e927a594054c26D504A28f74e5', label: 'Up10 launchpad claim contract' },
    { address: '0x7Afe9ca3C2196302404280532Dc6b1Db4F649b8c', label: 'Up10 launchpad claim helper' },
];

async function rpcBalanceOf(address) {
    // ERC-20 balanceOf(address) selector + 32-byte padded address
    const data = '0x70a08231' + address.toLowerCase().replace('0x', '').padStart(64, '0');
    const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_call',
            params: [{ to: TOKEN, data }, 'latest'],
        }),
    });
    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(`RPC error: ${json.error.message}`);
    return BigInt(json.result);
}

async function rpcTotalSupply() {
    // ERC-20 totalSupply() selector
    const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_call',
            params: [{ to: TOKEN, data: '0x18160ddd' }, 'latest'],
        }),
    });
    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(`RPC error: ${json.error.message}`);
    return BigInt(json.result);
}

async function getOnchainSupply() {
    const [totalWei, ...balances] = await Promise.all([
        rpcTotalSupply(),
        ...RESERVE_WALLETS.map((w) => rpcBalanceOf(w.address)),
    ]);
    const reserveWei = balances.reduce((a, b) => a + b, 0n);
    const totalTokens = Number(totalWei) / 1e18;
    const reserveTokens = Number(reserveWei) / 1e18;
    const burnedTokens = MAX_SUPPLY - totalTokens;
    if (burnedTokens < 0 || burnedTokens > MAX_SUPPLY) {
        throw new Error(`implausible on-chain totalSupply: ${totalTokens}`);
    }
    const totalSupply = Math.floor(totalTokens);
    const circulatingSupply = Math.floor(totalTokens - reserveTokens);
    return {
        circulatingSupply,
        totalSupply,
        maxSupply: MAX_SUPPLY,
        burned: Math.round(burnedTokens * 100) / 100,
        reserve: Math.round(reserveTokens * 100) / 100,
        method: 'totalSupply = totalSupply() (750M genesis minus burned); circulating = totalSupply - sum(balanceOf(reserve wallets)); all read live from Avalanche C-Chain',
        reserveWallets: RESERVE_WALLETS.map((w, i) => ({
            ...w,
            balance: Math.round((Number(balances[i]) / 1e18) * 100) / 100,
        })),
        date: new Date().toISOString().split('T')[0],
    };
}

module.exports = { MAX_SUPPLY, TOTAL_SUPPLY, TOKEN, RESERVE_WALLETS, FALLBACK_CIRCULATING, getOnchainSupply };
