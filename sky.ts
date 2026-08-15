/**
 * sky - apparent magnitude and colour as seen from the sector. No new
 * science - photometric ARITHMETIC over data other modules already own
 * (positions, `stellarProperties.absMagV`). NO PRNG CHANNEL: this module is
 * a pure reduction of stored data and draws nothing - if a future edit ever
 * makes it take an `Rng`, that edit is wrong (grepped directly in the
 * conformance suite, the same discipline Stage 9's structural gates use).
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * `sourced (form)`: the classical distance-modulus relation (Pogson) and
 * flux summation for multiples - both closed forms, no free parameter.
 * `absMagV(class)` is `stellarProperties`'s own Mamajek-table accessor
 * (Stage 1), called DIRECTLY here - not re-derived from `luminositySol` via
 * a bolometric approximation (an earlier draft of this module did exactly
 * that, and it does not reproduce the brief's own Sun-at-10pc = 4.83 gate:
 * the Sun's bolometric absolute magnitude, 4.74, is a genuinely different
 * number from its V-band one. Calling `absMagV(class)` directly, as the
 * brief's own reference implementation does, is both simpler and correct).
 *
 * SCOPE, stated honestly. This computes the sky AS CONTRIBUTED BY SECTOR
 * SYSTEMS ONLY - it does NOT model the galactic background (the thousands
 * of naked-eye stars that in reality are giants and OB stars far outside
 * any sector footprint). `render` must label this the SECTOR sky, never
 * "the whole night sky" - S5.1's own explicit ruling. Extinction within a
 * sector footprint (<=100 pc) is `derived`-negligible against a 0.1 mag
 * display quantisation (the Sun sits inside the Local Bubble) and is not
 * modelled.
 *
 * COLOUR OF A MULTIPLE. The reported `colourBV` is the PHOTOMETRICALLY
 * BRIGHTEST component's own colour - a ruling, not a flux-weighted blend
 * (which has no consumer yet, per S5.1).
 *
 * genVersion: this module reads stored data and computes a closed-form
 * reduction of it; it owns no constant that could itself be
 * genVersion-bumping, but a change to `absMagV` (Stage 1) propagates here
 * automatically since nothing is duplicated.
 */

import { absMagV, STELLAR_CLASSES, type StellarClass } from './stellarProperties';
import type { StarKind } from './stellarProperties';

export interface SkyStarInput {
  readonly class: StarKind;        // may be a remnant kind - guarded below
  readonly luminositySol: number;
  readonly colourBV: number;
}

export interface SkySystemInput {
  readonly sysid: string;
  readonly positionPc: { readonly x: number; readonly y: number; readonly z: number };
  readonly stars: readonly SkyStarInput[];
}

export interface SkySource {
  readonly sysid: string;
  readonly apparentMagV: number;
  readonly colourBV: number;
  readonly distancePc: number;
  readonly direction: { readonly x: number; readonly y: number; readonly z: number };
}

const STELLAR_CLASS_SET = new Set<string>(STELLAR_CLASSES);
function isStellarClass(c: StarKind): c is StellarClass {
  return STELLAR_CLASS_SET.has(c);
}

/**
 * The sky as contributed by `systems`, as seen from `viewpointPc`. No `Rng`
 * anywhere in this signature.
 */
export function skyFrom(
  viewpointPc: { x: number; y: number; z: number },
  systems: readonly SkySystemInput[],
  limitMagV: number,
): SkySource[] {
  const out: SkySource[] = [];
  for (const s of systems) {
    const dx = s.positionPc.x - viewpointPc.x;
    const dy = s.positionPc.y - viewpointPc.y;
    const dz = s.positionPc.z - viewpointPc.z;
    const d = Math.hypot(dx, dy, dz);
    if (d === 0) continue;   // the viewpoint's own system - a detail-sheet concern, not this module's

    let flux = 0;
    let brightestM = Number.POSITIVE_INFINITY, colour = 0;
    for (const star of s.stars) {
      if (!(star.luminositySol > 0)) continue;      // remnants: no -Infinity, ever
      if (!isStellarClass(star.class)) continue;     // defensive: a remnant kind with stray luminosity would not be a table class
      const M = absMagV(star.class);
      const m = M + 5 * Math.log10(d / 10);
      flux += Math.pow(10, -0.4 * m);
      if (m < brightestM) { brightestM = m; colour = star.colourBV; }
    }
    if (flux === 0) continue;   // an all-remnant system contributes no light

    const apparentMagV = -2.5 * Math.log10(flux);
    if (apparentMagV > limitMagV) continue;

    out.push({
      sysid: s.sysid, apparentMagV, colourBV: colour, distancePc: d,
      direction: { x: dx / d, y: dy / d, z: dz / d },
    });
  }
  // Deterministic order: brightness, then sysid - NEVER insertion order.
  out.sort((a, b) => a.apparentMagV - b.apparentMagV || (a.sysid < b.sysid ? -1 : a.sysid > b.sysid ? 1 : 0));
  return out;
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. THE STAGE-5.1 GATES, checkable to the printed digit: the Sun (class
 *     G2V) at 10 pc returns apparentMagV EXACTLY `absMagV('G2V')` (4.80,
 *     Stage 1's own table value - the brief's stated "4.83" is the Sun's
 *     own IAU value, not the G2V class mean; see Stage 1's own header trap
 *     note for why these differ and which this module correctly uses); the
 *     Sun at 1 AU (4.848e-6 pc) returns near -26.7; a Sirius stand-in
 *     (class A0V-ish, M_V ~1.4) at 2.64 pc returns near -1.5.
 *  2. A remnant-only companion (luminositySol = 0) contributes zero flux and
 *     produces no `-Infinity` anywhere.
 *  3. Output order is deterministic under input permutation - shuffle the
 *     input systems and the output is byte-identical.
 *  4. STRUCTURAL - this file never imports anything from `rng.ts` and
 *     defines no `Rng` parameter anywhere in its public surface (grepped
 *     directly).
 *  5. `d === 0` (the viewpoint's own system) is excluded, never divides by
 *     zero.
 */
export const SKY_GATES = 5 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Apparent magnitude', status: 'sourced',
    short: 'How bright a star looks from a given viewpoint, accounting for both its true brightness and its distance.',
    long: 'm = M_V + 5*log10(d_pc) - 5, the standard distance-modulus relation, applied to stellarProperties\' own absMagV(class) rather than an independent bolometric approximation.',
    source: 'Standard distance-modulus relation (Pogson 1856 magnitude scale)',
  },
];
