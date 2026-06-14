import requests
import uuid

url = "https://hupqhiyxlghccdabqlrs.supabase.co"
anon_key = "sb_publishable_Zx71cr2QdmE0Il7AAFCX4w_L3XalRVp"

# Sign up a temporary test user
email = f"test_{uuid.uuid4().hex[:6]}@example.com"
password = "TestPassword123!"

signup_url = f"{url}/auth/v1/signup"
headers = {
    "apikey": anon_key,
    "Content-Type": "application/json"
}
signup_data = {
    "email": email,
    "password": password
}
r_signup = requests.post(signup_url, json=signup_data, headers=headers)

# Sign in to get JWT token
signin_url = f"{url}/auth/v1/token?grant_type=password"
signin_data = {
    "email": email,
    "password": password
}
r_signin = requests.post(signin_url, json=signin_data, headers=headers)

if r_signin.status_code != 200:
    print("Signin failed:", r_signin.text)
    exit(1)

token = r_signin.json()["access_token"]
auth_headers = {
    "apikey": anon_key,
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Get a church id first
r_church = requests.get(f"{url}/rest/v1/ezc_churches?limit=1", headers=auth_headers)
church_id = None
if r_church.status_code == 200 and r_church.json():
    church_id = r_church.json()[0]["id"]

# Insert into ezc_small_groups without 'type'
print("--- Inserting small group without 'type' ---")
data = {
    "name": "Test Group No Type",
    "church_id": church_id
}
r = requests.post(f"{url}/rest/v1/ezc_small_groups", json=data, headers=auth_headers)
print("Status:", r.status_code)
print("Response:", r.text)
