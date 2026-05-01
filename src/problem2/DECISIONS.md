# Architecture decisions

A standalone log of the non-obvious calls. Each entry is "decision /
why / alternatives considered / what would change my mind". This is the
ammo for "why did you build it this way" in the next round.

## 1. State shape: hooks + RHF, no global store

**Decision.** The form state lives in React Hook Form. Cross-cutting
concerns (countdown, submission machine, rate history, recent tokens)
are independent custom hooks. There is no Zustand / Redux / Jotai store.

**Why.** The swap form is *one screen*. Global stores pay rent in
indirection and re-renders; the rent is only worth it when state needs
to be read from many distant subtrees. Here the deepest consumer is
`SwapForm` itself. Custom hooks let each concern (binding, countdown,
submission) own its own state without exporting it to the world.

**Alternatives considered.**
- *Zustand store* — overkill: adds a dependency and a layer of
  indirection for a single-screen form. Useful when M9+ adds a
  transaction history page that needs to read submitted swaps.
- *Context + useReducer* — fine, but the same data flow is achievable
  with hook composition without writing a Provider.

**What would change my mind.** A second screen (history, portfolio)
that needs to read or mutate swap state out-of-band. At that point
Zustand becomes worth it.

## 2. Form values are strings, validation is deferred

**Decision.** RHF holds `payAmount` and `receiveAmount` as strings.
Zod runs only on submit. As the user types, sanitization runs (drops
letters, enforces one decimal point) but no validation happens.

**Why.** A user typing `"12."` on the way to `"12.34"` is in a valid
intermediate state. Coercing through `Number()` mid-keystroke produces
`12` (loses the dot) and validating mid-keystroke flashes "must be a
number" right before the user finishes typing. Both are sloppy UX. By
keeping the input as a string, the cursor and trailing dot are preserved.

**Alternatives considered.**
- *Numeric input element* (`<input type="number">`) — has cross-browser
  spinner UI we don't want, breaks on locale-aware decimals
  (comma vs dot), and `valueAsNumber` makes the same partial-input
  problem worse.
- *Validate on `onChange`* — surfaces errors before the user is done
  typing. Common but bad UX.

## 3. Rate binding uses the *active* route, not the mid-rate

**Decision.** The receive amount displayed on the form is computed
from the active route's `effectiveRate`, not the spot mid-rate.

**Why.** Showing the mid-rate would mislead — "you'll receive 0.0245"
when the user actually receives 0.0244 after fees and slippage. Honest
defaults matter more than mathematical purity. The mid-rate is still
shown above the routes panel as a reference point.

**Trade-off.** When the user types into the receive field, the
back-calculation uses whatever rate is active. If they change the
active route by clicking a different DEX, both fields update via the
binding's `useEffect` on rate change. This is one full render of lag
from the type → settle on the new route, but self-corrects.

**Alternatives considered.**
- *Mid-rate binding + inline disclaimer.* The number on screen is the
  ideal, with a small "you'll actually receive: ..." line below.
  Two numbers fights for the user's attention; one honest number wins.
- *Receive read-only.* Common in pro DEX UIs. Closes off "I want to
  receive exactly X" flows that some users want.

## 4. Quote countdown is wall-clock anchored

**Decision.** `useQuoteCountdown` ticks every 100ms but compares against
`Date.now()` to compute remaining time, not a counter that decrements.

**Why.** `setInterval` is throttled aggressively when the tab is
backgrounded — Chrome clamps to 1s after 5 minutes. A counter-based
timer would desync from reality. Anchoring to `Date.now()` means the
ring catches up the moment the tab becomes visible again.

**Trade-off.** A few stale ticks while the tab is backgrounded — an
expired quote may not refresh until the user comes back. Acceptable;
a backgrounded form isn't waiting on a quote.

## 5. Single Modal primitive, custom focus trap

**Decision.** I built `<Modal>` from scratch instead of pulling in
Radix Dialog or Headless UI. It composes three small a11y hooks
(`useEscape`, `useScrollLock`, `useFocusTrap`).

**Why.** The behaviors needed (Esc close, scroll lock, focus trap with
restore, portal placement) are < 100 lines. A library would add ~30kB
gzipped for one modal. The custom hooks are also reusable for any
other modal-like surface (drawer, command palette).

**Trade-off.** My focus trap doesn't handle every edge case Radix does
(no `inert` polyfill for the rest of the page, no support for
nested modals). Acceptable for one swap form; would re-evaluate if the
app grows multi-modal.

**What would change my mind.** Need for full a11y compliance (WCAG AA),
nested dialogs, or rich keyboard navigation across many surfaces.
Radix Dialog at that point.

## 6. Recent tokens in localStorage, rate history in sessionStorage

**Decision.** Two persistence layers for two different lifetimes.

- `flowswap.recent-tokens.v1` → `localStorage`. Survives sessions; a
  user returning tomorrow sees their usual pairs at the top.
- `flowswap.rate-history.{pair}.v1` → `sessionStorage`. Captured the
  first time the user opens a pair and never overwritten until the tab
  closes.

**Why.** "Since you opened" only makes sense scoped to the current
visit. Persisting across sessions would make the value misleading
("rate moved +12% since you opened" — yeah, three weeks ago).
"Recent tokens" inverts: the user benefits from the cumulative history
across visits.

**Versioned keys.** Both keys end in `.v1`. If the stored shape needs
to change, we bump the version and old data is silently abandoned
instead of crashing the page.

## 7. CSS variables for color, mapped through Tailwind

**Decision.** All colors live as `--color-*` CSS variables on `:root`
and `.dark`. Tailwind's `colors` map references them via
`rgb(var(--color-x) / <alpha-value>)` so utilities like `bg-surface/80`
work.

**Why.** Adding a new theme is one block of overrides. No `dark:`
prefixes scattered across hundreds of class lists. No JS theme
provider. The cost is one indirection (CSS var → Tailwind class), paid
once at build time.

**Alternative considered.** Hardcoded Tailwind palette + `dark:`
prefixes everywhere. Standard but tedious; every component grows two
parallel class lists, and one missed override breaks the dark theme
silently.

## 8. Mock multi-DEX engine instead of one rate

**Decision.** Four mock DEXes with intentionally different fee /
slippage curves, and a ranking that *shifts* with trade size.

**Why.** A flat "you'll receive X" answer makes a swap form look like a
calculator. Comparison is the product story — *why* did we pick this
route, *what's* the alternative, *how much* better is the chosen route?
The mock data lets the UI teach those questions without a real backend.

**Trade-off.** The math is fictional, so it has to look plausible —
hence the curves are tuned so OrderBook wins small trades (low fee)
and loses large ones (linear slippage). A pinned test pins this
ranking shift so a future tweak doesn't accidentally make all routes
look identical.

**What would change at scale.** The four functions become a
`/quote?dex=X` API per venue. The UI doesn't change — it already calls
`useRoutes` which is the layer that would swap from `computeRoutes`
(pure, sync) to `useQueries` (TanStack Query, async) over the wire.
