/**
 * mathStats - erf, Phi, probit, truncGaussQuantile, poissonInvCdf. No inline
 * copies anywhere else in the project; grep for `erf`, `Phi`, `probit` outside
 * this file as part of any review (S6.2).
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * NOT a scientific module in the S1-ledger sense - these are classical,
 * unauthored mathematical functions (a normal-distribution CDF and its
 * inverse, a Poisson inverse-CDF), so there is no soft-numbers ledger here.
 * Amendment A3's provenance-header exemption for infrastructure applies, the
 * same as `rng.ts`/`units`/`render`.
 *
 * `erf` is the Abramowitz & Stegun 1964 (7.1.26) rational approximation,
 * maximum absolute error ~1.5e-7 - sourced (form), a named textbook formula,
 * not a derivation of ours. `probit` (the inverse standard normal CDF) is
 * Peter Acklam's rational approximation (public domain, widely reproduced;
 * see e.g. https://web.archive.org/web/2015/http://home.online.no/~pjacklam/notes/invnorm/),
 * claimed accuracy ~1.15e-9 relative error - it does NOT depend on `erf`
 * internally, so its precision is not bounded by erf's ~1e-7. `Phi` is
 * defined from `erf` in the textbook way and therefore INHERITS erf's ~1e-7
 * ceiling; every function above that composes Phi (namely
 * `truncGaussQuantile`, through its boundary terms) inherits it too.
 *
 * **THE PRECISION CONSEQUENCE, stated so nobody assumes bit-exactness this
 * file cannot deliver:** S6.2 of the brief quotes a `truncGaussQuantile`
 * reference table to nine decimal places, sourced from an implementation this
 * package never received. This file's own erf-mediated Phi limits agreement
 * with that table to roughly six decimal places, not nine - confirmed against
 * every row of that table in the conformance suite, at a 1e-6 absolute
 * tolerance. If a future stage needs tighter-than-1e-6 agreement on a
 * boundary probability, upgrade `erf` to a higher-order approximation (Cody's
 * rational Chebyshev fit is the named upgrade path) rather than assume this
 * one already delivers it.
 *
 * `poissonInvCdf` and its `LAMBDA_MAX` guard are transcribed VERBATIM from
 * brief S4.8 - that code, and the underflow failure mode it guards against
 * (`Math.exp(-lambda)` hits exactly zero at lambda >= 746), is specified
 * there, not invented here.
 *
 * genVersion: frozen by contract (S4.2). Any edit that changes an output
 * requires a coordinated genVersion bump across every consuming module - do
 * not treat a change here as local.
 */

/**
 * Abramowitz & Stegun 1964, formula 7.1.26. Maximum absolute error ~1.5e-7
 * over the whole real line. `sourced (form)`.
 */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
        a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  return sign * (1 - poly * Math.exp(-ax * ax));
}

/** Standard normal CDF, from `erf`. Inherits erf's ~1.5e-7 ceiling. */
export function Phi(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/**
 * Inverse standard normal CDF ("probit"). Peter Acklam's rational
 * approximation, independent of `erf` - accuracy ~1.15e-9 relative error on
 * its own terms. `p` must be strictly inside (0, 1); callers that might land
 * on the boundary (e.g. `truncGaussQuantile` at u = 0 or u = 1 exactly)
 * clamp first, because probit(0) and probit(1) are genuinely +/-Infinity and
 * that is correct, not a bug - clamping is a caller-side numerical-safety
 * choice, not a property of this function.
 */
export function probit(p: number): number {
  if (!(p > 0) || !(p < 1)) {
    throw new Error(`probit: p must be in (0, 1), got ${p}`);
  }
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
             3.754408661907416e+00];
  const pLow = 0.02425, pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
           ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p <= pHigh) {
    const q = p - 0.5, r = q * q;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
           (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
          ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
}

/**
 * Quantile of a Gaussian(mu, sigma) truncated to [lo, hi]. Argument order is
 * FIXED as `(u, mu, sigma, lo, hi)` - S6.2 exists precisely because
 * transposing mu/sigma or lo/hi compiles cleanly and returns a plausible
 * wrong number forever. `u` is the caller-supplied uniform draw; this
 * function consumes no randomness of its own.
 *
 * F(x) = (Phi((x-mu)/sigma) - Phi(alpha)) / (Phi(beta) - Phi(alpha))  on [lo,hi]
 * Inverting: x = mu + sigma * probit( Phi(alpha) + u*(Phi(beta)-Phi(alpha)) )
 */
export function truncGaussQuantile(
  u: number, mu: number, sigma: number, lo: number, hi: number,
): number {
  if (!(sigma > 0)) throw new Error(`truncGaussQuantile: sigma must be > 0, got ${sigma}`);
  if (!(lo < hi)) throw new Error(`truncGaussQuantile: lo must be < hi, got [${lo}, ${hi}]`);
  if (!(u >= 0 && u <= 1)) throw new Error(`truncGaussQuantile: u must be in [0, 1], got ${u}`);

  const alpha = (lo - mu) / sigma;
  const beta = (hi - mu) / sigma;
  const Fa = Phi(alpha);
  const Fb = Phi(beta);
  const target = Fa + u * (Fb - Fa);
  // Clamp strictly inside (0, 1): probit is genuinely infinite at the edges,
  // and floating-point slop can otherwise land target exactly on 0 or 1 even
  // when u is a legitimate interior draw.
  const EPS = 1e-15;
  const clamped = Math.min(Math.max(target, EPS), 1 - EPS);
  const x = mu + sigma * probit(clamped);
  // Final safety clamp: probit(1 - EPS) is a large FINITE value, not
  // infinity, so at u exactly 0 or 1 the un-clamped result can overshoot the
  // boundary by a fraction of a ULP-scale epsilon. The truncation interval is
  // meant to be exact at its own edges; enforce that by construction rather
  // than by hoping every caller's tolerance is loose enough to absorb it.
  return Math.min(Math.max(x, lo), hi);
}

/**
 * Exponentially scaled modified Bessel function of the first kind, order 0:
 * `besselI0e(x) = exp(-|x|) I0(x)`. `sourced (form)` - the ascending series
 * below x=18 and the asymptotic Hankel expansion above it are both standard
 * (Abramowitz & Stegun 9.6.12 / 9.7.1); the specific split point and iteration
 * caps are ported verbatim from the sibling `galaxyforge` build's own
 * `mathStats.ts` (16 Aug 2026 port), where its docstring records why: the
 * older A&S *polynomial* approximation (9.8.1/9.8.2) leaves a ~1.4e-8
 * mean-preservation residual against `spiralArms.ts`'s 1e-12 gate, because
 * `armFactor`'s ridge subtraction (`exp(k*(cos(dtheta)-1)) - besselI0e(k)`)
 * needs this function's error to be far below the ridge terms it is
 * subtracted from, not merely "small" in an absolute sense. Both branches
 * verified against 50-digit references to full double precision over
 * x in [0, 1e5] by the sibling build; not independently re-verified to that
 * standard here, only exercised against the values this project's own kappa
 * range (~18.75-31.0) actually needs.
 */
export function besselI0e(x: number): number {
  if (!Number.isFinite(x)) {
    if (x === Infinity || x === -Infinity) return 0;
    throw new RangeError(`besselI0e: x must not be NaN`);
  }
  const ax = Math.abs(x);
  if (ax < 18) {
    let term = 1;
    let sum = 1;
    const q = (ax * ax) / 4;
    for (let k = 1; k <= 80; k++) {
      term *= q / (k * k);
      sum += term;
      if (term < 1e-18 * sum) break;
    }
    return Math.exp(-ax) * sum;
  }
  let term = 1;
  let sum = 1;
  for (let k = 1; k <= 40; k++) {
    const m = 2 * k - 1;
    const next = (term * (m * m)) / (8 * k * ax);
    if (Math.abs(next) >= Math.abs(term)) break;
    term = next;
    sum += term;
    if (Math.abs(term) < 1e-18 * Math.abs(sum)) break;
  }
  return sum / Math.sqrt(2 * Math.PI * ax);
}

/**
 * C2-continuous smoothstep: exactly 0 below `edge0`, exactly 1 above
 * `edge1`, and both its first and second derivatives vanish at the edges
 * (unlike the classic 3t^2-2t^3 smoothstep, which only has a zero FIRST
 * derivative there) - the standard Perlin "smootherstep" form. `sourced
 * (form)`, a named general-purpose window function, not a derivation of
 * ours. Moved here 16 Aug 2026 (previously a private copy inside
 * `galaxyModel.ts`) so `starFormingComplexes.ts`'s age-decay window can
 * reuse it without importing `galaxyModel.ts` - this module sits BELOW
 * `galaxyModel` in the project's one-way import direction, and a shared
 * general-purpose window function belongs in the same "classical maths,
 * not project science" tier as `erf`/`Phi`/`probit`, per Law 1.
 */
export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Guard against `Math.exp(-lambda)` underflowing to exactly zero
 * (lambda >= 746), which would otherwise make every draw return `kMax`
 * silently. Verified in the S4.8 audit: with a fixed 1000-ceiling and no
 * guard, `poissonInvCdf(760, 0.5)` returns 1000. 500 sits comfortably clear
 * of the underflow cliff (`exp(-500)` = 7.1e-218) and far above any
 * legitimate cell lambda this project produces.
 */
export const LAMBDA_MAX = 500;

/**
 * Inverse-CDF Poisson deviate. Consumes exactly one uniform draw `u`
 * regardless of the outcome - the property that makes per-cell draw counts
 * deterministic and fixed (S4.8).
 */
export function poissonInvCdf(lambda: number, u: number): number {
  if (!(lambda < LAMBDA_MAX)) {
    throw new Error(`poissonInvCdf: lambda ${lambda} >= ${LAMBDA_MAX}`);
  }
  if (!(lambda >= 0)) throw new Error(`poissonInvCdf: lambda must be >= 0, got ${lambda}`);
  const kMax = Math.ceil(lambda + 10 * Math.sqrt(lambda));
  let p = Math.exp(-lambda), cum = p, k = 0;
  while (u > cum && k < kMax) { k += 1; p *= lambda / k; cum += p; }
  return k;
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. Phi(0) = 0.5 exactly-to-tolerance; Phi is antisymmetric about 0.
 *  2. probit is the genuine inverse of Phi to ~1e-6 (round-trips both ways).
 *  3. truncGaussQuantile reproduces the S6.2 reference table to 1e-6 absolute
 *     - including the jitter case, which is the one that catches a mu/sigma
 *     transposition the symmetric unit-normal rows cannot see.
 *  4. truncGaussQuantile(0.5, mu, sigma, lo, hi) equals mu for any SYMMETRIC
 *     truncation (lo, hi both equidistant from mu) - the median of a
 *     symmetric truncation is the mean, a no-op property a transposition bug
 *     would break.
 *  5. LAMBDA_MAX guard fires; poissonInvCdf never silently returns a
 *     saturated ceiling for an in-range lambda.
 *  6. poissonInvCdf consumes its `u` monotonically - increasing u never
 *     decreases the returned k, for fixed lambda.
 *  7. poissonInvCdf tracks the Poisson mean/variance within tolerance over a
 *     large sample, at small/medium/large in-range lambda.
 *  8. besselI0e(0) === 1 exactly (I0(0)=1, exp(-0)=1); besselI0e is positive,
 *     decreasing in |x|, and its two branches (ascending series / Hankel
 *     expansion) agree with each other at the x=18 split to high precision -
 *     the property `spiralArms.ts`'s mean-preservation gate depends on.
 */
export const MATH_STATS_GATES = 8 as const;
