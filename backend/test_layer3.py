#!/usr/bin/env python3
"""Test script to verify Layer 3 data retrieval"""

import requests
import json
from datetime import datetime

def test_layer3_direct():
    """Test direct call to ISPRA Layer 3"""
    print("=" * 60)
    print("Testing DIRECT call to ISPRA Layer 3...")
    print("=" * 60)
    
    layer_id = 3
    query_url = f"https://sinacloud.isprambiente.it/arcgisadv/rest/services/Particulate_matter10_informambiente/MapServer/{layer_id}/query"
    
    params = {
        "where": "station_id IS NOT NULL",
        "outFields": "station_id,station_eu_code,station_name,station_lat,station_lon,data_record_end_time,data_record_value",
        "returnGeometry": "false",
        "f": "json"
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://sinacloud.isprambiente.it/"
    }
    
    print(f"\n📥 Fetching from: {query_url}")
    print(f"Parameters: {params}")
    
    response = requests.get(query_url, params=params, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        features = data.get("features", [])
        print(f"\n✅ Success! Found {len(features)} stations with hourly data.\n")
        
        # Print first 3 results
        for i, f in enumerate(features[:3], 1):
            attr = f.get("attributes", {})
            station_id = attr.get("station_id") or attr.get("station_eu_code")
            value = attr.get("data_record_value")
            timestamp_ms = attr.get("data_record_end_time")
            
            date_str = "N/A"
            if timestamp_ms:
                date_str = datetime.fromtimestamp(timestamp_ms / 1000.0).strftime('%Y-%m-%d %H:%M:%S')
            
            print(f"{i}. Station: {attr.get('station_name')}")
            print(f"   ID: {station_id}")
            print(f"   PM10: {value} µg/m³")
            print(f"   Time: {date_str}")
            print("-" * 40)
    else:
        print(f"❌ HTTP Error: {response.status_code}")
        print(f"Response: {response.text[:200]}")

def test_backend_endpoint():
    """Test Flask backend endpoint"""
    print("\n" + "=" * 60)
    print("Testing BACKEND endpoint /api/realtime-details...")
    print("=" * 60)
    
    url = "http://localhost:5000/api/realtime-details?pollutant=pm10"
    
    print(f"\n📥 Fetching from: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ Success! Received {len(data)} stations.\n")
            
            # Print first 3 results
            for i, (station_id, station_data) in enumerate(list(data.items())[:3], 1):
                print(f"{i}. Station ID: {station_id}")
                print(f"   Value: {station_data.get('value')} {station_data.get('unit')}")
                print(f"   Timestamp: {station_data.get('timestamp')}")
                print("-" * 40)
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"Response: {response.text[:200]}")
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Is the Flask backend running on port 5000?")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    # Test direct ISPRA call
    test_layer3_direct()
    
    # Test backend endpoint
    test_backend_endpoint()
    
    print("\n" + "=" * 60)
    print("Testing complete!")
    print("=" * 60)
