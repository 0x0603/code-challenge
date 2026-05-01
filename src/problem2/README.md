# FlowSwap

> A swap form that takes the question seriously: **what does a user need to feel
> good about sending money?**

Most swap UIs answer "how do I send tokens"; the more interesting answer is
"how does the form earn the user's trust to press Confirm". FlowSwap is
shaped around that second question — a Ledger-style two-column layout where
the left side captures intent and the right side answers *which DEX gives me
the best deal right now, and how long is that quote good for*.

The brief is `src/problem2` from the
[99tech / Switcheo code challenge](https://github.com/99techteam/code-challenge).

---

## Run

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # tsc + vite build
pnpm test         # 39 unit tests
pnpm typecheck    # tsc -b --noEmit
pnpm lint         # eslint flat-config, --max-warnings 0
```

Node ≥ 20. `npm` works too — pnpm is just what I used.

---

## What it does

### 1. The form (left column)

Two rows, both editable. Typing in **You pay** computes the receive amount
from the active route's effective rate. Typing in **You receive** inverts the
math the same way. The direction-flip button between the two swaps both the
symbols *and* the amounts in one motion, so you don't lose your number when
you change your mind.

Live affordances on the pay row:

- **Balance label** flips to a soft red and the input border turns negative
  the moment the entered amount exceeds the mock balance — no waiting until
  Confirm to find out you're over.
- **Max** writes the full balance into the input.
- **USD subtitle** under each amount so the trade size is legible at a glance.
- **Insufficient balance** state on Confirm: button copy changes, click is
  blocked, and the countdown ring hides because refreshing won't fix the gap.

### 2. The quotes panel (right column)

Two modes, the same panel:

**Empty (no amount yet)** — instead of a placeholder, the panel shows
**Stablecoins** with mock APYs and **Trending Assets** with mock 24h deltas,
sorted descending. Clicking any token lifts it into the receive slot. The
data is deterministically derived from each symbol's hash so reload doesn't
shuffle it; the disclaimer beneath the list says it's mocked.

**Active (amount entered)** — live route comparison across four mock DEXes:

| DEX     | Brand     | Fee   | Slippage shape            | Wins when    |
|---------|-----------|-------|----------------------------|--------------|
| Uniswap | pink      | 0.30% | square-root in trade size  | rarely       |
| dYdX    | violet    | 0.05% | linear in trade size       | small trades |
| Curve   | red       | 0.20% | flat 0.08%                 | large trades |
| 1inch   | navy      | 0.10% | flat 0.12%                 | mid-size     |

Each row is a clickable card with the venue's brand logo (real images, with
a colored letter-square fallback), the network fee in USD, and the receive
amount + USD value. The top route gets its own **Best quote** callout; the
rest sit under **More quotes**.

A live MM:SS countdown in the panel header tells the user how long the
displayed numbers are valid; when it hits zero, the price feed is
invalidated through TanStack Query and the routes recompute. Last 5
seconds of each cycle the countdown shifts to amber so the user has time
to act before the refresh.

The fee + slippage values are *not* the real venue parameters — they're
tuned so the **ranking actually shifts** with trade size (a pinned test
verifies dYdX wins at $10 trades but loses at $100k). The point of the
panel is that the same swap is not a single answer.

### 3. The Confirm flow

Clicking Confirm enters a **state machine**:
`idle → confirming → success | error`. The form fieldset is `disabled`
during confirming so inputs can't change mid-flight. A 1.5s mock latency
fronts the result, and a 5% mock failure rate keeps the error path
reachable in demos.

`success` and `error` open a centered Modal with backdrop blur and a focus
trap. Inline confirmation cards turned out too easy to miss — for an
action that, in production, moves real money, the modal forces explicit
acknowledgement. The success modal hosts an animated check, a
sent → received receipt with USD subtitles, the route credit ("Routed via
Curve"), a click-to-copy transaction id, and a single full-width **Done**
button so the next step is unmissable.

### 4. Theme + a11y

- **Light / Dark / System** toggle in the header. System is the default and
  tracks the OS preference automatically.
- **Keyboard nav** in TokenSelect (Arrow / Enter / Esc) plus auto-focus on
  open and focus restore on close.
- **Focus trap** inside Modal via a custom `useFocusTrap` hook.
- All color tokens live as CSS variables so dark mode is one block of
  overrides, not a fork.

---

## Design choices worth defending

A few decisions that go against the obvious default:

1. **Receive amount is editable, not display-only.** Two-way binding
   carries a feedback-loop trap (typing 5 in receive can drift to
   4.989006 within one render). I fixed it with a single ref tracking
   which side the user last edited; the rate-change effect now
   recomputes only the *other* side. The "I want to receive exactly Y"
   use case stays available.

2. **Number formatting follows Uniswap's subscript pattern.** Sub-0.0001
   amounts collapse leading zeros into a Unicode subscript count, so
   `0.00000245322` reads as `0.0₅2453` — the magnitude is parseable at a
   glance instead of a string of zeros to count. Receive input is also
   capped at 9 fractional characters so it never grows wider than the
   input element can comfortably show.

3. **Markets sidebar instead of an empty placeholder.** A swap form with
   no amount entered is dead screen real-estate. Stablecoin yields and
   trending asset deltas give the user something to anchor on and a
   one-click path to picking a destination token.

4. **Real brand logos for mocked venues.** Letter squares feel
   placeholder-y; the four DEX names users actually recognize carry
   their own visual identity that no abstract icon would. The data is
   still mocked — the README and DECISIONS.md say so explicitly.

5. **Hooks + RHF, no global store.** The swap form is one screen.
   Zustand / Redux / Jotai pay rent in indirection that's only worth it
   when state needs to be read from many distant subtrees. Custom hooks
   let each concern (binding, countdown, submission) own its own state
   without exporting it to the world.

The full list with alternatives considered and "what would change my
mind" notes is in **[`DECISIONS.md`](./DECISIONS.md)**.

---

## Architecture

Feature-sliced layout (FSD-flavored, lightly applied):

```
src/
├── app/             entry, providers (TanStack Query), global CSS + tokens
├── shared/
│   ├── ui/          Button, Input, Modal, ThemeToggle (primitives, no
│   │                feature knowledge)
│   ├── hooks/       useEscape, useScrollLock, useFocusTrap,
│   │                useLocalStorage, useTheme — small, single-concern,
│   │                reusable beyond this app
│   └── lib/         cn (clsx + tailwind-merge)
├── entities/
│   └── token/       wire schema (zod), API client, useTokens query hook,
│                    TokenIcon, format helpers (incl. subscript notation)
└── features/
    └── swap/
        ├── lib/
        │   ├── routes.ts            DEX profiles + computeRoutes() (pure)
        │   ├── exchange-rate.ts     useExchangeRate()
        │   ├── parse-amount.ts      sanitize / parse / stringify (pure)
        │   ├── use-routes.ts        memoized join of computeRoutes + feed
        │   ├── use-swap-binding.ts  pay ↔ receive cross-update without drift
        │   ├── use-quote-countdown  15s TTL + onExpire callback
        │   ├── use-quote-refresh    TanStack Query invalidation
        │   ├── use-recent-tokens    localStorage MRU list
        │   ├── use-swap-submission  idle/confirming/success/error reducer
        │   └── market-data.ts       mock APY + 24h change + trending sort
        ├── model/   types + zod validation
        └── ui/      SwapForm, SwapRow, AmountInput, TokenSelect,
                     RouteCompare, MarketSidebar, SubmissionStatus,
                     CountdownRing, SwapDirectionButton
```

The point isn't religion about FSD — it's that every file has one reason
to change. Pure compute (`routes.ts`, `parse-amount.ts`, `market-data.ts`,
`token/lib/format.ts`) is testable without React. Hooks (`use-*.ts`) own
one concern each. `SwapForm` is composition + layout, not business logic.

### Stack rationale

- **Vite + React 18 + TypeScript strict** — fast HMR; ten TS strictness
  flags so the type system actually catches things.
- **Tailwind CSS** — utility-driven; design tokens via CSS variables so
  dark mode is one overrides block.
- **TanStack Query** — single source of truth for prices, refetched by
  the countdown hook without per-component plumbing.
- **React Hook Form + Zod** — form state without re-render storms;
  validation is deferred to submit so partial input like `"12."` doesn't
  flash an error.
- **Framer Motion** — countdown ring drain, route-row stagger, modal
  enter/exit, modest spring on Confirm.
- **Vitest + Testing Library** — 39 unit tests covering parse-amount
  (sanitize/parse/stringify, scientific-notation guard, the 9-char cap),
  amount formatting (incl. subscript notation), routes ranking (incl.
  the small-vs-large flip), and the prices-feed dedupe.

---

## What changes at scale

Roughly in order of value if this graduated to production:

1. **Real wallet abstraction.** Today the balance is mocked
   (`mockBalance(symbol, priceUsd)`). The real swap needs a wallet
   provider — `wagmi` for EVM, `@solana/wallet-adapter` for Solana,
   Switcheo's own SDK for Carbon — with separate chains, balance hooks,
   and a transaction signer. The form contract (`fromSymbol`,
   `toSymbol`, `payAmount`, `receiveAmount`) doesn't change; only the
   `useToken` and submission layers do.

2. **Server-side quote API.** The four DEX profiles are math, not data.
   The next step is a `/quote?from=X&to=Y&amount=N` endpoint per venue
   (or one aggregator endpoint) that the client fetches, cached with
   TanStack Query the same way the prices feed already is. The UI
   doesn't change — `useRoutes` is the seam, and it would swap from
   `computeRoutes` (pure, sync) to `useQueries` (async, with parallel
   fetches per venue) over the wire.

3. **Real-time prices.** The `prices.json` snapshot is dated 2023-08-29;
   a production system needs WebSocket or SSE so the countdown can
   refresh in-place without an HTTP round-trip. The `useQuoteRefresh`
   hook becomes a no-op (the WebSocket pushes already), and the
   countdown ring becomes purely visual feedback for the user that
   prices update continuously.

4. **Token list at scale.** 32 tokens fits in a flat list; 1000+ tokens
   need virtualization (`@tanstack/react-virtual`) and a search index
   (fuse.js for fuzzy match, ranking by liquidity / market cap).
   TokenSelect's keyboard nav is already wired; only the list rendering
   changes.

5. **Slippage tolerance + min-received.** Pro DeFi forms let users set
   slippage tolerance (0.1% / 0.5% / custom). The current "best route"
   logic always commits to the best output without showing min-received
   under user-set slippage — easy to add since the route math is already
   pure: `minReceive = bestReceive × (1 − tolerance)`.

6. **Real DEX integrations.** The mock DEXes share an interface
   (`DexProfile.slippage(amountUsd) → number`). A real integration
   layer would expose the same shape — `getQuote(amountIn, from, to)
   → Promise<QuoteRoute>` — letting RouteCompare keep its current shape.

7. **Test coverage on the React side.** The pure helpers are tested;
   `SwapForm`, `RouteCompare`, and `MarketSidebar` deserve interaction
   tests via Testing Library. The skeleton (Vitest + jsdom +
   `@testing-library/jest-dom`) is wired but I prioritized pure-logic
   coverage for the timebox. End-to-end via Playwright for the Confirm
   flow would close the loop.

8. **Performance budget.** Current bundle is 434 KB / 136 KB gzip
   (Vite production build). At scale the wins are: code-splitting the
   submission modal and the TokenSelect (both lazy-loadable), swapping
   Framer Motion's `animate()` for Web Animations API on the countdown
   (drops one motion-value subscription per tick), and migrating the
   token icons to a self-hosted CDN with `<link rel="preload">` for the
   defaults (SWTH/ETH/USDC).

9. **Observability.** A real form should emit `swap_quote_viewed`,
   `swap_route_overridden`, `swap_confirmed`, `swap_error` to a product
   analytics layer (Amplitude / Mixpanel / Segment), so product can see
   which DEXes win in practice and where users hit the manual route
   override. The `useSwapSubmission` reducer is the natural emission
   point.

10. **Multi-chain.** The brief is single-chain; the real swap is often
    cross-chain (bridge → swap → bridge). The route engine extends
    naturally — each "DEX" becomes a `(chain, venue)` pair, with the
    aggregator route possibly spanning chains. The UI would gain a
    chain selector under each token chip.

---

## Disclaimer

Everything backend-shaped is mocked: prices come from a static JSON,
balances are derived from a symbol hash, "DEX" fees and slippage are
hard-coded curves, transaction submission is a `setTimeout` with a 5%
random failure. The brief explicitly allows this; the README and the
success modal both call it out so reviewers don't read the UI as a live
integration.

Brand logos (Uniswap, dYdX, Curve, 1inch) are used to make the demo
recognizable. They are not implied endorsements; the underlying data is
mocked, not aggregated from the real venues.
