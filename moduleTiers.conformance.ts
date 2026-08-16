/**
 * moduleTiers.conformance - gate R7 (ported name, see moduleTiers.ts's own
 * header for provenance).
 *
 * DELIBERATELY BROKEN, to see each check actually catch something:
 *   put stellarPopulation back as 'G'                -> R7a fails
 *   re-export pickClass from galacticDensity          -> R7b fails
 *   re-export densityByPopulationAtCartesian/upsilonFor from stellarPopulation -> R7c fails
 */

import { MODULE_TIER, tierOf } from './moduleTiers';
import type { ModuleName, ModuleTier } from './moduleTiers';
import * as galacticDensity from './galacticDensity';
import * as stellarPopulation from './stellarPopulation';
import * as fs from 'fs';
import * as path from 'path';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${name}`); } else { console.log(`ok - ${name}`); }
}

const TIERS: readonly ModuleTier[] = ['G', 'S', 'D'];
const names = Object.keys(MODULE_TIER) as ModuleName[];

check('R7 every module in MODULE_TIER has exactly one of G/S/D',
  names.every((n) => TIERS.includes(MODULE_TIER[n])));

check('R7a galacticDensity is Tier G and stellarPopulation is Tier S - this ' +
  "project's own analogue of the sibling build's stellarDensity/stellarPopulation split",
  tierOf('galacticDensity') === 'G' && tierOf('stellarPopulation') === 'S');

check('R7b galacticDensity does not own pickClass (a Tier S concern)',
  !('pickClass' in galacticDensity));

check('R7c stellarPopulation does not own densityByPopulationAtCartesian or upsilonFor (Tier G concerns)',
  !('densityByPopulationAtCartesian' in stellarPopulation) && !('upsilonFor' in stellarPopulation));

check('R7d galacticDensity genuinely owns densityByPopulationAtCartesian and upsilonFor',
  typeof galacticDensity.densityByPopulationAtCartesian === 'function' &&
  typeof galacticDensity.upsilonFor === 'function');

check('R7e stellarPopulation genuinely owns pickClass',
  typeof stellarPopulation.pickClass === 'function');

// A Tier G module list and a Tier S module list must be disjoint - the
// Record type forbids a module appearing twice, and this check makes the
// invariant readable in the gate output rather than merely type-enforced.
const byTier: Record<ModuleTier, string[]> = { G: [], S: [], D: [] };
for (const n of names) byTier[MODULE_TIER[n]].push(n);
check('R7f the three tier lists partition MODULE_TIER with no overlap and no gap',
  byTier.G.length + byTier.S.length + byTier.D.length === names.length &&
  byTier.G.includes('galacticDensity') && byTier.G.includes('placement') && byTier.G.includes('remnants') &&
  byTier.S.includes('stellarPopulation') && byTier.S.includes('systemConductor') &&
  byTier.D.includes('units') && byTier.D.includes('render'));

// Reach OUT of the ephemeral .gate-tmp/build staging area (same pattern
// goldenMaster.conformance.ts uses) into the real project root, so this
// checks the ACTUAL shipped files, not just the table's own internal
// consistency.
const PROJECT_ROOT = path.join(__dirname, '..', '..');
check('R7g every module in MODULE_TIER actually exists as a real .ts file this ' +
  'package ships (a stale/renamed entry would otherwise sit in the table ' +
  'forever, silently wrong, and this is the only thing that would catch it)',
  names.every((n) => fs.existsSync(path.join(PROJECT_ROOT, `${n}.ts`))));

if (failures > 0) {
  console.error(`\nmoduleTiers.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nmoduleTiers.conformance: all checks passed.');
}
