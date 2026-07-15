/**
 * Smoke test: pulls live reserve balances from the Avalanche C-Chain and
 * checks the computed circulating supply against structural invariants.
 * Requires network access to the RPC endpoint.
 */
const { getOnchainSupply, TOTAL_SUPPLY } = require('../src/onchain-supply');

(async () => {
    const s = await getOnchainSupply();

    console.log(`total supply     : ${s.totalSupply.toLocaleString('en-US')}`);
    console.log(`reserve          : ${s.reserve.toLocaleString('en-US')}`);
    console.log(`circulating      : ${s.circulatingSupply.toLocaleString('en-US')}`);
    console.log('');
    for (const w of s.reserveWallets) {
        console.log(`${w.address}  ${w.balance.toLocaleString('en-US').padStart(18)}  ${w.label}`);
    }

    const errors = [];
    if (s.totalSupply !== TOTAL_SUPPLY) errors.push('total supply mismatch');
    if (!(s.reserve > 400_000_000)) errors.push(`reserve implausibly low: ${s.reserve}`);
    if (!(s.circulatingSupply > 10_000_000 && s.circulatingSupply < TOTAL_SUPPLY)) {
        errors.push(`circulating out of range: ${s.circulatingSupply}`);
    }
    if (Math.abs(s.reserve + s.circulatingSupply - TOTAL_SUPPLY) > 1) {
        errors.push('reserve + circulating != total');
    }

    if (errors.length) {
        console.error('\nFAIL:\n- ' + errors.join('\n- '));
        process.exit(1);
    }
    console.log('\nOK');
})().catch((err) => {
    console.error('FAIL:', err.message);
    process.exit(1);
});
