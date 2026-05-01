const test = require('node:test');
const assert = require('node:assert/strict');
const { sum_to_n_a, sum_to_n_b, sum_to_n_c } = require('./sum-to-n.js');

const implementations = [
  ['sum_to_n_a (iterative)', sum_to_n_a],
  ['sum_to_n_b (closed-form)', sum_to_n_b],
  ['sum_to_n_c (recursive)', sum_to_n_c],
];

const correctnessCases = [
  { n: 0, expected: 0 },
  { n: 1, expected: 1 },
  { n: 2, expected: 3 },
  { n: 5, expected: 15 },
  { n: 100, expected: 5050 },
  { n: 1_000, expected: 500_500 },
  { n: -1, expected: -1 },
  { n: -5, expected: -15 },
  { n: -100, expected: -5050 },
];

const invalidInputs = [1.5, -2.7, NaN, Infinity, -Infinity, '5', '', null, undefined, {}, [], true];

for (const [name, fn] of implementations) {
  test(`${name}: correct on positive, zero, and negative integers`, () => {
    for (const { n, expected } of correctnessCases) {
      assert.equal(fn(n), expected, `failed at n=${n}`);
    }
  });

  test(`${name}: throws TypeError on non-integer input`, () => {
    for (const bad of invalidInputs) {
      assert.throws(() => fn(bad), TypeError, `should throw for ${String(bad)}`);
    }
  });
}

// JavaScript distinguishes -0 from +0 for some operations (Object.is, 1/-0).
// Number.isInteger(-0) is true, so -0 must follow the n=0 path and return +0
// (not -0) — pinning this stops a future "optimization" from drifting.
test('all implementations return +0 (not -0) for input -0', () => {
  for (const [name, fn] of implementations) {
    const result = fn(-0);
    assert.equal(result, 0, `${name}(-0) should equal 0`);
    assert.ok(Object.is(result, 0), `${name}(-0) should be +0, not -0`);
  }
});

// The most important test: cross-implementation agreement. If A, B, and C
// ever diverge on the same input, the contract has been broken — which is
// exactly the failure mode that lets candidates ship "three working snippets"
// that aren't actually three implementations of the same function.
test('all three implementations return identical values on the same inputs', () => {
  // Cap at 5000 because Approach C is bounded by V8's default stack (~9k
  // frames). The documented-limit test below covers behavior past that point.
  const inputs = [-5000, -1000, -100, -7, -1, 0, 1, 7, 100, 1000, 5000];
  for (const n of inputs) {
    const a = sum_to_n_a(n);
    const b = sum_to_n_b(n);
    const c = sum_to_n_c(n);
    assert.equal(a, b, `disagreement at n=${n}: a=${a} vs b=${b}`);
    assert.equal(b, c, `disagreement at n=${n}: b=${b} vs c=${c}`);
  }
});

// Precision check on Approach B. Uses BigInt (locally, just as a
// ground-truth reference) so the assertion does not depend on the very
// float arithmetic we are testing. At n = 1e8, the intermediate k*(k+1) is
// ~1e16 — past MAX_SAFE_INTEGER but still an exactly-representable even
// float in [2^53, 2^54], so the result is exact.
//
// SPEC_MAX_N is derived from Number.MAX_SAFE_INTEGER, not hardcoded:
// solve k(k+1)/2 ≤ MAX_SAFE_INTEGER for k → k ≤ (√(8·MAX + 1) − 1)/2.
// Reviewing reader can re-derive it from spec without trusting a constant.
const SPEC_MAX_N = Math.floor((Math.sqrt(8 * Number.MAX_SAFE_INTEGER + 1) - 1) / 2);

test('sum_to_n_b is exact across boundary cases (BigInt ground truth)', () => {
  for (const n of [100_000_000, SPEC_MAX_N - 1, SPEC_MAX_N]) {
    const groundTruth = Number((BigInt(n) * BigInt(n + 1)) / 2n);
    const result = sum_to_n_b(n);
    assert.ok(Number.isSafeInteger(result), `result not a safe integer at n=${n}`);
    assert.equal(result, groundTruth, `mismatch at n=${n}`);
  }
});

// Document the recursion limit explicitly rather than hide it. If V8's
// default stack ever grows large enough to swallow this, the test will
// fail loudly and we update the README instead of silently shipping a
// broken contract.
test('sum_to_n_c throws RangeError on deep recursion (documented limit)', () => {
  assert.throws(() => sum_to_n_c(100_000), RangeError);
});
