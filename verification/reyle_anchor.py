#!/usr/bin/env python3
"""
StarForge - Reyle 10 pc anchor query.

Runs the system-count anchor against GAVO's TAP service and emits a provenance
record in the form S4.1 requires: the DATASET version and the retrieval date
recorded beside the result, not merely the protocol version.

    pip install pyvo astropy
    python3 verification/reyle_anchor.py

Writes reyle_anchor_result.json and prints a paste-ready provenance block.

-- WHAT THIS SCRIPT IS FOR --------------------------------------------------
It closes the one outstanding verification obligation in S2.3. The anchor is a
count of SYSTEMS containing at least one hydrogen-burning star, and the ruling
behind that restriction is in S4.1: `stellarPopulation` draws class conditional
on age with survivorship divided out, so it CANNOT produce a lone white dwarf.
Remnant-only systems are `remnants`' concern and sit on top of this anchor with
their own normalisation against Holberg (S5.2). Counting them here would
double-count that layer.

Two provenance rules are load-bearing and are why this file exists rather than
a note saying "run this ADQL":

  1. THE DATASET VERSION IS NOT THE PROTOCOL VERSION. `svc.capabilities` tells
     you TAP 1.1 - how you talked to the service. It says nothing about which
     edition of the catalogue answered. The 10 pc list is LIVING: entries have
     been deleted since publication. The registry record's `updated` date is
     the version stamp; the TAP capability version is not.
  2. THE CATALOGUE'S IVOID IS NOT THE ENDPOINT'S IVOID. `ivo://org.gavo.dc/tap`
     identifies the TAP service. The catalogue is a separate registry resource
     and its identifier is DISCOVERED here rather than hardcoded, because a
     guessed ivoid recorded as provenance is worse than none.
"""

import json
import sys
import math
import datetime as _dt

import pyvo as vo
from pyvo.dal import DALQueryError

TAP_URL = "https://dc.g-vo.org/tap"
REGISTRY_URL = "http://reg.g-vo.org/tap"
TABLE = "tenpc.main"

# The volume the density divides by. NOT exact: Reyle kept a few targets at
# slightly more than d = 10 pc where the distance is consistent with 10 pc
# within uncertainties. Recorded as an assumption, never applied silently.
SPHERE_RADIUS_PC = 10.0
SPHERE_VOLUME_PC3 = 4.0 / 3.0 * math.pi * SPHERE_RADIUS_PC ** 3

# obj_cat vocabulary per Reyle et al. (2021) Table 1:
#   '*'  star            'LM'  low-mass star
#   'BD' brown dwarf     'WD'  white dwarf      'Planet'  exoplanet
KNOWN_CATEGORIES = {"*", "LM", "BD", "WD", "Planet"}

ADOPTED_VARIANT = "stars_only"

VARIANTS = {
    # ADOPTED. Hydrogen-burning stars only, per the S4.1 ruling. Drops systems
    # whose sole member is a white dwarf (van Maanen 2, LP 145-141, ...).
    "stars_only": "obj_cat IN ('*', 'LM')",
    # DIAGNOSTIC ONLY - DO NOT ADOPT. Including white dwarfs here double-counts
    # the `remnants` layer, which places single remnants on its own sourced
    # normalisation (Holberg 2016, S5.2). Recorded because the gap between this
    # and `stars_only` IS the single-WD population, which is a useful
    # independent cross-check on the ~15 +/- 4 figure S5.2 predicts for 10 pc.
    "stars_and_wd": "obj_cat IN ('*', 'LM', 'WD')",
    # DIAGNOSTIC ONLY. Everything except planets - the published 'stars, brown
    # dwarfs and exoplanets' framing minus the planets. EXPECT THIS TO DIFFER
    # from the published headline count. The list is living and entries have
    # been deleted since publication; that discrepancy is not a bug, it is the
    # evidence for why a retrieval date is mandatory. Record the difference.
    "substellar_incl": "obj_cat IN ('*', 'LM', 'WD', 'BD')",
}

# Every ADQL statement actually executed, so the JSON record stands alone.
QUERIES = []


def _fail(msg):
    raise SystemExit(f"ABORT: {msg}")


def _text(value):
    """VOTable char cells may arrive as str, bytes or a masked NULL."""
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode("utf-8", "replace")
    try:
        import numpy as np
        if value is np.ma.masked:
            return ""
    except Exception:
        pass
    text = str(value)
    return "" if text == "--" else text


def run(svc, adql, label=""):
    QUERIES.append({"label": label, "adql": " ".join(adql.split())})
    return svc.run_sync(adql).to_table()


def verify_schema(svc):
    """Confirm table and columns exist before counting anything."""
    cols = run(
        svc,
        f"SELECT column_name FROM tap_schema.columns WHERE table_name = '{TABLE}'",
        "schema: columns",
    )
    names = {_text(c).lower() for c in cols["column_name"]} - {""}
    if not names:
        _fail(f"{TABLE} not found in tap_schema.columns - table renamed?")
    for required in ("nb_sys", "obj_cat"):
        if required not in names:
            _fail(f"column '{required}' absent from {TABLE}. Present: {sorted(names)}")
    return sorted(names)


def table_description(svc):
    rows = run(
        svc,
        f"SELECT description FROM tap_schema.tables WHERE table_name = '{TABLE}'",
        "schema: table description",
    )
    return _text(rows["description"][0]) if len(rows) else ""


def dataset_provenance():
    """
    Discover the CATALOGUE's registry record - its ivoid and, critically, the
    date it was last updated. This is the dataset version stamp S4.1 demands.
    Failure here is recorded, not fatal: the counts are still worth having, but
    a result carrying no dataset version must say so loudly rather than let a
    protocol version stand in for one.
    """
    try:
        reg = vo.dal.TAPService(REGISTRY_URL)
        rows = reg.run_sync(
            "SELECT r.ivoid, r.res_title, r.short_name, r.created, r.updated "
            "FROM rr.resource AS r JOIN rr.res_table AS t ON r.ivoid = t.ivoid "
            f"WHERE t.table_name = '{TABLE}'"
        ).to_table()
    except Exception as exc:
        # Deliberately permissive: provenance lookup failing must not lose the
        # counts. The failure is recorded loudly instead.
        return {"resolved": False, "error": f"{type(exc).__name__}: {exc}"}

    if not len(rows):
        return {
            "resolved": False,
            "error": f"no registry resource advertises table '{TABLE}'",
        }
    row = rows[0]
    return {
        "resolved": True,
        "registry": REGISTRY_URL,
        "ivoid": _text(row["ivoid"]),
        "title": _text(row["res_title"]),
        "short_name": _text(row["short_name"]),
        "created": _text(row["created"]),
        "updated": _text(row["updated"]),
    }


def count_systems(svc, predicate, label=""):
    """COUNT(DISTINCT ...) with an ADQL-2.0-safe fallback.

    COUNT(DISTINCT x) is not in ADQL 2.0 core, though DaCHS supports it. The
    fallback catches DALQueryError specifically: a network or authentication
    failure must propagate rather than trigger a pointless retry that then
    raises a second, more confusing error.
    """
    try:
        r = run(
            svc,
            f"SELECT COUNT(DISTINCT nb_sys) AS nsys FROM {TABLE} WHERE {predicate}",
            label,
        )
        return int(r["nsys"][0])
    except DALQueryError as first:
        try:
            r = run(
                svc,
                "SELECT COUNT(*) AS nsys FROM ("
                f"SELECT DISTINCT nb_sys FROM {TABLE} WHERE {predicate}"
                ") AS q",
                f"{label} (subquery fallback)",
            )
            return int(r["nsys"][0])
        except DALQueryError as second:
            raise RuntimeError(
                f"both COUNT(DISTINCT) and the subquery fallback failed for "
                f"[{predicate}]: {second}"
            ) from first


def scalar(svc, adql, col, label=""):
    return int(run(svc, adql, label)[col][0])


def main():
    svc = vo.dal.TAPService(TAP_URL)

    # --- protocol version. NOT the dataset version; see the module docstring.
    protocol = []
    for cap in svc.capabilities:
        for intf in getattr(cap, "interfaces", []):
            v = getattr(intf, "version", None)
            if v:
                protocol.append(f"{getattr(cap, 'standardid', '?')} v{v}")

    dataset = dataset_provenance()
    columns = verify_schema(svc)
    desc = table_description(svc)

    counts = {k: count_systems(svc, p, f"count: {k}") for k, p in VARIANTS.items()}
    n_objects = scalar(svc, f"SELECT COUNT(*) AS n FROM {TABLE}", "n", "count: objects")
    n_systems_all = count_systems(svc, "1 = 1", "count: all categories")

    cat_rows = run(
        svc,
        f"SELECT obj_cat, COUNT(*) AS n FROM {TABLE} GROUP BY obj_cat",
        "census: obj_cat",
    )
    categories = {_text(r["obj_cat"]): int(r["n"]) for r in cat_rows}
    unexpected = sorted(set(categories) - KNOWN_CATEGORIES)

    # --- the numbers the module actually consumes -------------------------
    adopted = counts[ADOPTED_VARIANT]
    derived = {
        "adopted_variant": ADOPTED_VARIANT,
        "n_systems_adopted": adopted,
        # THIS is the number a future re-anchor needs. The absolute count moves
        # every time the catalogue is revised; the restriction factor is far
        # more stable, and it is what converts any published systems total into
        # a hydrogen-burning one.
        "restriction_factor": (
            round(adopted / n_systems_all, 6) if n_systems_all else None
        ),
        "single_wd_systems_implied": counts["stars_and_wd"] - adopted,
        "systems_density_pc3": round(adopted / SPHERE_VOLUME_PC3, 8),
        "assumed_sphere_volume_pc3": round(SPHERE_VOLUME_PC3, 4),
        "volume_caveat": (
            "Density assumes a strict 10 pc sphere. Reyle retains a few targets "
            "slightly beyond 10 pc whose distance is consistent with 10 pc within "
            "uncertainties, so the true sample volume is marginally larger and this "
            "density is a marginal OVER-estimate. Record, do not silently correct."
        ),
    }

    record = {
        "query_service": TAP_URL,
        "table": TABLE,
        "retrieved_utc": _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds"),
        "dataset_provenance": dataset,
        "protocol_capabilities": sorted(set(protocol)),
        "toolchain": {
            "python": sys.version.split()[0],
            "pyvo": getattr(vo, "__version__", "unknown"),
        },
        "table_description": desc,
        "columns_present": columns,
        "obj_cat_census": categories,
        "unexpected_categories": unexpected,
        "n_objects_total": n_objects,
        "n_systems_all_categories": n_systems_all,
        "n_systems_by_variant": counts,
        "predicates": VARIANTS,
        "derived": derived,
        "queries_executed": QUERIES,
    }

    with open("reyle_anchor_result.json", "w") as fh:
        json.dump(record, fh, indent=2)

    print("\n=== obj_cat census ===")
    for k, v in sorted(categories.items()):
        print(f"  {k:<8} {v}")
    if unexpected:
        print(f"\n  UNEXPECTED CATEGORIES: {unexpected}")
        print("    The obj_cat vocabulary has drifted. Re-read Reyle Table 1")
        print("    before trusting the predicates below.")
    print(f"\n  total objects            {n_objects}")
    print(f"  total systems (all cats) {n_systems_all}")

    print("\n=== system counts by variant ===")
    for k, v in counts.items():
        tag = "ADOPTED  " if k == ADOPTED_VARIANT else "diagnostic"
        print(f"  {k:<18} {v:>4}  {tag}  [{VARIANTS[k]}]")
    print("\n  Diagnostics are recorded, never adopted: counting white dwarfs")
    print("  here would double-count the `remnants` layer (S4.1, S5.2).")

    print("\n=== derived - what the module consumes ===")
    print(f"  systems (hydrogen-burning)  {derived['n_systems_adopted']}")
    print(f"  restriction factor          {derived['restriction_factor']}")
    print(f"  single-WD systems implied   {derived['single_wd_systems_implied']}"
          "   (cross-check: S5.2 predicts ~15 +/- 4)")
    print(f"  density                     {derived['systems_density_pc3']:.6f} systems/pc^3")
    print(f"  volume assumed              {derived['assumed_sphere_volume_pc3']} pc^3 - see caveat in JSON")

    print("\n=== provenance (S4.1) ===")
    if dataset.get("resolved"):
        print(f"  dataset   {dataset['ivoid']}")
        print(f"            {dataset['title']}")
        print(f"            created {dataset['created']}   UPDATED {dataset['updated']}")
    else:
        print(f"  dataset   NOT RESOLVED - {dataset.get('error')}")
        print("            The result carries NO dataset version. Resolve this")
        print("            before the anchor is called final; a protocol version")
        print("            is not a substitute.")
    print(f"  endpoint  {TAP_URL}")
    print(f"  protocol  {', '.join(record['protocol_capabilities']) or 'version not advertised'}")
    print(f"  table     {TABLE}")
    print(f"  retrieved {record['retrieved_utc']}")
    print(f"  toolchain python {record['toolchain']['python']}, pyvo {record['toolchain']['pyvo']}")
    print("\nWritten: reyle_anchor_result.json")


if __name__ == "__main__":
    main()
