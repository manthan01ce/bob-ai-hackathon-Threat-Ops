import requests
import json

print('Fetching Gujarat power infrastructure from OpenStreetMap...')
overpass_url = 'http://overpass-api.de/api/interpreter'
overpass_query = """
[out:json][timeout:90];
area["name"="Gujarat"]["admin_level"="4"]->.searchArea;
(
  node["power"="substation"](area.searchArea);
  node["power"="transformer"](area.searchArea);
  node["power"="plant"](area.searchArea);
);
out center;
"""

try:
    response = requests.post(overpass_url, data={'data': overpass_query})
    data = response.json()
    
    assets = []
    for element in data.get('elements', []):
        if element['type'] == 'node':
            assets.append({
                'id': element['id'],
                'lat': element['lat'],
                'lon': element['lon'],
                'power': element.get('tags', {}).get('power', 'unknown'),
                'name': element.get('tags', {}).get('name', 'Unknown')
            })
            
    output_path = r'C:\Users\Manthan\Desktop\ThreatOps\gujarat_power_assets.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(assets, f, indent=2)
        
    print(f'Successfully pulled {len(assets)} power assets from Gujarat.')
    print(f'Saved to {output_path}')
except Exception as e:
    print(f'Error: {e}')
