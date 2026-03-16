/**
 * Verification test: checks vesting schedule math against known spreadsheet totals.
 */
const { getCirculatingSupply, SCHEDULE, CATEGORIES, TGE_DATE, TOTAL_SUPPLY } = require('../src/vesting-schedule');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`  PASS: ${message}`);
    } else {
        failed++;
        console.error(`  FAIL: ${message}`);
    }
}

// ─── Test 1: All categories have 61 entries (months 0–60) ─────────────────
console.log('\n1. Schedule structure');
for (const cat of CATEGORIES) {
    assert(SCHEDULE[cat].length === 61, `${cat} has 61 monthly entries`);
}

// ─── Test 2: Verify known monthly totals from spreadsheet ─────────────────
console.log('\n2. Monthly totals match spreadsheet');

// Expected totals from the spreadsheet (spot-checked)
const expectedTotals = {
    0: 126559439,
    5: 153901432,
    10: 225715002,
    15: 353209848,
    20: 472267194,
    25: 589250000,
    30: 656250000,
    35: 687500000,
    40: 718750000,
    45: 750000000,
    50: 750000000,
    55: 750000000,
    60: 750000000,
};

for (const [month, expectedTotal] of Object.entries(expectedTotals)) {
    const m = parseInt(month);
    // Get the date at the exact start of this month
    const date = new Date(TGE_DATE);
    date.setUTCMonth(date.getUTCMonth() + m);

    const result = getCirculatingSupply(date);
    assert(
        result.circulatingSupply === expectedTotal,
        `Month ${m}: expected ${expectedTotal.toLocaleString()}, got ${result.circulatingSupply.toLocaleString()}`
    );
}

// ─── Test 3: Max allocation matches total supply ──────────────────────────
console.log('\n3. Final allocations sum to total supply');
let finalSum = 0;
for (const cat of CATEGORIES) {
    finalSum += SCHEDULE[cat][60];
}
assert(finalSum === TOTAL_SUPPLY, `Sum of all categories at month 60 = ${finalSum.toLocaleString()} (expected ${TOTAL_SUPPLY.toLocaleString()})`);

// ─── Test 4: Before TGE returns 0 ────────────────────────────────────────
console.log('\n4. Pre-TGE returns 0');
const preTGE = new Date('2026-03-24T00:00:00Z');
const preTGEResult = getCirculatingSupply(preTGE);
assert(preTGEResult.circulatingSupply === 0, `Before TGE: circulating = ${preTGEResult.circulatingSupply}`);

// ─── Test 5: Daily interpolation works ────────────────────────────────────
console.log('\n5. Daily interpolation');
// Mid-way through month 0→1, supply should be between month 0 and month 1 totals
const midMonth0 = new Date('2026-04-09T00:00:00Z'); // ~15 days after TGE
const midResult = getCirculatingSupply(midMonth0);
assert(
    midResult.circulatingSupply > expectedTotals[0] && midResult.circulatingSupply < 128633979,
    `Mid month 0→1: ${midResult.circulatingSupply.toLocaleString()} is between month 0 (${expectedTotals[0].toLocaleString()}) and month 1 (128,633,979)`
);

// ─── Test 6: Beyond month 60 stays at max ─────────────────────────────────
console.log('\n6. Beyond month 60');
const beyond = new Date('2032-01-01T00:00:00Z');
const beyondResult = getCirculatingSupply(beyond);
assert(beyondResult.circulatingSupply === TOTAL_SUPPLY, `After month 60: ${beyondResult.circulatingSupply.toLocaleString()} = ${TOTAL_SUPPLY.toLocaleString()}`);

// ─── Summary ──────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    process.exit(1);
} else {
    console.log('All tests passed!');
}
