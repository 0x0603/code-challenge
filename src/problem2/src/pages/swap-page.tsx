import { SwapForm } from '@/features/swap';
import { ThemeToggle } from '@/shared/ui';

export const SwapPage = () => (
  <main className="min-h-dvh flex flex-col items-center px-4 pt-12 sm:pt-16 pb-24">
    <header className="w-full max-w-[520px] flex items-center justify-between mb-10 sm:mb-12">
      <div className="flex items-center gap-2">
        <span aria-hidden className="inline-block h-3 w-3 rounded-full bg-accent" />
        <span className="font-medium tracking-tight">FlowSwap</span>
      </div>
      <ThemeToggle />
    </header>

    <section className="w-full max-w-[520px]">
      <h1 className="display text-[44px] sm:text-[56px] leading-none mb-2">Swap</h1>
      <p className="text-ink-2 mb-8 text-sm sm:text-base">
        Compare routes across mock DEXes, see how the deal stacks up against the market,
        and confirm before the quote expires.
      </p>
      <SwapForm />
    </section>
  </main>
);
