#!/usr/bin/env python3
r"""
Migrate ``entries.json`` geographic metadata into forage post frontmatter.

For each entry in ``subprojects/modern_forage/geography/entries.json``:
  - Locate the corresponding forage post (by dish-name → H3/H2 heading
    match, with cbsa_name disambiguation when multiple posts share the
    dish name; pattern posts are excluded as match targets for non-
    pattern entries).
  - Aggregate the entry's geo fields (cbsa, primary_county, named_regions,
    state, scope) into the post's ``geo:`` frontmatter block.

For posts where multiple entries map to it, their geo fields get merged:
  - Fields with consensus become the post-level ``geo`` block.
  - Fields where entries diverge get the majority value at post level
    plus a ``dishes:`` list entry recording the per-dish override. That
    list is the Obsidian-native way to express per-dish exceptions: it
    sits in the frontmatter (queryable by Obsidian Bases) rather than
    in Pandoc-style heading attribute syntax.

Pattern-only entries become ``geo.pattern: true`` on the matched post.

Default: dry-run. Use ``--apply`` to write changes.
Output report: ``subprojects/modern_forage/scripts/migration-report.json``.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
FORAGE_DIR = REPO / "src/content/forage"
ENTRIES_JSON = REPO / "subprojects/modern_forage/geography/entries.json"
COUNTIES_JSON = REPO / "subprojects/modern_forage/geography/counties.json"
ZONES_JSON = REPO / "subprojects/modern_forage/geography/zones.json"
REPORT = REPO / "subprojects/modern_forage/scripts/migration-report.json"

DISH_HEADING = re.compile(
    r'^(#{2,3})[ \t]+(.+?)[ \t]+\\?\{\.dish\\?\}[ \t]*$',
    re.MULTILINE,
)
EMDASH_SPLIT = re.compile(r"\s[—–\-]\s")

# Pattern entries don't always share a slug-prefix with their post.
# Hardcode the small set of pattern_only → post mappings here.
PATTERN_SLUG_TO_POST: dict[str, str] = {
    "chinese-american-regional-adaptations": "chinese-american",
    "greek-american-regional-adaptations": "greek-diner-empire",
    "basque-american-corridor": "mining-corridors",
    "cornish-mining-pasty-corridor": "mining-corridors",
    "el-paso-borderland-cuisine-distinct-from-tex-mex": "el-paso",
    # No post yet (skipped during migration):
    # "vietnamese-american-regional-adaptations": None,
    # "japanesekorean-american-regional-adaptation": None,
    # "german-russian-great-plains-foodways": None,
    # "beverage-regionalism": None,
    # "regional-condiment-containment": None,
    # "south-carolina-mustard-based-bbq-sauce": None,
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write changes (default: dry-run)")
    args = parser.parse_args()

    entries = json.loads(ENTRIES_JSON.read_text())

    headings_by_dish, post_paths, pattern_posts = _scan_forage_posts()

    # Stage 1: map each entry to a post.
    plan: list[dict] = []
    unmapped: list[dict] = []
    for e in entries:
        target = _map_entry_to_post(e, headings_by_dish, post_paths, pattern_posts)
        if target is None:
            unmapped.append({"slug": e["slug"], "dish": e["dish"], "reason": "no post match"})
            continue
        plan.append({"entry": e, "post_id": target})

    # Stage 2: per-post geo + per-dish overrides.
    per_post: dict[str, list[dict]] = defaultdict(list)
    for item in plan:
        per_post[item["post_id"]].append(item["entry"])

    post_geo: dict[str, dict] = {}
    post_dishes: dict[str, list[dict]] = {}
    for post_id, ents in per_post.items():
        merged, overrides = _merge_geo(ents)
        post_geo[post_id] = merged
        if overrides:
            post_dishes[post_id] = overrides

    # Stage 3: write `geo:` + optional `dishes:` blocks into each post's frontmatter.
    written: list[str] = []
    skipped_already: list[str] = []
    for post_id, geo in post_geo.items():
        mdx_path = post_paths.get(post_id)
        if not mdx_path:
            unmapped.append({"slug": post_id, "dish": "(post-level)", "reason": "post path missing"})
            continue
        content = mdx_path.read_text()
        if re.search(r"^geo:", content, re.MULTILINE):
            skipped_already.append(post_id)
            continue
        new_content = _inject_blocks(content, geo, post_dishes.get(post_id, []))
        if args.apply:
            mdx_path.write_text(new_content)
        written.append(post_id)

    report = {
        "mode": "apply" if args.apply else "dry-run",
        "summary": {
            "entries_total": len(entries),
            "mapped_to_posts": sum(len(v) for v in per_post.values()),
            "posts_touched": len(post_geo),
            "posts_with_dish_overrides": len(post_dishes),
            "posts_already_have_geo": len(skipped_already),
            "unmapped": len(unmapped),
        },
        "posts": {
            post_id: {
                "geo": post_geo[post_id],
                "dishes": post_dishes.get(post_id, []),
                "entries": [e["slug"] for e in per_post[post_id]],
            }
            for post_id in sorted(post_geo)
        },
        "skipped_already_have_geo": skipped_already,
        "unmapped": unmapped,
        "notes": [
            "Per-dish override syntax: the post's frontmatter `dishes:` list",
            "carries per-dish exceptions. Each entry is keyed by `name` (the",
            "H3/H2 dish-portion text) and lists only the fields that diverge",
            "from the post-level `geo:` block. This is the Obsidian-native",
            "replacement for the previous `{.dish cbsa=\"...\"}` attribute",
            "syntax in headings.",
            "",
            "Pattern entries without a corresponding forage post are listed",
            "in `unmapped`; they are not migratable until the post exists or",
            "the entry is dropped.",
            "",
            "Per the 'fix bugs during migration' rule: the majority value of",
            "each diverging field becomes the post-level default. Minority",
            "values are emitted as per-dish overrides. Review the `dishes:`",
            "entries on each post: if an override looks like a stale auto-",
            "match bug from entries.json (e.g., a dish mis-tagged with a CBSA",
            "from another state), drop it rather than freeze it into MDX.",
        ],
    }
    REPORT.write_text(json.dumps(report, indent=2))
    print(f"[migrate] {report['summary']}")
    print(f"[migrate] report: {REPORT}")
    if args.apply:
        print(f"[migrate] wrote geo block to {len(written)} posts")


def _scan_forage_posts() -> tuple[dict[str, list[dict]], dict[str, Path], set[str]]:
    """
    Returns (headings_by_dish, post_paths, pattern_post_ids). Pattern posts
    are those with any H2 ``{.dish}`` heading — pattern posts use H2 to
    distinguish themselves from per-city posts. They are excluded from
    non-pattern entry mapping so a dish like St. Paul Sandwich (which
    appears as both an H2 in the chinese-american pattern post and an H3
    in the st-louis city post) correctly maps to st-louis.
    """
    headings_by_dish: dict[str, list[dict]] = defaultdict(list)
    post_paths: dict[str, Path] = {}
    pattern_posts: set[str] = set()
    for mdx in sorted(FORAGE_DIR.glob("*/index.*")):
        if mdx.suffix not in (".md", ".mdx"):
            continue
        post_id = mdx.parent.name
        post_paths[post_id] = mdx
        body = mdx.read_text()
        if body.startswith("---"):
            end = body.find("\n---", 3)
            if end >= 0:
                body = body[end + 4 :]
        for m in DISH_HEADING.finditer(body):
            heading = m.group(2).strip()
            dish_portion = EMDASH_SPLIT.split(heading)[0].strip()
            depth = len(m.group(1))
            if depth == 2:
                pattern_posts.add(post_id)
            headings_by_dish[dish_portion.lower()].append(
                {
                    "post_id": post_id,
                    "heading": heading,
                    "depth": depth,
                }
            )
    return headings_by_dish, post_paths, pattern_posts


def _map_entry_to_post(
    entry: dict,
    headings_by_dish: dict[str, list[dict]],
    post_paths: dict[str, Path],
    pattern_posts: set[str],
) -> str | None:
    if entry.get("pattern_only"):
        post_id = PATTERN_SLUG_TO_POST.get(entry["slug"])
        if post_id and post_id in post_paths:
            return post_id
        return None

    dish_key = entry["dish"].lower()
    raw_hits = list(headings_by_dish.get(dish_key, []))
    if not raw_hits:
        for k, vs in headings_by_dish.items():
            if k in dish_key or dish_key in k:
                raw_hits.extend(vs)

    non_pattern_hits = [h for h in raw_hits if h["post_id"] not in pattern_posts]
    hits = non_pattern_hits or raw_hits
    if not hits:
        return None
    if len(hits) == 1:
        return hits[0]["post_id"]

    cbsa_name = entry.get("cbsa_name") or ""
    if cbsa_name:
        city = cbsa_name.split(",")[0].split("-")[0].strip()
        token = re.sub(r"[^a-z0-9]", "", city.lower())
        for h in hits:
            post_token = re.sub(r"[^a-z0-9]", "", h["post_id"].lower())
            if token and token in post_token:
                return h["post_id"]
    return hits[0]["post_id"]


def _merge_geo(entries: list[dict]) -> tuple[dict, list[dict]]:
    """
    Returns (post_level_geo, dish_overrides).

    Post-level geo uses the majority value for each diverging field.
    Dish overrides list contains one entry per dish whose geo diverges
    from the post-level default.
    """
    if all(e.get("pattern_only") for e in entries):
        return ({"pattern": True}, [])

    scalar_fields = ["cbsa_code", "primary_county_fips", "state", "scope"]
    consensus: dict = {}
    per_dish_diffs: dict[str, dict] = defaultdict(dict)

    for f in scalar_fields:
        values_to_slugs: dict[str, list[str]] = defaultdict(list)
        for e in entries:
            v = e.get(f)
            if v is None:
                continue
            values_to_slugs[str(v)].append(e["slug"])
        if not values_to_slugs:
            continue
        # Majority by entry-count.
        majority_value, _ = max(values_to_slugs.items(), key=lambda kv: len(kv[1]))
        consensus[f] = majority_value
        # Anyone not in the majority is a per-dish override.
        for value, slugs in values_to_slugs.items():
            if value == majority_value:
                continue
            for s in slugs:
                per_dish_diffs[s][f] = value

    # zones (named_regions) — union per entry; flag divergences as overrides.
    post_zones: set[str] = set()
    entry_zones: dict[str, set[str]] = {}
    for e in entries:
        ez = set(e.get("named_regions") or [])
        entry_zones[e["slug"]] = ez
        post_zones |= ez
    # If all entries share the same zone set, promote to post-level. If they
    # differ, the most-common zone set wins at post level; divergent entries
    # get a per-dish `zones` override with their full zone list.
    if entry_zones:
        zone_counts: dict[frozenset[str], int] = defaultdict(int)
        for ez in entry_zones.values():
            zone_counts[frozenset(ez)] += 1
        majority_zones = max(zone_counts.items(), key=lambda kv: kv[1])[0]
        if majority_zones:
            consensus["zones"] = sorted(majority_zones)
        for s, ez in entry_zones.items():
            if frozenset(ez) != majority_zones:
                per_dish_diffs[s]["zones"] = sorted(ez)

    # division (census_divisions) — same majority logic.
    entry_divs: dict[str, str | None] = {}
    for e in entries:
        divs = e.get("census_divisions") or []
        entry_divs[e["slug"]] = divs[0] if divs else None
    div_counts: dict[str | None, int] = defaultdict(int)
    for d in entry_divs.values():
        if d:
            div_counts[d] += 1
    if div_counts:
        majority_div = max(div_counts.items(), key=lambda kv: kv[1])[0]
        consensus["division"] = majority_div
        for s, d in entry_divs.items():
            if d and d != majority_div:
                per_dish_diffs[s]["division"] = d

    # Build the post-level `geo:` dict (drop None values, rename fields).
    geo: dict = {}
    if consensus.get("cbsa_code"):
        geo["cbsa"] = consensus["cbsa_code"]
    if consensus.get("primary_county_fips"):
        geo["primary_county"] = consensus["primary_county_fips"]
    if consensus.get("zones"):
        geo["zones"] = consensus["zones"]
    if consensus.get("division"):
        geo["division"] = consensus["division"]
    if consensus.get("scope"):
        geo["scope"] = consensus["scope"]
    # Only emit `states` (no CBSA) when this is a statewide / regional
    # state-anchored entry — when a CBSA is present, the state is derivable.
    if not geo.get("cbsa"):
        all_states = sorted({e["state"] for e in entries if e.get("state")})
        if all_states:
            geo["states"] = all_states

    # Build per-dish override list. Skip cbsa/primary_county/state diffs
    # by default: those almost always reflect a stale auto-match in
    # entries.json (a dish picked up the wrong CBSA from a substring
    # match like "Albany Park, Chicago" → "Albany, GA"). Per the
    # migration policy of fixing bugs rather than replicating them, we
    # drop those silently and trust the post-level geo. Scope, zones,
    # and division overrides ARE preserved (those are legitimate within-
    # post gradations like hyperlocal-within-a-city).
    SUSPECT_FIELDS = {"cbsa_code", "primary_county_fips", "state"}
    overrides: list[dict] = []
    slug_to_entry = {e["slug"]: e for e in entries}
    for slug, diffs in per_dish_diffs.items():
        entry = slug_to_entry[slug]
        o: dict = {"name": entry["dish"]}
        for f, v in diffs.items():
            if f in SUSPECT_FIELDS:
                continue
            if f == "scope":
                o["scope"] = v
            elif f == "zones":
                o["zones"] = v
            elif f == "division":
                o["division"] = v
        # If after filtering there are no legitimate overrides for this
        # dish, drop the entry entirely (only the suspect fields differed).
        if len(o) > 1:
            overrides.append(o)
    overrides.sort(key=lambda d: d["name"])
    return geo, overrides


def _inject_blocks(content: str, geo: dict, dishes: list[dict]) -> str:
    """Insert ``geo:`` and optional ``dishes:`` blocks into the frontmatter."""
    lines = content.split("\n")
    if not lines or lines[0].strip() != "---":
        raise ValueError("Post does not start with frontmatter")
    end_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_idx = i
            break
    if end_idx is None:
        raise ValueError("Unterminated frontmatter")
    block = _format_geo_block(geo)
    if dishes:
        block += _format_dishes_block(dishes)
    new_lines = lines[:end_idx] + block + lines[end_idx:]
    return "\n".join(new_lines)


def _format_geo_block(geo: dict) -> list[str]:
    out = ["geo:"]
    for k in ["cbsa", "primary_county", "division", "scope"]:
        if k in geo:
            v = geo[k]
            if isinstance(v, str) and re.fullmatch(r"\d+", v):
                out.append(f'  {k}: "{v}"')
            else:
                out.append(f"  {k}: {v}")
    if "zones" in geo:
        out.append("  zones:")
        for z in geo["zones"]:
            out.append(f"    - {z}")
    if "states" in geo:
        out.append("  states:")
        for s in geo["states"]:
            out.append(f"    - {s}")
    if geo.get("pattern"):
        out.append("  pattern: true")
    return out


def _format_dishes_block(dishes: list[dict]) -> list[str]:
    out = ["dishes:"]
    for d in dishes:
        # Quote the dish name so colons / quotes inside the name stay safe.
        name = d["name"].replace('"', '\\"')
        out.append(f'  - name: "{name}"')
        for k in ["cbsa", "primary_county", "division", "scope"]:
            if k in d:
                v = d[k]
                if isinstance(v, str) and re.fullmatch(r"\d+", v):
                    out.append(f'    {k}: "{v}"')
                else:
                    out.append(f"    {k}: {v}")
        if "zones" in d:
            if d["zones"]:
                out.append("    zones:")
                for z in d["zones"]:
                    out.append(f"      - {z}")
            else:
                # Flow-style empty array: a dish that explicitly overrides
                # the post's zones to none (e.g., Persimmon Pudding in the
                # east-north-central-non-msa post is Indiana, not UP Michigan).
                out.append("    zones: []")
        if "states" in d:
            if d["states"]:
                out.append("    states:")
                for s in d["states"]:
                    out.append(f"      - {s}")
            else:
                out.append("    states: []")
        if d.get("pattern"):
            out.append("    pattern: true")
    return out


if __name__ == "__main__":
    main()
