import requests
try:
    data = requests.get('https://incendioggi.it/data/current_fires.json', timeout=10).json()
    fires = data.get('fires', [])
    print(f"Total fires: {len(fires)}")
    high = [f for f in fires if float(f.get('frp', 0)) >= 10]
    medium = [f for f in fires if 2 <= float(f.get('frp', 0)) < 10]
    print(f"High Intensity (frp >= 10): {len(high)}")
    print(f"Medium Intensity (frp >= 2): {len(medium)}")
    for h in high[:3]:
        print(f"High fire: {h.get('location', {}).get('country', 'Unknown')} - FRP: {h.get('frp')}")
except Exception as e:
    print(f"Error: {e}")
