#!/usr/bin/env node
/**
 * Prints the module manifest - what exists, what is stubbed, which PRNG channel
 * each concern owns, and which have conformance suites.
 *
 *     npm run status
 *
 * GENERATED, NEVER HAND-MAINTAINED. A hand-written status table is wrong within
 * a fortnight and then actively misleads, which is worse than absent. This reads
 * the tree, the stub list in `run-gates.js` and `CHANNELS` in `types.ts`, so it
 * is accurate by construction or it fails loudly.
 *
 * Writes MODULE-STATUS.md when passed `--write`.
 */
const fs = require('fs');
const path = require('path');

const ROOT = fs.existsSync(path.join(__dirname, 'types.ts'))
  ? __dirname : path.resolve(__dirname, '..');

/**
 * Concern -> what it owns, and which PRNG channels it claims.
 *
 * The channels are DECLARED, not inferred. An earlier revision matched channel
 * names to module names by substring and cheerfully awarded `remnantPlacement`
 * to `placement`. Ownership of a channel is a design fact, so it is stated -
 * and anything left unclaimed is REPORTED rather than quietly absorbed, because
 * an orphan channel means either a missing module or a channel nobody owns, and
 * both are worth knowing.
 *
 * `?` marks an assignment that has NOT been confirmed against the brief.
 */
const CONCERNS = {
  types:              ['shared taxonomy, SystemContext, CHANNELS registry', []],
  mathStats:          ['erf, Phi, probit, truncGaussQuantile, poissonInvCdf - no inline copies anywhere', []],
  units:              ['THE ONLY conversion site. Every ly/km/degC toggle is a call into here', []],
  galaxyModel:        ['morphology, populations, the continuous density field', []],
  galacticDensity:    ['per-cell density evaluation, Upsilon, merge pass, sector centring', []],
  densityMap:         ['the field sampled for display and region choice - a VIEW, owns no science', []],
  placement:          ['Thomas cluster process, cell-based deterministic point placement', ['placement']],
  stellarPopulation:  ['how common each class is; the age/metallicity cohort draw', ['stars', 'age?', 'metallicity?', 'formationRank?']],
  stellarProperties:  ['class -> temperature, colour, luminosity, mass, radius', []],
  stellarHistory:     ['rotation and activity class, per star', ['rotation']],
  multiplicity:       ['single / binary / triple fractions', ['companions']],
  remnants:           ['white dwarfs, neutron stars, black holes as a separate layer', ['remnantPlacement', 'remnantStar']],
  conatal:            ['co-natal remnant groups - young, chemically coherent', ['conatalGroup']],
  sky:                ['apparent magnitude and colour as seen from the sector', []],
  planets:            ['planet counts and types by star type', ['planets']],
  habitability:       ['HZ bounds and "rocky planet inside it"', []],
  belts:              ['planetoid belts - own physical model', ['belts']],
  moons:              ['moons per planet - own physical model', ['moons']],
  atmosphere:         ['abiotic atmospheres; pressure is class-native', ['atmosphere']],
  surfaceTemperature: ['OWNS equilibrium temperature - the single source of truth', ['surfaceTemperature']],
  biosphere:          ['natural abiogenesis and biosignatures', ['biosphere']],
  terraforming:       ['deliberate agency - separate from biosphere by ruling; deterministic reach/coverage threshold, no channel (16 Aug 2026)', []],
  humanHabitability:  ['HabTier and support level', []],
  metallicity:        ['[Fe/H] draw, coupled to formationRank opposite age.ts (15 Aug 2026)', ['metallicity']],
  spiralArms:         ['named-arm log-spiral density modulation, patch v2.3 (15 Aug 2026); generateSeededArms (16 Aug 2026)', ['seededArms']],
  galaxyParameters:   ['Tier G parameter block, patch v2.3 (15 Aug 2026)', []],
  starFormingComplexes: ['complexTier meso-scale star-forming-complex hierarchy, patch v2.3 (15 Aug 2026); nebular sculpting coupling, P17 (30 Aug 2026)', ['complexField']],
  ism: ['interstellar medium volume density - relative field render-only (A8), absolute midplane accessor on the generation path (P17)', ['ism']],
  nebulaMorphology: ['per-complex nebular density field - phases, fractal ISM, Stromgren/Weaver scales; sculpts complex-organised young star positions, P17 (30 Aug 2026)', ['nebula']],
  systemConductor:    ['generates one complete SystemCore end to end (15 Aug 2026)', []],
  sectorSearch:       ['interactive sector-centring search, S4.8 (15 Aug 2026)', []],
  sectorFootprint:    ['sector footprint shape clipping + generateSector/assembleSector (15-16 Aug 2026)', []],
  prugnielSimien:     ['free-Sersic-index spheroid profile, the lenticular classical bulge (16 Aug 2026)', []],
  moduleTiers:        ['Tier G/S/D module classification registry, gate R7 (16 Aug 2026)', []],
};

function declaredChannels() {
  const src = fs.readFileSync(path.join(ROOT, 'types.ts'), 'utf8');
  const block = src.slice(src.indexOf('export const CHANNELS'));
  return [...block.slice(0, block.indexOf('} as const')).matchAll(/^\s{2}([a-zA-Z]\w*)\s*:/gm)]
    .map((m) => m[1]);
}

const stubList = Object.keys(
  /STUBS = \{([\s\S]*?)\n\};/.exec(fs.readFileSync(path.join(ROOT, 'verification', 'run-gates.js'), 'utf8'))[1]
    .split('\n').filter((l) => l.trim().startsWith("'"))
    .reduce((a, l) => ({ ...a, [l.trim().split("'")[1].replace('.ts', '')]: 1 }), {}));

const present = new Set(fs.readdirSync(ROOT).filter((f) => f.endsWith('.ts')).map((f) => f.replace('.ts', '')));
const suites = new Set([...present].filter((n) => n.endsWith('.conformance')).map((n) => n.replace('.conformance', '')));

const allChannels = declaredChannels();
const claimed = new Map();
for (const [name, [, chs]] of Object.entries(CONCERNS)) {
  for (const c of chs) {
    const bare = c.replace(/\?$/, '');
    if (claimed.has(bare)) claimed.set(bare, `${claimed.get(bare)} AND ${name}`);
    else claimed.set(bare, name);
  }
}
const orphans = allChannels.filter((c) => !claimed.has(c));
const phantom = [...claimed.keys()].filter((c) => !allChannels.includes(c));
const contested = [...claimed.entries()].filter(([, v]) => v.includes(' AND '));

const rows = Object.entries(CONCERNS).map(([name, [concern, chs]]) => {
  const isPresent = present.has(name);
  const partial = isPresent &&
    /PARTIAL FILE|STAGE-0 DECLARATIONS ONLY/.test(fs.readFileSync(path.join(ROOT, `${name}.ts`), 'utf8'));
  const status = !isPresent
    ? (stubList.includes(name) ? 'not started - STUBBED for the gates' : 'not started')
    : partial ? 'PARTIAL - declarations only, ADD to it' : 'present';
  return { name, concern, status, channels: chs.length ? chs.join(', ') : '-',
           gates: suites.has(name) ? 'yes' : '-' };
});

const w = (s, n) => String(s).padEnd(n);
const out = [
  '# StarForge - module manifest',
  '',
  '**GENERATED by `verification/module-status.js`. Do not hand-edit - run `npm run status`.**',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)}. ` +
  `${rows.filter((r) => r.status === 'present').length} present, ` +
  `${rows.filter((r) => r.status.startsWith('PARTIAL')).length} partial, ` +
  `${rows.filter((r) => r.status.startsWith('not')).length} not started.`,
  '',
  '| module | concern | status | PRNG channel(s) | conformance suite |',
  '|---|---|---|---|---|',
  ...rows.map((r) => `| \`${r.name}\` | ${r.concern} | ${r.status} | ${r.channels} | ${r.gates} |`),
  '',
  '**A module with no channel is not an oversight.** `types`, `units`, `mathStats`,',
  '`galaxyModel` and `densityMap` consume no randomness. `densityMap` in particular',
  'must NEVER acquire one - a map reveals, it never rolls, and its gate 6 asserts',
  'exactly that.',
  '',
  '**Stubs retire themselves.** `run-gates.js` writes a stub only where the real',
  'file is absent, so landing a module removes its stub with no list to update.',
  '',
  '`?` marks a channel assignment not yet confirmed against the brief.',
  '',
  '## Channel reconciliation',
  '',
  `${allChannels.length} channels declared in \`types.ts\`; ${claimed.size} claimed above.`,
  '',
  orphans.length
    ? `**UNCLAIMED: ${orphans.join(', ')}** - either a module is missing from this\n` +
      'manifest or a channel exists that nobody owns. Both are worth resolving before\n' +
      'the stage-10 bump, because a channel with no owner is a seam in the wrong place.'
    : 'Every declared channel has exactly one owner.',
  ...(phantom.length ? ['', `**CLAIMED BUT NOT DECLARED: ${phantom.join(', ')}** - this manifest names a channel \`types.ts\` does not.`] : []),
  ...(contested.length ? ['', `**CONTESTED: ${contested.map(([c, v]) => `${c} (${v})`).join('; ')}** - one channel, two owners.`] : []),
].join('\n');

if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(ROOT, 'MODULE-STATUS.md'), out + '\n');
  console.log('written: MODULE-STATUS.md');
} else {
  console.log(out);
}
