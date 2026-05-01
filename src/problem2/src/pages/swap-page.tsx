import { Button } from '@/shared/ui';

/**
 * Page shell — the SwapForm itself lands here in M4. For M1 it serves as a
 * smoke-test surface so we can verify tokens, fonts, and the Button primitive
 * render correctly before any feature code lands.
 */
export const SwapPage = () => {
  return (
    <main className="min-h-dvh flex flex-col items-center px-4 pt-16 pb-24">
      <header className="w-full max-w-[520px] flex items-center justify-between mb-12">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-full bg-accent"
          />
          <span className="font-medium tracking-tight">FlowSwap</span>
        </div>
        <span className="text-xs text-ink-3 font-mono">v0.1 · scaffold</span>
      </header>

      <section className="w-full max-w-[520px]">
        <h1 className="display text-[56px] leading-none mb-2">Swap</h1>
        <p className="text-ink-2 mb-10">
          Compare routes across mock DEXes, see how the deal stacks up against the market,
          and confirm before the quote expires.
        </p>

        <div className="rounded-card bg-surface shadow-card border border-border-subtle p-8">
          <p className="text-ink-3 text-sm">
            Swap form lands here in M4. This card proves design tokens, fonts, and the
            Button primitive render correctly.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button>Confirm swap</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" loading>
              Loading
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};
