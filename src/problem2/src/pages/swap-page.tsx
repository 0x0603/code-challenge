import { SwapForm } from '@/features/swap';
import { ThemeToggle } from '@/shared/ui';

export const SwapPage = () => (
  <main className="min-h-dvh flex flex-col items-center px-4 pt-10 sm:pt-14 pb-24">
    <header className="w-full max-w-[1000px] flex items-center justify-between mb-8 sm:mb-10">
      <div className="flex items-center gap-2">
        <span aria-hidden className="inline-block h-3 w-3 rounded-full bg-accent" />
        <span className="font-medium tracking-tight">99TechSwap</span>
      </div>
      <ThemeToggle />
    </header>

    <section className="w-full max-w-[1000px]">
      <h1 className="display text-[40px] sm:text-[52px] leading-none mb-2">Swap</h1>
      <p className="text-ink-2 mb-8 text-sm sm:text-base max-w-[520px]">
        Compare live quotes across mock DEXes — Uniswap, dYdX, Curve and 1inch —
        and confirm before the quote expires.
      </p>
      <SwapForm />
    </section>
  </main>
);
