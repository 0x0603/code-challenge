# FlowSwap — Compare, Route, Trust

A currency swap form that does more than the brief asked for: it compares the
trade across four mock DEXes, shows where the chosen route sits between worst
and best, tracks how the rate has moved since the user opened the pair, and
puts a 15-second countdown on the quote so the displayed amount never lies
about being stale.

> **Why "Compare, Route, Trust"** — these are the three product angles the
> form is designed around. The brief asks for "a swap form"; the interesting
> design question is *what does a user actually need to feel good about
> sending money*. Comparison gives them an alternative; routing gives them
> a choice; trust comes from making both of those legible.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # type-check + production bundle
pnpm test         # 30 unit tests
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint flat-config, no warnings allowed
```

Node ≥ 20. Uses pnpm but `npm install && npm run dev` works too.

## Walkthrough

### 1. Editable form, derived receive

The pay amount is the source of truth. As the user types, the receive
amount is computed from the active route's effective rate, USD values
update on both sides, and a 2-way binding allows typing into the receive
field as well. Direction flip swaps both the symbols *and* the amounts in
one motion.

### 2. Multi-DEX route comparison

Four DEX archetypes branded with the real-world names users recognize.
The fee + slippage values are *not* the real venue parameters — they
are tuned so the ranking shifts with trade size, which is the point of
comparing.

| DEX     | Fee   | Slippage shape            | Wins when    |
|---------|-------|----------------------------|--------------|
| Uniswap | 0.30% | square-root in trade size  | rarely       |
| dYdX    | 0.05% | linear in trade size       | small trades |
| Curve   | 0.20% | flat 0.08%                 | large trades |
| 1inch   | 0.10% | flat 0.12%                 | mid-size     |

A pinned test (`routes.test.ts`) verifies dYdX wins at $10 trades but
loses at $100k trades, so a future tweak doesn't accidentally make all
routes look identical.

Click any row to override the auto-best with a manual pick; the rate
preview reads "via X (manual)" in amber so the cost of the override is
always visible.

### 3. Deal quality at a glance

Three angles, one card:

- **% of best** — a horizontal bar showing where the active route sits
  between worst and best output.
- **Saved vs worst** — token amount + USD value the user is keeping vs
  the worst available route.
- **Under spot** — fractional loss vs the theoretical mid-rate
  (= fees + slippage cost).
- **Since you opened** — how the spot rate has moved this session,
  recorded once on first view and held in `sessionStorage`.

### 4. Quote lifecycle

A 15s TTL countdown drains around the Confirm button, shifting to amber
in the last quarter. On expire the price feed is invalidated through
TanStack Query, so the displayed amounts update naturally — no per-component
plumbing.

Confirm submits via a small reducer:
`idle → confirming → success | error`. Mocked with a 1.5s latency and a
5% failure rate so the error path is reachable in demos. The form
fieldset is `disabled` during confirming so inputs can't change mid-flight.

### 5. Theme + accessibility

- Three-mode theme controller (Light / Dark / System) — System is the
  default and tracks the OS preference automatically.
- Keyboard navigation in TokenSelect (Arrow / Enter / Esc).
- Focus trap inside Modal via a small custom `useFocusTrap` hook.
- All color tokens live as CSS variables so dark mode is one block of
  overrides, not a fork.

## Architecture

Feature-sliced layout (FSD-flavored, lightly applied):

```
src/
├── app/             entry, providers (TanStack Query), global CSS + tokens
├── shared/
│   ├── ui/          primitive components (Button, Input, Modal, ThemeToggle)
│   ├── hooks/       useEscape, useScrollLock, useFocusTrap, useLocalStorage,
│   │                useTheme — small, single-concern, reusable beyond this app
│   └── lib/         cn (clsx + tailwind-merge)
├── entities/
│   └── token/       wire schema (zod) + API client + price hook + TokenIcon
└── features/
    └── swap/
        ├── api/             ─
        ├── lib/             pure helpers + react hooks (one concern each)
        │   ├── routes.ts            DEX profiles + computeRoutes()
        │   ├── deal-quality.ts      computeDealQuality()
        │   ├── exchange-rate.ts     useExchangeRate()
        │   ├── parse-amount.ts      sanitize/parse/stringify
        │   ├── use-routes.ts        memoized join of computeRoutes + price feed
        │   ├── use-swap-binding.ts  pay ↔ receive cross-update
        │   ├── use-quote-countdown  15s TTL + onExpire callback
        │   ├── use-quote-refresh    TanStack Query invalidation
        │   ├── use-rate-history     sessionStorage baseline tracking
        │   ├── use-recent-tokens    localStorage MRU list
        │   └── use-swap-submission  idle/confirming/success/error reducer
        ├── model/           types + zod validation
        └── ui/              SwapForm composed from the hooks + UI primitives
```

The point of the layout is not religion about FSD — it's that every file
has one reason to change. Pure compute (`routes.ts`, `deal-quality.ts`)
is testable without React. Hooks (`use-*.ts`) own one concern each.
`SwapForm` is composition + layout, not business logic.

### Stack rationale (the short version)

- **Vite + React 18 + TypeScript strict** — fast HMR, cheap to ship
- **Tailwind CSS** — utility-driven; design tokens via CSS variables
  so dark mode is one overrides block
- **TanStack Query** — single source of truth for prices, refetched by
  the countdown without per-component plumbing
- **React Hook Form + Zod** — form state without re-render storms;
  validation deferred to submit (so partial input like `"12."` doesn't
  flash an error)
- **Framer Motion** — countdown ring drain, route-row stagger, modal
  enter/exit
- **Vitest + Testing Library** — pure functions covered with unit tests
  (parse-amount, routes ranking, deal quality)

The longer "why" (and what we considered and rejected) is in
[`DECISIONS.md`](./DECISIONS.md).

## Things I'd do next

In approximate order of value:

1. **Real wallet abstraction.** Today the balance is mocked
   (`mockBalance(symbol, priceUsd)`). The real swap needs a wallet
   provider (`wagmi` for EVM, `@solana/wallet-adapter` for Solana, etc.)
   with separate chains, balance hooks, and a transaction signer.
2. **Server-side quote API.** The four DEX profiles are math, not data.
   The next step is a `/quote?from=X&to=Y&amount=N` endpoint per venue
   (or one aggregator endpoint) that the client fetches; cached with
   TanStack Query just like the prices feed today.
3. **Real-time prices.** The `prices.json` snapshot is dated
   2023-08-29; a production system needs WebSocket or SSE so the
   countdown can refresh in-place without an HTTP round-trip.
4. **Token list at scale.** 32 tokens fits in a flat list; 1000+ tokens
   need virtualization (`@tanstack/react-virtual`) and a search index
   (fuse.js). The TokenSelect modal already has the keyboard nav; the
   list itself is the only thing to swap.
5. **Slippage tolerance + min-received.** Pro DeFi forms let users set
   slippage tolerance (0.1% / 0.5% / custom). The current "best route"
   logic always commits to the best output without showing min-received
   under user-set slippage — easy to add since the route math is already
   pure.
6. **Test coverage for the React side.** The pure helpers are tested;
   `SwapForm` and `RouteCompare` deserve interaction tests via Testing
   Library. The skeleton (Vitest + jsdom + jest-dom) is wired but I
   prioritized pure-logic coverage for the timebox.
7. **Telemetry.** A real form should emit `swap_quote_viewed`,
   `swap_route_overridden`, `swap_confirmed`, `swap_error` so product
   can see which DEXes win in practice and where users hit the manual
   override.
