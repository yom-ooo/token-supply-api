/**
 * Smoke test: pulls live reserve balances from the Avalanche C-Chain and
 * checks the computed circulating supply against structural invariants.
 * Requires network access to the RPC endpoint.
 */
const { getOnchainSupply, MAX_SUPPLY } = require('../src/onchain-supply');

(async () => {
    const s = await getOnchainSupply();

    console.log(`max supply       : ${s.maxSupply.toLocaleString('en-US')}`);
    console.log(`burned           : ${s.burned.toLocaleString('en-US')}`);
    console.log(`total supply     : ${s.totalSupply.toLocaleString('en-US')}`);
    console.log(`reserve          : ${s.reserve.toLocaleString('en-US')}`);
    console.log(`circulating      : ${s.circulatingSupply.toLocaleString('en-US')}`);
    console.log('');
    for (const w of s.reserveWallets) {
        console.log(`${w.address}  ${w.balance.toLocaleString('en-US').padStart(18)}  ${w.label}`);
    }

    const errors = [];
    if (s.maxSupply !== MAX_SUPPLY) errors.push('max supply mismatch');
    if (!(s.burned >= 0 && s.burned < 100_000_000)) errors.push(`burned out of range: ${s.burned}`);
    if (Math.abs(s.totalSupply + s.burned - MAX_SUPPLY) > 1) errors.push('total + burned != max');
    if (!(s.reserve > 400_000_000)) errors.push(`reserve implausibly low: ${s.reserve}`);
    if (!(s.circulatingSupply > 10_000_000 && s.circulatingSupply < s.totalSupply)) {
        errors.push(`circulating out of range: ${s.circulatingSupply}`);
    }
    if (Math.abs(s.reserve + s.circulatingSupply - s.totalSupply) > 1) {
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
