import { equilibriumTempK, rollSurfaceTemperature } from './surfaceTemperature';
import { mulberry32, type Rng } from './rng';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

const SUN_TEMP_K = 5772, SUN_RADIUS_SOL = 1.0;

// 1. Earth's textbook blackbody equilibrium temperature (~255 K, NOT 288 K)
const earthEq = equilibriumTempK(SUN_TEMP_K, SUN_RADIUS_SOL, 1.0, 0.3);
check(`1 equilibriumTempK(Sun, 1 AU, albedo=0.3) lands near 255 K (got ${earthEq.toFixed(1)} K)`,
  Math.abs(earthEq - 255) < 5);

// 2. monotonicity
check('2 temperature decreases with distance', equilibriumTempK(SUN_TEMP_K, 1, 2, 0.3) < earthEq);
check('2b temperature increases with host temperature', equilibriumTempK(6000, 1, 1, 0.3) > earthEq);
check('2c temperature increases with host radius', equilibriumTempK(SUN_TEMP_K, 1.5, 1, 0.3) > earthEq);
check('2d temperature decreases with albedo', equilibriumTempK(SUN_TEMP_K, 1, 1, 0.6) < earthEq);

// 3. draw count
check('3 rollSurfaceTemperature consumes EXACTLY ONE draw',
  (() => {
    let calls = 0;
    const counting: Rng = () => { calls++; return 0.5; };
    rollSurfaceTemperature(counting, 'earth-like', false, SUN_TEMP_K, 1, 1);
    return calls === 1;
  })());

// 4. determinism
check('4 rollSurfaceTemperature is deterministic for the same rng and inputs',
  (() => {
    const a = rollSurfaceTemperature(mulberry32(5), 'earth-like', false, SUN_TEMP_K, 1, 1);
    const b = rollSurfaceTemperature(mulberry32(5), 'earth-like', false, SUN_TEMP_K, 1, 1);
    return JSON.stringify(a) === JSON.stringify(b);
  })());

if (failures > 0) throw new Error(`${failures} surfaceTemperature conformance failure(s)`);
console.log('\nall surfaceTemperature conformance checks passed');
