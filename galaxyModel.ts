/**
 * galaxyModel - the strategy interface every morphology implements, and the
 * population *concept* those morphologies supply instances of.
 *
 * CREATED AT STAGE 0. Nothing here is a change to existing code.
 *
 * R14: `Population` and `PopulationKey` are DECLARED HERE and re-exported
 * through `types.ts`. The population concept belongs to the model layer; each
 * morphology supplies its own instances.
 *
 * The generator is a CONDUCTOR. It asks a model a question and never reaches
 * inside it. The science underneath may be rewritten freely as long as this
 * interface holds.
 */

export type GalaxyModelName = 'spiral' | 'barredSpiral' | 'elliptical' | 'lenticular';

/**
 * Every key any SHIPPED morphology uses. Widening it for a new morphology is
 * additive and sanctioned (0.5). Downstream code NEVER special-cases a key.
 *
 * -- NAMING CONVENTION, and it is binding -----------------------------------
 * New keys are MORPHOLOGY-PREFIXED camelCase. The five unprefixed keys predate
 * the convention and are frozen; they are not evidence against it. This is the
 * `nLocal` precedent applied deliberately - a documented historical exception
 * beats either a corrupting rename or a convention nobody wrote down (0.2).
 *
 * WHY FROZEN, and it is stronger than Law 5: the five are STAMPED INTO
 * GENERATED NOTES via `SystemContext.population`. A rename is silent corruption
 * of stored user data, which is the one thing the project promises never to do.
 *
 * WHY PREFIXED: a key identifies a population *instance definition*, not a
 * physical category. Two morphologies' classical bulges share a word and share
 * nothing else - different scale radius, mass fraction, age and metallicity -
 * so a shared key makes every glossary entry and every stamp wrong for one of
 * them. This is not hypothetical for `classicalBulge`: 0.9 instructs "apply
 * the bar to disc and bulge terms only", and Part 9 already carries Licquia &
 * Newman's Milky Way bulge mass, so the unprefixed name is a slot the spiral
 * will claim. AUDIT CORRECTION (1 Aug): an earlier draft of this comment
 * asserted the spiral's density field "has a bulge term TODAY". That could not
 * be verified from this package - the only spiral reference implementation in
 * it (1.3) is haloTerm + discs, with no bulge term - and the shipped plugin
 * code is not in the archive to arbitrate. Do not go hunting for a term 1.3
 * does not show. The reservation of the unprefixed key does not depend on
 * whether the term exists yet; 0.9's instruction binds whichever terms do.
 *
 * THE PREFIX NAMES THE MODEL THAT OWNS THE POPULATION SET, not the model
 * instance. `spiral` and `barredSpiral` share one set - 1.0 requires the bar
 * toggle to reproduce `spiral` BIT-IDENTICALLY, so a parallel
 * `barredSpiral*` family would break the Part 4 gate. One set, one prefix.
 *
 * camelCase, NOT a colon separator. The colon idiom is reserved for PRNG
 * channel names (`moons:{i}`, `atmosphere:{i}`), so keeping it out of keys
 * means a grep for `:` still finds streams and only streams. These identifiers
 * also reach note frontmatter, where an unquoted colon in a YAML value is a
 * parse hazard.
 */
export type PopulationKey =
  // spiral / barredSpiral - Xiang & Rix 2022, migrated from `age` (0.3).
  // EXISTING AND FROZEN. Unprefixed by history, not by design.
  | 'youngThin'
  | 'midThin'
  | 'oldThin'
  | 'thick'
  | 'halo'
  // elliptical - 2.1, 2.3a
  | 'ellipticalInSitu'
  | 'ellipticalAccreted'
  // lenticular - 3.2, 3.3. `lenticularClassicalBulge` serves BOTH
  // configurations, carrying a different mass fraction in each: it is the same
  // physical object with a different mass share, so it is not two keys.
  //
  // THE DISC IS TWO POPULATIONS, RULED IN 3.3. Juric gives exactly two disc
  // components and the lenticular ledger commits to "disc structure as spiral,
  // Juric 2008", so two is what that source licenses. The spiral's
  // midThin/oldThin boundary is an AGE-COHORT subdivision (Xiang & Rix), not a
  // structural one - Juric assigns both the same scale height and length. A
  // quenched galaxy has no ongoing formation laying down an age sequence, so
  // the thin disc is one old population. That is what "drop the young cohort"
  // means. Collapsing to a single disc would instead discard the thick disc's
  // distinct chemistry, which is the thing the AMR coupling needs.
  | 'lenticularThinDisc'
  | 'lenticularThickDisc'
  | 'lenticularPseudoBulge'
  | 'lenticularClassicalBulge'
  // Added per 3.3a. Erwin decomposes S0s PHOTOMETRICALLY, and a stellar halo at
  // 28-30 mag/arcsec^2 is invisible to that - so his 0.61/0.33/0.06 are fractions
  // of decomposed light, and carrying them straight into massFractionGalaxy
  // asserts a zero-mass halo rather than omitting one. Without this key the S0 is
  // also the only morphology of four with no pressure-supported old component,
  // and its outskirts generate an empty sky.
  | 'lenticularHalo';

export interface Population {
  key: PopulationKey;
  label: string;

  /** Systems/pc^3 at THE MODEL'S OWN reference point. Each model documents
   *  what that point is: for disc models the solar circle (R0, z=0); for
   *  spheroid models the value is derived from total stellar mass, not
   *  measured. The name is historical and does not carry its unit - see
   *  ledger. NOT renamed: that would be an unsanctioned Law 5 break (0.2). */
  nLocal: number;

  /** TRUNCATION INTERVAL for the age draw, Gyr. NOT a uniform range - this is
   *  the [lo, hi] pair `truncGaussQuantile` already expects. A uniform draw
   *  here silently destroys the age-metallicity relation (0.2, 0.3). */
  ageGyr: [number, number];

  ageMeanGyr: number;         // truncated-Gaussian mean
  ageSigmaGyr: number;        // truncated-Gaussian sigma

  /** This population's share of galaxy stellar mass. Load-bearing for the
   *  mass-normalised morphologies (elliptical, lenticular, via Upsilon);
   *  carried but not consumed by the locally-anchored spiral (0.1, 3.4). */
  massFractionGalaxy: number;

  fehMeanDex: number;         // value at fehGradientRefPc
  fehSigmaDex: number;

  /** DISCRIMINATOR (0.4a). The two forms are different functional shapes, not
   *  two coefficients:
   *    linear:      feh(r) = fehMeanDex + fehGradient * (r - fehGradientRefPc)
   *    logarithmic: feh(r) = fehMeanDex + fehGradient * log10(r / fehGradientRefPc)
   *  `metallicity` switches on this and ends with `assertNever`. */
  fehGradientForm?: 'linear' | 'logarithmic';

  /** dex/pc when linear; dex per DECADE in radius when logarithmic. The field
   *  name deliberately carries no unit, because its unit is form-dependent -
   *  THIS COMMENT is the unit. Never `fehGradientDexPerPc`, the pre-correction
   *  name whose embedded unit is valid for only one of the two forms (0.4a). */
  fehGradient?: number;

  /** R0 for discs, the effective radius for spheroids - the same "each model
   *  states its own reference point" principle as `nLocal` (0.4a). */
  fehGradientRefPc?: number;

  /** Hernquist scale radius. SPHEROID POPULATIONS ONLY; disc populations leave
   *  it unset, the same optionality pattern as `armAmplitude` (2.4).
   *
   *  Load-bearing rather than tidy: two Hernquist components sharing one scale
   *  radius have a radially CONSTANT mass ratio, so the ex-situ fraction could
   *  not rise with radius as 2.3a requires. Per-population radii are what make
   *  the accreted halo expressible at all. */
  scaleRadiusPc?: number;

  /** 0..~1, discs only. S0s set 0 on EVERY population, structurally rather
   *  than by remembering to leave a flag off (3.4). */
  armAmplitude?: number;

  /** BUILD 2, REALISM RULING (owner, 1 Aug). Base clustered fraction -
   *  MIGRATED FROM the sampler's 8.6 constants. A SURVIVAL-statistic tunable,
   *  never LL03's 70-90% birth figure. Set ONLY by populations whose age
   *  interval reaches below the co-natal coherence window (~1 Gyr): the
   *  sampler's effective group rate is this times conatalProbability(pop),
   *  so leaving it unset and the Phi-ratio vanishing are belt and braces.
   *  Unset = 0; no special-casing anywhere downstream. */
  clusteredFraction?: number;

  /** BUILD 2, same ruling. Mean co-natal remnant size - a REMNANT multiplicity,
   *  not a birth population (LL03: 90% of clustered stars form in >=100-member
   *  clusters; a dozen members is the surviving fragment). Tunable, unsourced -
   *  nothing in the literature gives a remnant multiplicity. Same set-only-if
   *  rule as clusteredFraction. */
  meanGroupSize?: number;
}

/**
 * Density contributions keyed by population.
 *
 * PARTIAL BY CONTRACT, not by accident. 2.1: the elliptical "returns a shorter
 * set than the spiral's, which is precisely why the population list belongs to
 * the model". A full `Record<PopulationKey, number>` would oblige every
 * morphology to report every other morphology's populations, and would break
 * every existing model the moment the union is widened - which 0.5 explicitly
 * sanctions as additive.
 *
 * INVARIANT: the keys present are EXACTLY `populations.map(p => p.key)`.
 * Asserted in the stage-0 gates.
 */
export type DensityByPopulation = Readonly<Partial<Record<PopulationKey, number>>>;

/**
 * The strategy interface. Four members.
 *
 * ON THE COUNT - worth stating, because the package says both things: 1.5 lists
 * four exports (`densityAt`, `densityByPopulation`, `populations`, `morphology`)
 * while Part 7 and 9.5 say "three members", and the 1.6 law table names three
 * (`densityAt` / `densityByPopulation` / `populations`). The three are the ones
 * the CONDUCTOR CALLS; `morphology` is a self-identifying label the model
 * carries, not a question the generator asks. Both statements are true of
 * different things. The prohibition that matters is unchanged and absolute:
 * DO NOT ADD A FIFTH, and do not add `starFormationHistory()` - it has no
 * consumer (0.2, Part 7).
 */
export interface GalaxyModel {
  /** Self-identifying label. `barredSpiral` when the bar is enabled, `spiral`
   *  otherwise - ONE implementation, one flag (1.3). Not a question the
   *  conductor asks; it is how the model names itself in provenance. */
  readonly morphology: GalaxyModelName;

  /** The model's own populations, in FIXED ORDER.
   *
   *  This order is the single source of truth for iteration. Any seeded draw
   *  over populations walks THIS array - never `Object.keys` on a density
   *  record, whose order is an implementation detail of how the object was
   *  built. Getting that wrong makes population assignment depend on
   *  construction order rather than on the model, which is exactly the class
   *  of bug channel isolation exists to prevent. */
  readonly populations: readonly Population[];

  /** Total stellar-system density at a point, systems/pc^3.
   *
   *  R and z in pc, theta in radians. Axisymmetric models IGNORE theta, and a
   *  gate confirms varying it gives bit-identical output. Must be finite,
   *  non-negative and continuous everywhere, including R -> 0. */
  densityAt(R: number, theta: number, z: number): number;

  /** The same quantity, split by population. Sums to `densityAt` within
   *  floating-point tolerance - the invariant most likely to drift, so it is
   *  asserted directly rather than assumed (Part 4). */
  densityByPopulation(R: number, theta: number, z: number): DensityByPopulation;
}
