# Problem 3 — Code Review & Refactor

Refactored code: [`index.tsx`](./index.tsx). Pure-helper tests: [`index.test.ts`](./index.test.ts).

## TL;DR

**Critical:** runtime crash (`lhsPriority`), inverted filter, missing `blockchain` field on the interface.
**Secondary:** comparator returns `undefined`, `NaN` rendering, React anti-patterns (`key={index}`, false memo deps, untyped helper, unused `children`).
The refactor is small and localised — the type system carries most of the weight once `Blockchain` becomes a closed union.

## What I would fix first

1. Runtime crash (`lhsPriority`) — the page is broken right now.
2. Filter logic — currently hides every positive balance.
3. `blockchain` on `WalletBalance` — without it, balances silently drop.
4. Comparator tie-break — deterministic sort across renders.

Order: correctness → user-visible behaviour → hygiene → perf.

## Tier 0 — Won't compile / crashes at runtime

1. **`lhsPriority` is undefined.** `ReferenceError` on the first filter call. Fix: rename to `balancePriority`, or drop the priority guard entirely — §14 makes it redundant.
2. **`blockchain` missing from `WalletBalance`.** Read in `filter`/`sort`, never declared. Fix: add `blockchain: Blockchain` (§14).
3. **Sort comparator returns `undefined` when priorities are equal.** Fix: tie-break with `a.currency.localeCompare(b.currency)` for deterministic order.

## Tier 1 — Compiles, ships wrong data

4. **Filter inverted.** Keeps `amount <= 0`, drops positive. Fix: `b.amount > 0`.
5. **`formattedBalances` dead, `rows` lies about its element type.** Cast to `FormattedWalletBalance` while iterating `WalletBalance[]` → `balance.formatted` is `undefined` at runtime. Fix: single memoised pipeline producing `FormattedWalletBalance[]`.
6. **`prices[c] * amount` produces `NaN`.** Renders literal `"NaN"` to the DOM. Fix: `computeUsdValue` returns `number | null`; row renders em-dash. `null`, not `0`, because `0` is a legal USD value.
7. **`key={index}` on a sorted list.** React reconciles by position when sort changes — focus/state mis-attributed. Fix: composite key `${blockchain}:${currency}`. `currency` alone collides for USDC on Ethereum vs Arbitrum.

## Tier 2 — Performance / React hygiene

8. **`prices` in memo deps but never read inside.** Fix: move USD calc into the memo so deps match body.
9. **`getPriority` re-created per render, typed `any`.** Fix: hoist as a `Record<Blockchain, number>` lookup. With closed `Blockchain`, the function is total — no fallback branch.
10. **Comparator verbose and tie-blind.** Fix: `getPriority(b) - getPriority(a) || a.currency.localeCompare(b.currency)`.
11. **`interface Props extends BoxProps {}` (empty extension).** Fix: `type Props = HTMLAttributes<HTMLDivElement>`.
12. **`children` destructured then discarded.** Fix: render `{children}`.
13. **`amount.toFixed()` defaults to 0 decimals — `0.123 ETH` becomes `"0"`.** Fix: a module-level `Intl.NumberFormat({ minimumFractionDigits: 2, maximumFractionDigits: 6 })`, constructed once.
14. **`blockchain: any` — the domain has no shape.** Typos like `'Etherum'` fall through to `default` silently and the balance vanishes from the UI. Fix:
    ```ts
    type Blockchain = 'Osmosis' | 'Ethereum' | 'Arbitrum' | 'Zilliqa' | 'Neo';
    const PRIORITY_BY_CHAIN: Readonly<Record<Blockchain, number>> = { /* ... */ };
    ```
    Closed by design — typos become compile errors, the lookup is exhaustive, `getPriority` is total. Widens to `string` only when (and if) the chain catalogue moves to runtime data.

## Tier 3 — Out of scope

- Loading / error / empty UI — hook contract change to `AsyncResult<T>`.
- A11y — proper audit, not a 2-line `role` patch.
- Decimal precision for transaction paths — swap `computeUsdValue` for a `bigint`-based lib, same signature.

## Improvements & scale (later)

Each ships only when the trigger fires:

1. **Loading / error UI** — next PR. ~2h. Hook contract change; align with hook owner first.
2. **Memoise `WalletRow` + stable per-balance refs** — when prices update > 1 Hz. ~3h. The pipeline allocates fresh objects each render, defeating `React.memo` — both fixes pay off only together.
3. **List virtualisation** — when P95 > 100 balances or commit > 8 ms. ~4h. Pure pipeline unchanged. Caveat: breaks Cmd+F page search.

## Tests

Eleven cases covering the four pure helpers in [`index.test.ts`](./index.test.ts). Component tests are out of scope: correctness invariants live in the pure layer, and rendering needs a renderer setup bigger than the refactor.
