/**
 * Code Challenge — Problem 1: Three ways to sum to n
 *
 * Behavior contract (all three implementations honor this identically):
 *   - n must be a finite integer; otherwise TypeError.
 *   - n  >  0  →  1 + 2 + ... + n
 *   - n === 0  →  0
 *   - n  <  0  →  n + (n+1) + ... + (-1)        (= -sum_to_n(|n|))
 *
 * The spec assumes the *result* fits in Number.MAX_SAFE_INTEGER, so the
 * functions trust that contract on the caller side. The contract on this
 * side — that all three implementations return the same value for the same
 * input — is enforced by sum-to-n.test.js.
 *
 * See README.md for the rationale behind each approach and the trade-offs
 * that decide which one ships.
 */

const assertInteger = (n) => {
  if (!Number.isInteger(n)) {
    throw new TypeError(`sum_to_n expects a finite integer, got ${String(n)}`);
  }
};

// Approach A — iterative. O(|n|) time, O(1) space. Fallback baseline.
//
// Boring-correct by inspection: no intermediate overflow, no stack concern,
// no IEEE 754 reasoning required. Ship this when Approach B's overflow
// argument needs more review than the team has budget for.
var sum_to_n_a = function (n) {
  assertInteger(n);
  const sign = n < 0 ? -1 : 1;
  const k = Math.abs(n);
  let sum = 0;
  for (let i = 1; i <= k; i++) sum += i;
  return sign * sum;
};

// Approach B — closed-form (Gauss). O(1) time, O(1) space. Ship this.
//
// Under the spec's assumption (result < Number.MAX_SAFE_INTEGER), the
// naive (k * (k + 1)) / 2 is exact in IEEE 754:
//   - k*(k+1) is always even (product of consecutive integers).
//   - R < 2^53 ⇒ k*(k+1) = 2R < 2^54.
//   - In [2^53, 2^54) every even integer is exactly representable.
//   - Division by 2 is a one-bit exponent shift, also exact.
//
// `(k/2)*(k+1)` and the parity branch are equivalent in correctness;
// they trade one IEEE 754 fact for another without reducing real risk.
// See README "intermediate overflow concern" for empirical verification.
var sum_to_n_b = function (n) {
  assertInteger(n);
  const k = Math.abs(n);
  const total = (k * (k + 1)) / 2;
  return n < 0 ? -total : total;
};

// Approach C — recursion. O(|n|) time, O(|n|) stack. Illustrative only —
// V8's default stack caps it around |n| = 10k. Pinned by a test in
// sum-to-n.test.js so the limit is part of the contract, not folklore.
//
// Included because the recurrence sum(n) = n + sum(n-1) is the clearest
// statement of the problem. JavaScript does not guarantee TCO, so a
// tail-recursive form still grows the stack; a manual trampoline would
// fix that, but at that point the code is a loop in costume and
// Approach A says the same thing more directly.
var sum_to_n_c = function (n) {
  assertInteger(n);
  if (n === 0) return 0;
  if (n < 0) return -sum_to_n_c(-n);
  return n + sum_to_n_c(n - 1);
};

if (typeof module !== 'undefined') {
  module.exports = { sum_to_n_a, sum_to_n_b, sum_to_n_c };
}
