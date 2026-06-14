# -*- coding: utf-8 -*-
"""
EZC Harare Boundaries Importer
================================
Reads Harare boundaries.geojson and upserts each district
into the ezc_pastoral_boundaries table in Supabase.

Run: python import_harare_boundaries.py
"""

import json
import os
import sys

# Force UTF-8 output on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Dependencies check
try:
    import requests
except ImportError:
    print("Installing requests...")
    os.system(f"{sys.executable} -m pip install requests")
    import requests

# ── Config ──────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://hupqhiyxlghccdabqlrs.supabase.co"

# Use service role key for admin inserts.
# Get it from: Supabase Dashboard -> Project Settings -> API -> service_role
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_KEY:
    SUPABASE_KEY = "sb_publishable_Zx71cr2QdmE0Il7AAFCX4w_L3XalRVp"
    print("WARNING: Using anon key. If insert fails, set SUPABASE_SERVICE_KEY env var.")
    print()

GEOJSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Harare boundaries.geojson")
TABLE = "ezc_pastoral_boundaries"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

# ── Load GeoJSON ─────────────────────────────────────────────────────────────
print(f"Loading: {GEOJSON_PATH}")
with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
    geojson = json.load(f)

features = geojson.get("features", [])
print(f"Found {len(features)} district boundary features\n")

# ── Build records ────────────────────────────────────────────────────────────
records = []
skipped = []

for feat in features:
    props    = feat.get("properties", {})
    geometry = feat.get("geometry")
    district = props.get("District") or props.get("district")
    pastor   = props.get("Pastor")   or props.get("pastor")

    # Skip features with no valid district name
    if not district or str(district).strip() in ("", "#", "####", "None"):
        skipped.append(str(props))
        continue

    pastor_clean = pastor.strip() if pastor and str(pastor).strip() not in ("None", "") else None

    record = {
        "district_name": district.strip(),
        "region":        "Harare",
        "pastor_name":   pastor_clean,
        "is_unassigned": pastor_clean is None,
        "geom":          geometry,
        "notes":         "Imported from Harare boundaries.geojson",
    }
    records.append(record)

print(f"Preparing to import: {len(records)} districts")
if skipped:
    print(f"Skipping {len(skipped)} features with no valid district name\n")

# ── Preview table ────────────────────────────────────────────────────────────
print("District Summary:")
print("-" * 60)
assigned_count = 0
for r in records:
    status = f"Pastor: {r['pastor_name']}" if r["pastor_name"] else "[UNASSIGNED]"
    if r["pastor_name"]:
        assigned_count += 1
    print(f"  {r['district_name']:<30}  {status}")
print("-" * 60)
print(f"  Total: {len(records)}  |  Assigned: {assigned_count}  |  Unassigned: {len(records) - assigned_count}")
print()

# ── Confirm ──────────────────────────────────────────────────────────────────
confirm = input("Proceed with import to Supabase? (yes/no): ").strip().lower()
if confirm not in ("yes", "y"):
    print("Import cancelled.")
    sys.exit(0)

# ── Clear existing Harare rows ───────────────────────────────────────────────
print("\nClearing existing Harare boundaries from Supabase...")
del_resp = requests.delete(
    f"{SUPABASE_URL}/rest/v1/{TABLE}",
    headers={**HEADERS, "Prefer": ""},
    params={"region": "eq.Harare"},
)
if del_resp.status_code in (200, 204):
    print("  Cleared existing Harare records OK")
else:
    print(f"  Could not clear records: {del_resp.status_code} -> {del_resp.text[:300]}")

# ── Upload in batches ────────────────────────────────────────────────────────
print(f"\nUploading {len(records)} districts to '{TABLE}'...")
BATCH_SIZE = 10
success_count = 0
fail_count = 0

for i in range(0, len(records), BATCH_SIZE):
    batch = records[i:i + BATCH_SIZE]
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/{TABLE}",
        headers=HEADERS,
        json=batch,
    )
    if resp.status_code in (200, 201):
        success_count += len(batch)
        names = [r["district_name"] for r in batch]
        print(f"  Batch {i//BATCH_SIZE + 1} OK: {', '.join(names)}")
    else:
        fail_count += len(batch)
        print(f"  Batch {i//BATCH_SIZE + 1} FAILED [{resp.status_code}]: {resp.text[:400]}")

# ── Final summary ────────────────────────────────────────────────────────────
print()
print("=" * 60)
print(f"Import complete!  {success_count}/{len(records)} districts loaded into Supabase")
if fail_count:
    print(f"FAILED: {fail_count} records -- check error messages above")
    print()
    print("If you see '401 Unauthorized', you need the service role key:")
    print("  1. Go to https://supabase.com -> your project")
    print("  2. Settings -> API -> Copy 'service_role' key")
    print("  3. Run: set SUPABASE_SERVICE_KEY=your_key_here")
    print("  4. Run this script again")
print("=" * 60)
print()
if success_count > 0:
    print("Next steps:")
    print("  1. Open the EZC app at http://localhost:3000")
    print("  2. Log in, go to Territory Map")
    print("  3. All Harare district boundaries should be visible")
    print("  4. Go to Pastoral Management to assign unassigned districts")
