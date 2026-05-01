import { Button } from '@/shared/ui';
import {
  TokenIcon,
  formatTokenAmount,
  formatUsd,
  mockBalance,
  useTokens,
} from '@/entities/token';

/**
 * Page shell — the SwapForm itself lands here in M4. For M2 it renders the
 * full token list pulled from the live feed so we can confirm fetch +
 * dedupe + icons + formatting work before any feature code is written.
 */
export const SwapPage = () => {
  const { data: tokens, isLoading, error } = useTokens();

  return (
    <main className="min-h-dvh flex flex-col items-center px-4 pt-16 pb-24">
      <header className="w-full max-w-[520px] flex items-center justify-between mb-12">
        <div className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-3 rounded-full bg-accent" />
          <span className="font-medium tracking-tight">FlowSwap</span>
        </div>
        <span className="text-xs text-ink-3 font-mono">v0.2 · entities</span>
      </header>

      <section className="w-full max-w-[520px]">
        <h1 className="display text-[56px] leading-none mb-2">Swap</h1>
        <p className="text-ink-2 mb-10">
          Compare routes across mock DEXes, see how the deal stacks up against the market,
          and confirm before the quote expires.
        </p>

        <div className="rounded-card bg-surface shadow-card border border-border-subtle p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-medium">Token feed (M2 smoke test)</h2>
            <Button size="sm" variant="ghost">
              {isLoading ? 'Loading' : `${tokens?.length ?? 0} tokens`}
            </Button>
          </div>

          {error ? (
            <p className="text-sm text-negative">Failed to load tokens: {String(error)}</p>
          ) : null}

          {tokens ? (
            <ul className="divide-y divide-border-subtle">
              {tokens.slice(0, 8).map((token) => {
                const balance = mockBalance(token.symbol, token.priceUsd);
                return (
                  <li
                    key={token.symbol}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <TokenIcon symbol={token.symbol} iconUrl={token.iconUrl} />
                      <div>
                        <div className="font-medium">{token.symbol}</div>
                        <div className="text-xs text-ink-3 font-mono tabular">
                          {formatUsd(token.priceUsd)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono tabular text-sm">
                        {formatTokenAmount(balance)}
                      </div>
                      <div className="text-xs text-ink-3 font-mono tabular">
                        {formatUsd(balance * token.priceUsd)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </section>
    </main>
  );
};
