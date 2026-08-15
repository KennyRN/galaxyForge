import { xmur3, mulberry32, channelRng } from './rng';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

function draws(rng: () => number, n: number): number[] {
  return Array.from({ length: n }, () => rng());
}

// 1. determinism
check('1 channelRng with identical arguments produces a bit-identical sequence',
  (() => {
    const a = draws(channelRng('seed-a', 'placement', 1, 2, 3), 20);
    const b = draws(channelRng('seed-a', 'placement', 1, 2, 3), 20);
    return a.every((v, i) => v === b[i]);
  })());

// 2. channel isolation - varying any one key component changes the stream
check('2 varying worldSeed changes the stream',
  draws(channelRng('seed-a', 'stars', 1), 5).join(',') !== draws(channelRng('seed-b', 'stars', 1), 5).join(','));
check('2b varying the channel name changes the stream',
  draws(channelRng('seed-a', 'stars', 1), 5).join(',') !== draws(channelRng('seed-a', 'companions', 1), 5).join(','));
check('2c varying a key part changes the stream',
  draws(channelRng('seed-a', 'stars', 1), 5).join(',') !== draws(channelRng('seed-a', 'stars', 2), 5).join(','));
check('2d cell-index order matters: (1,2) is not the same stream as (2,1)',
  draws(channelRng('seed-a', 'placement', 1, 2), 5).join(',') !== draws(channelRng('seed-a', 'placement', 2, 1), 5).join(','));

// 3. range
check('3 every draw lands in [0, 1)',
  (() => {
    const rng = mulberry32(12345);
    const vs = draws(rng, 100_000);
    return vs.every((v) => v >= 0 && v < 1);
  })());

// 4. rough uniformity - a smoke test, not a proof
check('4 large-sample mean is near 0.5 and every decile is populated',
  (() => {
    const rng = mulberry32(987654321);
    const n = 200_000;
    const buckets = new Array(10).fill(0);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const v = rng();
      sum += v;
      buckets[Math.min(9, Math.floor(v * 10))]++;
    }
    const mean = sum / n;
    const meanOk = Math.abs(mean - 0.5) < 0.005;
    const bucketsOk = buckets.every((c) => c > n / 10 * 0.9 && c < n / 10 * 1.1);
    return meanOk && bucketsOk;
  })());

// extra: xmur3 itself is deterministic and sensitive to its input
check('+ xmur3 is deterministic for the same string',
  xmur3('same-key')() === xmur3('same-key')());
check('+ xmur3 differs for different strings (no trivial collision on adjacent keys)',
  xmur3('key-1')() !== xmur3('key-2')());

if (failures > 0) throw new Error(`${failures} rng conformance failure(s)`);
console.log('\nall rng conformance checks passed');
