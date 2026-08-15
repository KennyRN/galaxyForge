/**
 * glossary - the one aggregate index of every sourced/calibrated/tunable/
 * derived constant in the package, collected from each science module's own
 * `glossary` export.
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * Sources: NONE, by design - exactly like `densityMap`, this module owns no
 * science and introduces no new constant. It is pure aggregation: every entry
 * traces to the module that declared it (Law 1). If a `GlossaryEntry` here is
 * wrong, the bug is in the owning module's own `glossary` export, not in this
 * file, which does nothing but concatenate and re-check shape.
 *
 * WHY THIS EXISTS. The brief's grading discipline (sourced/calibrated/tunable/
 * derived, on every constant) is only as useful as it is discoverable. Each
 * module already carries its own ledger inline, in its provenance header and
 * now in its `glossary` export; this module is the reader-facing index over
 * all of them, intended to back a future in-app "why is this number what it
 * is" panel (brief S9-ish territory, not committed to a stage here).
 *
 * SCOPE. Every module that carries a provenance header and a ledger gets a
 * `glossary` export and is listed below - as of 15 Aug 2026 that includes
 * `spiralArms`, `galaxyParameters` and `starFormingComplexes` (patch v2.3).
 * `rng`, `mathStats`, `units`, `densityMap`, `render`, `vault`, `main`,
 * `genVersion` are Amendment-A3-exempt infrastructure/presentation modules:
 * they own no graded constants and correctly have no `glossary` export to
 * aggregate. `types` declares only meta-taxonomies (Confidence,
 * LedgerStatus, GlossaryEntry itself) and is exempt for the same reason.
 *
 * genVersion: this module does NOT participate. It reads glossaries and
 * concatenates them; it stores nothing and draws nothing. A change here alters
 * what a reader sees documented, never what exists.
 */

import type { GlossaryEntry } from './types';

import { glossary as stellarPropertiesGlossary } from './stellarProperties';
import { glossary as ageGlossary } from './age';
import { glossary as stellarPopulationGlossary } from './stellarPopulation';
import { glossary as stellarHistoryGlossary } from './stellarHistory';
import { glossary as multiplicityGlossary } from './multiplicity';
import { glossary as planetsGlossary } from './planets';
import { glossary as beltsGlossary } from './belts';
import { glossary as moonsGlossary } from './moons';
import { glossary as atmosphereGlossary } from './atmosphere';
import { glossary as surfaceTemperatureGlossary } from './surfaceTemperature';
import { glossary as biosphereGlossary } from './biosphere';
import { glossary as terraformingGlossary } from './terraforming';
import { glossary as habitabilityGlossary } from './habitability';
import { glossary as humanHabitabilityGlossary } from './humanHabitability';
import { glossary as galaxyModelGlossary } from './galaxyModel';
import { glossary as galacticDensityGlossary } from './galacticDensity';
import { glossary as placementGlossary } from './placement';
import { glossary as remnantsGlossary } from './remnants';
import { glossary as conatalGlossary } from './conatal';
import { glossary as skyGlossary } from './sky';
import { glossary as spiralArmsGlossary } from './spiralArms';
import { glossary as galaxyParametersGlossary } from './galaxyParameters';
import { glossary as starFormingComplexesGlossary } from './starFormingComplexes';
import { glossary as metallicityGlossary } from './metallicity';
import { glossary as systemConductorGlossary } from './systemConductor';
import { glossary as sectorSearchGlossary } from './sectorSearch';

/**
 * Every module's `glossary` export, concatenated in brief stage order
 * (stages 1 through 9, then the morphology/sampling layer built for stages
 * 10-12). Order is presentation convenience only; nothing downstream keys on
 * it.
 */
export const GLOSSARY: GlossaryEntry[] = [
  ...stellarPropertiesGlossary,
  ...ageGlossary,
  ...stellarPopulationGlossary,
  ...stellarHistoryGlossary,
  ...multiplicityGlossary,
  ...planetsGlossary,
  ...beltsGlossary,
  ...moonsGlossary,
  ...atmosphereGlossary,
  ...surfaceTemperatureGlossary,
  ...biosphereGlossary,
  ...terraformingGlossary,
  ...habitabilityGlossary,
  ...humanHabitabilityGlossary,
  ...galaxyModelGlossary,
  ...galacticDensityGlossary,
  ...placementGlossary,
  ...remnantsGlossary,
  ...conatalGlossary,
  ...skyGlossary,
  ...spiralArmsGlossary,
  ...galaxyParametersGlossary,
  ...starFormingComplexesGlossary,
  ...metallicityGlossary,
  ...systemConductorGlossary,
  ...sectorSearchGlossary,
];

/** Look up every glossary entry for a given module, in aggregate order. */
export function glossaryByTerm(term: string): GlossaryEntry | undefined {
  return GLOSSARY.find((e) => e.term === term);
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. NO EMPTY FIELDS - every entry has a non-empty `term`, `short`, `long`.
 *  2. STATUS IS NOT OPTIONAL - every entry's `status` is a valid LedgerStatus.
 *  3. SOURCED/CALIBRATED ENTRIES CARRY A SOURCE - only `derived` and `tunable`
 *     entries may omit `source`: an omitted source on `sourced` is a
 *     contradiction in terms, and every `calibrated` entry in this package
 *     anchors its calibration target to a real paper or dataset even though
 *     the exact constant is ours. `tunable` entries may legitimately have no
 *     source at all - that is the honest state of a number nothing in the
 *     literature constrains - so this gate does not require one from them.
 *  4. NO DUPLICATE TERMS - the aggregate is an index; two modules silently
 *     claiming the same term would make lookups ambiguous.
 *  5. NON-EMPTY - every module known to carry a ledger actually contributed
 *     at least one entry (the gate DOES fail if a module's array is
 *     accidentally left empty).
 */
export const GLOSSARY_GATES = 5 as const;
