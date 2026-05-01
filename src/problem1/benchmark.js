const { sum_to_n_a, sum_to_n_b, sum_to_n_c } = require('./sum-to-n.js');

const time = (fn) => {
  const start = process.hrtime.bigint();
  const value = fn();
  const ns = Number(process.hrtime.bigint() - start);
  return { ns, value };
};

const fmt = (ns) => {
  if (ns < 1_000) return `${ns} ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)} µs`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)} ms`;
  return `${(ns / 1_000_000_000).toFixed(2)} s`;
};

const sizes = [10, 1_000, 100_000, 10_000_000];
console.log('sum_to_n micro-benchmark — single shot per cell\n');
console.log('n'.padStart(12), 'iterative'.padStart(14), 'closed-form'.padStart(14), 'recursive'.padStart(14));
console.log('-'.repeat(58));

for (const n of sizes) {
  const a = time(() => sum_to_n_a(n));
  const b = time(() => sum_to_n_b(n));
  let cCell = '   skipped';
  if (n <= 9_000) {
    const c = time(() => sum_to_n_c(n));
    cCell = fmt(c.ns).padStart(14);
  }
  console.log(
    String(n).padStart(12),
    fmt(a.ns).padStart(14),
    fmt(b.ns).padStart(14),
    cCell,
  );
}

console.log('\nrecursive entries beyond ~9k are skipped — V8 stack overflow.');
console.log('iterative grows linearly; closed-form stays flat. That gap is the point.');
