# Problem 1 — Three ways to sum to `n`

Three implementations of `sum_to_n(n)`, plus a test suite and a micro-benchmark. The interesting part is *not* "did you produce three working snippets" — it is the contract they all share, the IEEE 754 reasoning behind the shipped one, and the trade-offs that decide which one ships.

## Files

| File | Purpose |
|---|---|
| `sum-to-n.js` | The three implementations. |
| `sum-to-n.test.js` | `node:test` suite — correctness, contract consistency, documented limits. |
| `benchmark.js` | Single-shot timing across input sizes. |

## Run

```bash
# Tests (Node ≥ 18, no dependencies)
node --test sum-to-n.test.js

# Benchmark
node benchmark.js
```

## Behavior contract

The problem says `n` is "any integer" and is silent on negatives. The contract below is the most defendable interpretation, and all three implementations honor it identically.

| Input | Returns |
|---|---|
| Positive integer `n` | `1 + 2 + … + n` |
| `0` (or `-0`) | `+0` |
| Negative integer `n` | `n + (n+1) + … + (-1)`  (mirror of the positive case; equivalently `-sum_to_n(|n|)`) |
| Anything else (NaN, Infinity, float, string, null, …) | Throws `TypeError` |

The spec adds: *"Assuming this input will always produce a result lesser than `Number.MAX_SAFE_INTEGER`."* That assumption is a contract on the **caller**, not something this function tries to police. It is mentioned here so the boundary is explicit — see *What changes at scale* below for the answer when callers need to operate beyond it.

**Why fail-fast on bad input?** Returning `0` or `NaN` silently is a bug factory — the failure surfaces far from its cause. A `TypeError` at the boundary localizes the bug and lets the caller decide.

**Why mirror negatives instead of clamping to `0`?** The mirror is symmetric with the positive case, the closed-form formula handles it cleanly, and it keeps all three implementations algebraically the same function. Clamping silently would let A, B, and C disagree on negative inputs — see the cross-implementation agreement test for why that matters.

## The three approaches

| Approach | Time | Space | Trade-off |
|---|---|---|---|
| **A. Iterative loop** | O(\|n\|) | O(1) | Predictable, no overflow risk in any intermediate, dead simple to read. The "boring correct" baseline. |
| **B. Closed-form (Gauss)** | O(1) | O(1) | Optimal. Exact under the spec's assumption — see *intermediate overflow concern* below for the IEEE 754 reasoning. Ship this. |
| **C. Recursion** | O(\|n\|) | O(\|n\|) call stack | Makes the recurrence `sum(n) = n + sum(n−1)` explicit. Stack-overflows past ~10k on V8. Intentionally included so the limit can be discussed and tested rather than hidden. |

### Why this trio and not "loop / reduce / recursion"?

The cookie-cutter trio (loop, `Array.from(...).reduce`, recursion) is three ways to do **the same thing** — all O(n) time, two of them O(n) space. It demonstrates JavaScript syntax knowledge, not algorithmic awareness.

The trio above covers three *different* complexity classes — iterative O(n)/O(1), analytical O(1)/O(1), recursive O(n)/O(n) stack — so each implementation says something distinct about the problem.

### Approaches and variants considered

| Item | Why rejected |
|---|---|
| `Array.from({length: n}, (_, i) => i + 1).reduce((a, b) => a + b)` | O(n) time **plus** O(n) heap allocation, plus a function-call per element. Same asymptotic class as Approach A, worse constant factors. Provides no additional insight beyond the iterative approach. |
| Generator + `for…of` | Adds iterator-protocol overhead without improving asymptotic complexity or memory usage for this problem. |
| Tail-recursive `function go(n, acc)` | Proper tail calls are specified in ES6 but not implemented in V8, so this still grows the stack in practice. Looks safer than Approach C but isn't. |
| Explicit trampoline around recursion | Eliminates stack growth, but effectively reimplements iteration with additional indirection and worse readability. Approach A is shorter. |
| Memoization | No overlapping subproblems; cache hit rate is negligible unless inputs repeat. Adds memory, gains nothing. |
| `(k / 2) * (k + 1)` (variant of B's formula) | Also exact — relies on `0.5 = 2⁻¹` being representable in binary. Equivalent; adds a step without removing a real risk. |
| `k % 2 === 0 ? (k/2)*(k+1) : k*((k+1)/2)` (parity branch in B) | Defensive padding that only matters if one mistrusts IEEE 754 multiplication, which the standard defines explicitly. |
| `(n * (n + 1)) >>> 1` | Bitwise operators coerce to **32-bit signed integers**; silently wraps for `n ≥ 65536`. Strictly wrong. |

### The "intermediate overflow" concern (and why it isn't real here)

The textbook formula is `(n * (n + 1)) / 2`. A common worry is that `n * (n + 1)` is roughly `2 × result`, so for large `n` the intermediate exceeds `Number.MAX_SAFE_INTEGER`, which "would" cause precision loss before the division.

That worry is a misreading of `MAX_SAFE_INTEGER`. The constant marks the largest `N` where `N` **and** `N + 1` are both exactly representable as float. Beyond `2⁵³`, representable integers become sparser (spacing = 2 in `[2⁵³, 2⁵⁴]`, 4 in `[2⁵⁴, 2⁵⁵]`, …) but they do not vanish — many large integers are still exact. Specifically for our case:

- In `[2⁵³, 2⁵⁴]`, floats exactly represent every **even** integer (spacing = 2).
- `n * (n + 1)` is the product of two consecutive integers, so it is always **even**.
- Per spec, `result < MAX_SAFE_INTEGER`, so `n * (n + 1) = 2 × result < 2⁵⁴`.
- Therefore `n * (n + 1)` lands on an exactly-representable even float.
- Dividing by 2 is exact — one binary exponent shift, no rounding.

=> The naive `(n * (n + 1)) / 2` is exact **under the spec's assumption**. The test suite verifies this against a `BigInt` ground truth at `n = 1e8` and at the spec boundary `n = ⌊(√(8·MAX_SAFE_INTEGER + 1) − 1)/2⌋ = 134_217_727`. The boundary is computed in the test from `Number.MAX_SAFE_INTEGER`, not hardcoded, so a reviewer can re-derive it from the spec without trusting a magic number.

## Which one would I ship?

**Approach B.** The result is bounded by spec, the algorithm is O(1), the formula is exact in IEEE 754. Approach A is the fallback if defensive readability matters more than performance. Approach C is illustrative.

## What changes at scale

| Concern | Response |
|---|---|
| Inputs whose *result* would exceed `Number.MAX_SAFE_INTEGER`. | In blockchain code, BigInt is the safe default — correctness over micro-optimization, because token amounts (1 ETH = 10¹⁸ wei), gas, and cumulative balances routinely exceed `MAX_SAFE_INTEGER` and silent precision loss is unacceptable. The formula composes directly: `(BigInt(n) * BigInt(n + 1)) / 2n`. Signature becomes `bigint => bigint` — that is the real cost, not the math. |
| Many `sum_to_n` calls per second on a hot path. | Approach B is already O(1); function-call overhead dominates. Inline at the call site if the profiler points there. |
| Generalize to `sum_from_a_to_b(a, b)`. | The closed form composes cleanly: `sum_to_n(b) − sum_to_n(a − 1)`. The iterative and recursive versions need rewrites. |
| Inputs come from JSON or untrusted HTTP. | The current `assertInteger` already covers it. For TypeScript callers, narrow the parameter to a branded `Integer` type so the check happens at compile time. |
| Run in browsers, not just Node. | The implementations have no Node-specific dependencies; only the test runner does. The bottom of `sum-to-n.js` guards `module.exports` so the file is also drop-in usable in a browser bundler or `<script>` tag. |

## What the tests cover

```bash
node --test sum-to-n.test.js
```

- **Correctness** — positive, zero, and negative inputs against expected values, for each of the three implementations.
- **Input validation** — every implementation throws `TypeError` on non-integer inputs (NaN, Infinity, floats, strings, null, undefined, objects, arrays, booleans).
- **`-0` handling** — pinned with `Object.is` to ensure every implementation returns `+0`, not `-0`.
- **Cross-implementation agreement** — all three return the same value for the same input. This is the contract that matters most: it is what stops A, B, and C from drifting apart over time.
- **Precision near the safe-integer boundary** — Approach B is checked against a `BigInt` ground truth at `n = 1e8` and at the exact spec boundary, where the intermediate `n*(n+1)` exceeds `MAX_SAFE_INTEGER` but remains an exactly-representable even float.
- **Documented recursion limit** — Approach C is asserted to throw `RangeError` at `n = 100_000`, so the limit is part of the contract instead of a surprise in production.
