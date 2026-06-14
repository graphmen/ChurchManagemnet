import json
import os

target_path = r'c:\Users\ndebelem.ZINGSERVER1\Desktop\2026\EZC\ezc\ezc_boundaries.geojson'
districts_to_remove = ["Victoria Falls", "Mvurwi"]

if os.path.exists(target_path):
    with open(target_path, 'r') as f:
        data = json.load(f)
    
    initial_count = len(data['features'])
    data['features'] = [f for f in data['features'] if f['properties'].get('adm2_name') not in districts_to_remove]
    final_count = len(data['features'])
    
    with open(target_path, 'w') as f:
        json.dump(data, f)
    
    print(f"Removed {initial_count - final_count} districts from {target_path}")
else:
    print(f"File not found: {target_path}")
