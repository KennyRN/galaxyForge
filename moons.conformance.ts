import { rollMoons, hillRadiusAu, stableMoonLimitAu, type MoonHostInputs } from './moons';
import { mulberry32, type Rng } from './rng';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

const EARTH_LIKE: MoonHostInputs = {
  planetAu: 1.0, planetFormationAu: 1.0, planetMassEarth: 1.0, planetRadiusEarth: 1.0,
  planetEccentricity: 0, planetKind: 'rocky', starMassSol: 1.0, hostLuminositySol: 1.0,
};
const GIANT: MoonHostInputs = {
  planetAu: 5.0, planetFormationAu: 6.0, planetMassEarth: 317.8, planetRadiusEarth: 11.2,
  planetEccentricity: 0.05, planetKind: 'giant', starMassSol: 1.0, hostLuminositySol: 1.0,
};

const AU_PER_KM = 6.6845871e-9;
const EARTH_RADIUS_KM = 6371;

// 1. stability limit enforced at draw time
check('1 no moon ever exceeds its own sense\'s stable limit, across many hosts/seeds',
  (() => {
    for (let seed = 0; seed < 300; seed++) {
      for (const host of [EARTH_LIKE, GIANT]) {
        const moons = rollMoons(mulberry32(seed), host, 5);
        const hillAu = hillRadiusAu(host.planetAu, host.planetMassEarth, host.starMassSol);
        const planetRadiusAu = host.planetRadiusEarth * EARTH_RADIUS_KM * AU_PER_KM;
        for (const m of moons) {
          const limitAu = stableMoonLimitAu(hillAu, m.sense, host.planetEccentricity);
          const orbitAu = m.orbitRp * planetRadiusAu;
          if (orbitAu > limitAu * 1.0001) return false;
        }
      }
    }
    return true;
  })());

// 2. transposition guard
check('2 PROGRADE fraction is smaller than RETROGRADE fraction (0.40 < 0.70)',
  (() => {
    const hillAu = 1.0;
    return stableMoonLimitAu(hillAu, 'prograde', 0) < stableMoonLimitAu(hillAu, 'retrograde', 0);
  })());

// 3. eccentricity shrinks the stable zone
check('3 raising planetEccentricity strictly shrinks stableMoonLimitAu, both senses',
  (['prograde', 'retrograde'] as const).every((sense) => {
    const hillAu = 1.0;
    const eccs = [0, 0.1, 0.3, 0.6, 0.9];
    const limits = eccs.map((e) => stableMoonLimitAu(hillAu, sense, e));
    return limits.every((l, i) => i === 0 || l < limits[i - 1]!);
  }));

// 4. draw count
check('4 rollMoons consumes EXACTLY FOUR draws per moon',
  (() => {
    let calls = 0;
    const counting: Rng = () => { calls++; return 0.5; };
    rollMoons(counting, EARTH_LIKE, 3);
    return calls === 12;
  })());

// 5. composition from formationAu
check('5 composition uses FORMATION Au, not current Au (icy formation, ' +
  'migrated-in current position, still icy)',
  (() => {
    const migratedHost: MoonHostInputs = { ...EARTH_LIKE, planetAu: 0.3, planetFormationAu: 20 };
    const moons = rollMoons(mulberry32(1), migratedHost, 3);
    return moons.every((m) => m.composition === 'ice');
  })());

// 6. origin rules
check('6 every retrograde moon has origin capture; impact only for prograde ' +
  'moons of rocky planets',
  (() => {
    for (let seed = 0; seed < 300; seed++) {
      for (const host of [EARTH_LIKE, GIANT]) {
        const moons = rollMoons(mulberry32(seed), host, 5);
        for (const m of moons) {
          if (m.sense === 'retrograde' && m.origin !== 'capture') return false;
          if (m.origin === 'impact' && (m.sense !== 'prograde' || host.planetKind !== 'rocky')) return false;
        }
      }
    }
    return true;
  })());
check('6b impact-origin moons DO occur for rocky planets over enough draws ' +
  '(the mechanism actually fires, not just type-checks)',
  (() => {
    for (let seed = 0; seed < 500; seed++) {
      const moons = rollMoons(mulberry32(seed), EARTH_LIKE, 5);
      if (moons.some((m) => m.origin === 'impact')) return true;
    }
    return false;
  })());

// 7. determinism
check('7 rollMoons is deterministic for the same rng sequence and inputs',
  (() => {
    const a = rollMoons(mulberry32(9), GIANT, 4);
    const b = rollMoons(mulberry32(9), GIANT, 4);
    return JSON.stringify(a) === JSON.stringify(b);
  })());

if (failures > 0) throw new Error(`${failures} moons conformance failure(s)`);
console.log('\nall moons conformance checks passed');
