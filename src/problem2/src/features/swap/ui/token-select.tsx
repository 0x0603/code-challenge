import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  TokenIcon,
  formatUsd,
  useToken,
  useTokens,
  type Token,
} from '@/entities/token';
import { Button, Input, Modal } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useRecentTokens } from '../lib/use-recent-tokens';

type TokenSelectProps = {
  value: string | null;
  onChange: (symbol: string) => void;
  /** Symbols that should appear disabled (e.g. the other side of the swap). */
  disabledSymbols?: readonly string[];
  placeholder?: string;
  ariaLabel?: string;
};

/**
 * The token picker. Trigger is a chip-style secondary button; clicking it
 * opens a modal with search, a recent-tokens row, and the full filtered
 * list. Keyboard list navigation (Arrow/Enter) is implemented at the
 * dialog level so it works the moment the search input has focus.
 */
export const TokenSelect = ({
  value,
  onChange,
  disabledSymbols = [],
  placeholder = 'Select token',
  ariaLabel,
}: TokenSelectProps) => {
  const [open, setOpen] = useState(false);
  const selected = useToken(value);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel ?? 'Choose token'}
        className="!h-12 gap-2 pr-3 pl-2"
        leftSlot={
          selected ? (
            <TokenIcon
              symbol={selected.symbol}
              iconUrl={selected.iconUrl}
              size={26}
            />
          ) : (
            <span
              aria-hidden
              className="inline-block h-[26px] w-[26px] rounded-full bg-bg border border-border-default"
            />
          )
        }
        rightSlot={<ChevronDown />}
      >
        <span className="font-medium">{selected?.symbol ?? placeholder}</span>
      </Button>

      <TokenSelectDialog
        open={open}
        onClose={() => setOpen(false)}
        currentValue={value}
        onSelect={(symbol) => {
          onChange(symbol);
          setOpen(false);
        }}
        disabledSymbols={disabledSymbols}
      />
    </>
  );
};

type DialogProps = {
  open: boolean;
  onClose: () => void;
  currentValue: string | null;
  onSelect: (symbol: string) => void;
  disabledSymbols: readonly string[];
};

const TokenSelectDialog = ({
  open,
  onClose,
  currentValue,
  onSelect,
  disabledSymbols,
}: DialogProps) => {
  const { data: tokens, isLoading } = useTokens();
  const [recent, remember] = useRecentTokens();
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const isDisabled = useCallback(
    (symbol: string) => disabledSymbols.includes(symbol),
    [disabledSymbols],
  );

  const filtered = useMemo<Token[]>(() => {
    if (!tokens) return [];
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter((t) => t.symbol.toLowerCase().includes(q));
  }, [tokens, query]);

  const recentTokens = useMemo<Token[]>(() => {
    if (!tokens) return [];
    return recent
      .map((symbol) => tokens.find((t) => t.symbol === symbol))
      .filter((t): t is Token => t !== undefined);
  }, [tokens, recent]);

  // Reset query and highlight when dialog opens; keep them stable while open.
  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlighted(0);
    }
  }, [open]);

  // Keep highlight in range as the filter shrinks.
  useEffect(() => {
    setHighlighted((current) => {
      if (filtered.length === 0) return 0;
      return Math.min(current, filtered.length - 1);
    });
  }, [filtered.length]);

  // Scroll highlighted row into view on keyboard nav.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const row = list.querySelector<HTMLElement>(`[data-index="${highlighted}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  const commit = useCallback(
    (symbol: string) => {
      if (isDisabled(symbol)) return;
      remember(symbol);
      onSelect(symbol);
    },
    [isDisabled, remember, onSelect],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (filtered.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      const target = filtered[highlighted];
      if (target) {
        event.preventDefault();
        commit(target.symbol);
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select token"
      widthClassName="max-w-[440px]"
      header={
        <div className="px-5 pt-5 pb-4 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium tracking-tight">Select token</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-ink-3 hover:text-ink-1 transition-colors text-sm"
              aria-label="Close"
            >
              Esc
            </button>
          </div>
          <Input
            autoFocus
            placeholder="Search by symbol"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftSlot={<SearchGlyph />}
          />
        </div>
      }
    >
      <div onKeyDown={handleKeyDown} role="presentation">
        {recentTokens.length > 0 && query === '' && (
          <div className="px-5 py-3 border-b border-border-subtle">
            <div className="text-xs uppercase tracking-wider text-ink-3 mb-2">
              Recent
            </div>
            <div className="flex flex-wrap gap-2">
              {recentTokens.map((t) => (
                <button
                  key={t.symbol}
                  type="button"
                  disabled={isDisabled(t.symbol)}
                  onClick={() => commit(t.symbol)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full',
                    'border border-border-default text-sm',
                    'hover:border-accent hover:text-accent transition-colors',
                    'disabled:opacity-40 disabled:hover:border-border-default disabled:hover:text-ink-2',
                  )}
                >
                  <TokenIcon symbol={t.symbol} iconUrl={t.iconUrl} size={18} />
                  <span className="font-medium">{t.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-h-[420px] overflow-y-auto">
          {isLoading ? (
            <p className="px-5 py-12 text-center text-sm text-ink-3">Loading tokens…</p>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-ink-2">No tokens match “{query}”.</p>
              <p className="text-xs text-ink-3 mt-1">
                Tokens without a price feed are intentionally hidden.
              </p>
            </div>
          ) : (
            <ul ref={listRef} role="listbox" aria-label="Tokens">
              {filtered.map((t, index) => {
                const isCurrent = t.symbol === currentValue;
                const disabled = isDisabled(t.symbol);
                const highlightedRow = index === highlighted;
                return (
                  <li
                    key={t.symbol}
                    data-index={index}
                    role="option"
                    aria-selected={isCurrent}
                    aria-disabled={disabled || undefined}
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      onMouseMove={() => setHighlighted(index)}
                      onClick={() => commit(t.symbol)}
                      className={cn(
                        'w-full flex items-center justify-between px-5 py-3 text-left',
                        'transition-colors',
                        highlightedRow && !disabled && 'bg-accent-soft',
                        disabled && 'opacity-40 cursor-not-allowed',
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <TokenIcon symbol={t.symbol} iconUrl={t.iconUrl} size={28} />
                        <span className="flex flex-col">
                          <span className="font-medium leading-tight">{t.symbol}</span>
                          <span className="text-xs text-ink-3 font-mono tabular leading-tight mt-0.5">
                            {formatUsd(t.priceUsd)}
                          </span>
                        </span>
                      </span>
                      {isCurrent && (
                        <span className="text-xs text-accent font-medium">Selected</span>
                      )}
                      {disabled && !isCurrent && (
                        <span className="text-xs text-ink-3">In use</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};

const ChevronDown = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    className="text-ink-3"
  >
    <path
      d="M6 9l6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SearchGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path
      d="M20 20l-3.5-3.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
