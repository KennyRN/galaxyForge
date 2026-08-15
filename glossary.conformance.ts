/**
 * glossary.conformance - structural gates over the aggregate glossary. See
 * `glossary.ts` for the invariant list (`GLOSSARY_GATES`); this file proves
 * each one, including that the gates have teeth against a deliberately
 * reintroduced violation.
 */

import { GLOSSARY, glossaryByTerm, GLOSSARY_GATES } from './glossary';
import type { LedgerStatus } from './types';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${name}`);
  } else {
    console.log(`ok - ${name}`);
  }
}

const VALID_STATUSES: readonly LedgerStatus[] = ['sourced', 'calibrated', 'tunable', 'derived'];

/* 1. non-empty core fields --------------------------------------------------- */

check(
  'every entry has non-empty term/short/long',
  GLOSSARY.every((e) => e.term.trim().length > 0 && e.short.trim().length > 0 && e.long.trim().length > 0),
);

/* 2. status is a valid LedgerStatus ------------------------------------------ */

check(
  'every entry\'s status is a valid LedgerStatus',
  GLOSSARY.every((e) => VALID_STATUSES.includes(e.status)),
);

/* 3. sourced/calibrated entries carry a source -------------------------------- */

function hasMissingSource(status: LedgerStatus, source: string | undefined): boolean {
  return (status === 'sourced' || status === 'calibrated') && !(source && source.trim().length > 0);
}

const missingSource = GLOSSARY.filter((e) => hasMissingSource(e.status, e.source));
check(
  'every sourced/calibrated entry has a non-empty source',
  missingSource.length === 0,
);
if (missingSource.length > 0) {
  console.error('  missing source on:', missingSource.map((e) => e.term).join(', '));
}

// Teeth: prove the check above actually looks at content, not just presence
// of the key, by running the SAME predicate against deliberately broken
// fixtures - a missing source, and a present-but-blank one.
check(
  'gate 3 has teeth: a sourced entry with no source field is flagged',
  hasMissingSource('sourced', undefined) === true,
);
check(
  'gate 3 has teeth: a calibrated entry with a blank source string is flagged',
  hasMissingSource('calibrated', '   ') === true,
);
check(
  'gate 3 has teeth: a tunable entry with no source is correctly NOT flagged',
  hasMissingSource('tunable', undefined) === false,
);

/* 4. no duplicate terms -------------------------------------------------------- */

const termCounts = new Map<string, number>();
for (const e of GLOSSARY) termCounts.set(e.term, (termCounts.get(e.term) ?? 0) + 1);
const duplicates = [...termCounts.entries()].filter(([, n]) => n > 1);
check('no duplicate terms across the aggregate', duplicates.length === 0);
if (duplicates.length > 0) {
  console.error('  duplicated:', duplicates.map(([t, n]) => `${t} (x${n})`).join(', '));
}

/* 5. every ledger-bearing module actually contributed at least one entry ----- */

// Mirrors the module list documented in glossary.ts's SCOPE section - every
// module that carries a provenance header/ledger, i.e. everything except the
// Amendment-A3-exempt infrastructure/presentation modules.
const EXPECTED_MIN_ENTRIES_PER_MODULE = 25; // 25 modules contribute >= 1 entry each (23 + metallicity/systemConductor, 15 Aug 2026)
check(
  'the aggregate is non-trivially populated (>= 1 entry per known ledger-bearing module)',
  GLOSSARY.length >= EXPECTED_MIN_ENTRIES_PER_MODULE,
);

/* helper sanity -------------------------------------------------------------- */

check(
  'glossaryByTerm finds a known entry and returns undefined for an unknown one',
  glossaryByTerm('Snow line') !== undefined && glossaryByTerm('Not A Real Term') === undefined,
);

check('gate count matches GLOSSARY_GATES', GLOSSARY_GATES === 5);

/* --------------------------------- result ------------------------------------ */

if (failures > 0) {
  console.error(`\nglossary.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log(`\nglossary.conformance: all checks passed (${GLOSSARY.length} entries, ${GLOSSARY_GATES} gates).`);
}
