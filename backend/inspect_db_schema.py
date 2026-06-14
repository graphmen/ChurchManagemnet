import requests
import json

url = "https://hupqhiyxlghccdabqlrs.supabase.co/rest/v1/"
anon_key = "sb_publishable_Zx71cr2QdmE0Il7AAFCX4w_L3XalRVp"

headers = {
    "apikey": anon_key,
    "Authorization": f"Bearer {anon_key}"
}

r = requests.get(url, headers=headers)
if r.status_code != 200:
    print("Failed to get OpenAPI spec:", r.status_code, r.text)
    exit(1)

spec = r.json()
definitions = spec.get("definitions", {})

for name, definition in definitions.items():
    if name.startswith("ezc_") or name == "profiles":
        properties = definition.get("properties", {})
        columns = list(properties.keys())
        print(f"Table '{name}' columns in DB: {columns}")
