# 99TechSwap

> A swap form that takes the question seriously: **what does a user need to feel
> good about sending money?**

Most swap UIs answer "how do I send tokens"; the more interesting answer is
"how does the form earn the user's trust to press Confirm". 99TechSwap is
shaped around that second question — a two-column layout where the left
side captures intent and the right side answers *which DEX gives me the
best deal right now, and how long is that quote good for*.

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

| Main swap form | Choose best router |
| :---: | :---: |
| <img src="image.png" width="840" alt="Main view" /> | <img src="image-1.png" width="840" alt="Confirmed state" /> |

## Product thinking

Each section below is framed as **the friction we believe a real user
hits → the hypothesis we tested → what we'd watch in production**.
Implementation is in the architecture section; this one is about why
the things exist.

### Markets panel turns the empty state into a conversion surface

**Friction.** A swap form with no amount entered is dead screen
real-estate. The user lands on the page with nothing happening, no
reason to engage, and a high chance of bouncing.

**Hypothesis.** If the right side of the form *always* surfaces
something interesting — stablecoin yields, trending assets — the user
finds a reason to start. Picking a token lifts it into the receive
slot, so the cognitive distance from "I'm bored" to "I'm typing an
amount" is one click.

**What we'd watch.** *Empty-state CTR* (clicks on a market token) and
the *form-fill rate* (% of sessions that put a number in the pay
input).

### Live multi-DEX comparison earns the "good deal" feeling

**Friction.** A single rate on the screen makes the user wonder *am I
being ripped off?* In crypto especially, that doubt is the gap where
sessions die. Open another tab, check Uniswap, never come back.

**Hypothesis.** Showing four prices side by side, with the best one
highlighted and the rest sorted, *proves* the form went looking for the
user. It reframes the moment from "do I trust this number?" to "this
is the best available — and I can see why."

**What we'd watch.** *Confirm-rate after the routes panel renders*,
and the share of confirmed swaps that took the auto-best vs a manual
pick. The fee/slippage curves are tuned so the ranking actually shifts
with trade size (a pinned test verifies dYdX wins at $10 but loses at
$100k); a single static answer would not survive that test, and the
panel would feel like decoration.

### Quote countdown sets honest expectations

**Friction.** Stale prices are a trust-killer. User signs at one
number, settles at another, blames the form.

**Hypothesis.** A visible MM:SS countdown turns staleness from a
hidden risk into an explicit promise: "this number is good for ~12
more seconds." Auto-refresh on expiry means the user can stop second-
guessing — *if I see a number, it's fresh enough to act on*.

**What we'd watch.** *Slippage complaints / support tickets per swap*,
and *time-to-confirm after the panel appears*. The amber tint in the
last 5s is a deliberate "act now" cue without being alarmist.

### Live insufficient-balance feedback removes the failed click

**Friction.** Typing past your balance and only finding out at Confirm
is a form-abandonment classic. The user feels punished for trying.

**Hypothesis.** The moment the input exceeds the balance, the row
border turns red, the balance label weighs up, and the Confirm button
copy switches to "Insufficient balance". The user sees the constraint
*as they type* — the failed click never happens. Max becomes the
discovery: "oh, I can just use the whole thing."

**What we'd watch.** *Confirm-click failure rate* (should drop to ~0)
and *Max-button usage* (a positive signal that users feel safe topping
out).

### Receive editable serves the "exactly Y" trader

**Friction.** A common intent shape is *I need exactly 5 ETH for this
purchase, what does it cost me?* Read-only receive blocks that flow
entirely.

**Hypothesis.** Two-way binding makes the form work for both intent
shapes (send X / receive Y). The drift fix (a `lastEditedRef` that
freezes the side the user is currently typing into) is the price of
admission — without it, typing 5 in receive could echo back as
4.989006 within one render, which feels like the form is fighting the
user.

**What we'd watch.** *Share of swaps initiated from the receive
field*. If it's near zero we lose nothing keeping the field live; if
it's non-trivial we've served users a flow many DEXes don't.

### Subscript notation makes tiny prices readable

**Friction.** "0.00000245322" looks like a bug. The user has to count
zeros, and the visual weight of the number is way out of proportion to
its meaning.

**Hypothesis.** Uniswap's subscript pattern — `0.0₅2453` — collapses
the leading zeros into a count and makes the magnitude readable at a
glance. The user reads "five-zero magnitude, ~2.5e-6" the same way
they'd read a normal price.

**What we'd watch.** *Bounce rate on long-tail pairs* (high-magnitude
gaps like SWTH ↔ ETH where readable subscript helps most), and
qualitative: do users still flag the number as "broken"?

### Modal success closes the loop

**Friction.** Inline success cards under the Confirm button were too
easy to miss. A user clicks Confirm, sees no clear feedback, clicks
again. In production that's a duplicate transaction — in the demo
it's just confusing.

**Hypothesis.** A centered modal with a backdrop blur, an animated
check, a clean sent → received receipt, and a single full-width Done
button forces *explicit acknowledgement*. The user can't accidentally
move on. Click-to-copy on the tx id signals "this is real, here's
your proof".

**What we'd watch.** *Duplicate-Confirm rate* (should be ~0) and
*post-success retention* (do users come back to swap again that
session, or do they bounce after a swap?). For an action that moves
real money, ceremony around success is worth the extra modal.

### Theme + a11y reduce environmental friction

**Friction.** A user on a dark OS hitting a hard-light page bounces.
Keyboard-only users hitting a mouse-only modal bounce.

**Hypothesis.** System-default theme + manual override + focus traps
+ Esc-to-close + Arrow/Enter list navigation are the table stakes
that *don't* show up in conversion until you're missing them.

**What we'd watch.** *Bounce rate by `prefers-color-scheme`*, and
keyboard-event share on the form (a sanity check that nothing breaks
without a mouse).

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
mocked, not aggregated from the real venues. A handful of UI patterns
and naming conventions are informed by surveying existing DEX
interfaces — the layout, copy, and implementation are mine.
