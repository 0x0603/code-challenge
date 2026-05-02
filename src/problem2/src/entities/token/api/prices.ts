import { priceFeedSchema, type PriceRecord, type Token } from '../model/types';

const PRICES_URL = 'https://interview.switcheo.com/prices.json';

/**
 * Token icons live in a public GitHub repo. Some tokens won't have a file
 * there — TokenIcon handles the 404 with a letter fallback so we don't
 * bake the missing-list into the data layer.
 */
const ICON_BASE = 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens';

/**
 * The price feed reports stake/redemption derivatives in uppercase
 * (`STATOM`, `RATOM`), but Switcheo's icon repo stores them with the
 * lowercase prefix (`stATOM.svg`, `rATOM.svg`). Pattern-based rewrites
 * would break unrelated tickers (e.g. `STRD` is Stride, not `st` + `RD`),
 * so we use an explicit allow-list. Add new entries here when a new
 * derivative ships.
 */
const ICON_NAME_OVERRIDES: Readonly<Record<string, string>> = {
  STATOM: 'stATOM',
  STEVMOS: 'stEVMOS',
  STLUNA: 'stLUNA',
  STOSMO: 'stOSMO',
  RATOM: 'rATOM',
};

const iconUrlFor = (symbol: string) => {
  const name = ICON_NAME_OVERRIDES[symbol] ?? symbol;
  return `${ICON_BASE}/${name}.svg`;
};

/**
 * The feed sometimes returns multiple records for the same currency (e.g.
 * BUSD appears twice in the live data). The latest `date` is the source of
 * truth — older snapshots are silently discarded. Exposed for unit tests.
 */
export const dedupeLatestPerCurrency = (records: readonly PriceRecord[]): PriceRecord[] => {
  const latestBySymbol = new Map<string, PriceRecord>();
  for (const record of records) {
    const existing = latestBySymbol.get(record.currency);
    if (!existing || record.date > existing.date) {
      latestBySymbol.set(record.currency, record);
    }
  }
  return [...latestBySymbol.values()];
};

const toToken = (record: PriceRecord): Token => ({
  symbol: record.currency,
  priceUsd: record.price,
  priceTakenAt: record.date,
  iconUrl: iconUrlFor(record.currency),
});

/**
 * Fetch the price feed, validate it against the wire schema, dedupe, and
 * project to the domain Token shape. The challenge brief says tokens
 * without a price may be omitted — by deriving Token from PriceRecord we
 * get that filter for free.
 */
export const fetchTokens = async (signal?: AbortSignal): Promise<Token[]> => {
  const response = await fetch(PRICES_URL, { signal: signal ?? null });
  if (!response.ok) {
    throw new Error(`Price feed responded ${response.status} ${response.statusText}`);
  }
  const json: unknown = await response.json();
  const parsed = priceFeedSchema.parse(json);
  return dedupeLatestPerCurrency(parsed)
    .map(toToken)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
};
