/**
 * rng - the project's seeded PRNG, and the one place a channel string turns
 * into a stream.
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * NOT a scientific module - no ledger, no citation, per Amendment A3's
 * exemption for infrastructure (the same exemption `render`/`vault`/`units`
 * get). Built here because Law 2 ("every module is a pure function of an rng
 * and its inputs... never Math.random; the project uses seeded
 * mulberry32/xmur3") names a concrete algorithm pair but no source ever
 * shipped an implementation of either. `age` (Stage 2) is the first consumer
 * and cannot be written without this existing first.
 *
 * `xmur3` (32-bit string hash, seed generator) and `mulberry32` (32-bit
 * counter-based PRNG) are the two public-domain algorithms in wide informal
 * circulation under exactly those names (no formal citation - they are
 * "folklore" utilities, the JS-PRNG equivalent of a Fisher-Yates shuffle).
 * Implementations below are the canonical bit patterns; gated for
 * determinism and for basic statistical sanity (uniformity, independence)
 * rather than cryptographic quality - NOT a cryptographic RNG, and nothing
 * in this project needs one.
 *
 * genVersion: a change to either algorithm changes EVERY draw downstream of
 * it, silently. Treat `rng.ts` as being at the same frozen tier as
 * `mathStats.ts` - Law 5's additive-only growth applies, and a change here is
 * a coordinated genVersion bump across the whole project, not a local edit.
 */

/** A stream of floats in [0, 1). Nothing here is ever mutated by a caller;
 *  the closure holds the only mutable state. */
export type Rng = () => number;

/**
 * xmur3 - hashes an arbitrary string into a 32-bit seed generator. Used to
 * turn `(worldSeed, channel, ...keyParts)` into a starting state for
 * `mulberry32`, which is the whole mechanism behind "own PRNG channel" (Law 2):
 * two channels never collide because their hashed strings differ, and the
 * same key always hashes to the same seed (Law 6, determinism).
 */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function (): number {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/**
 * mulberry32 - a 32-bit counter-based PRNG. Fast, deterministic, and more
 * than sufficient statistical quality for procedural placement/sampling
 * (period 2^32, passes the standard small-crush-class smoke tests folklore
 * attributes to it). Returns a closure producing floats in [0, 1).
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function (): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The channel-seeding convention every module's caller uses: fold
 * `worldSeed`, the `CHANNELS` name, and whatever key components make this
 * draw unique (cell indices, sysid, formationIndex, starIndex...) into one
 * string, hash it, and start a fresh `mulberry32` stream from the hash.
 *
 * This is what makes channel isolation real rather than aspirational: two
 * calls with the same key always reproduce the same stream (determinism),
 * and no two distinct (channel, key) pairs are expected to collide for any
 * key space this project actually uses (32 bits of hash is not
 * collision-proof in the cryptographic sense, and is not claimed to be -
 * it is claimed to be reproducible, which is the actual requirement).
 */
export function channelRng(worldSeed: string, channel: string, ...keyParts: readonly (string | number)[]): Rng {
  const key = [worldSeed, channel, ...keyParts].join('|');
  const seed = xmur3(key)();
  return mulberry32(seed);
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. DETERMINISM - `channelRng` with the same arguments produces a
 *     bit-identical sequence of draws, always.
 *  2. CHANNEL ISOLATION - varying any one key component (worldSeed, channel,
 *     or any keyPart) changes the resulting stream.
 *  3. RANGE - every draw from `mulberry32` lands in [0, 1).
 *  4. ROUGH UNIFORMITY - a large sample's mean lands near 0.5 and its values
 *     spread across all ten deciles (a statistical smoke test, not a proof).
 */
export const RNG_GATES = 4 as const;
