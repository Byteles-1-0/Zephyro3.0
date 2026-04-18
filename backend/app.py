from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_caching import Cache
import requests
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)

# Configure Flask-Caching
cache = Cache(app, config={
    'CACHE_TYPE': 'SimpleCache',
    'CACHE_DEFAULT_TIMEOUT': 3600  # 1 hour default
})

# Base URLs for ISPRA services
PM10_BASE_URL = "https://sinacloud.isprambiente.it/arcgisadv/rest/services/Particulate_matter10_informambiente/MapServer"
PM25_BASE_URL = "https://sinacloud.isprambiente.it/arcgisadv/rest/services/Particulate_matter_2_5_informambiente/MapServer"

def get_layer_url(pollutant_type, layer=2):
    """Get ISPRA layer URL for specified pollutant and layer"""
    base_url = PM10_BASE_URL if pollutant_type == 'pm10' else PM25_BASE_URL
    return f"{base_url}/{layer}/query"

def get_color(value, pollutant_type):
    """Determine marker color based on value thresholds"""
    if value is None:
        return 'gray'
    
    # Thresholds based on EU air quality standards
    if pollutant_type == 'pm10':
        if value <= 25: return 'green'
        elif value <= 50: return 'yellow'
        else: return 'red'
    else:  # PM2.5
        if value <= 15: return 'green'
        elif value <= 25: return 'yellow'
        else: return 'red'

def transform_to_geojson(arcgis_data, pollutant_type):
    """Transform ArcGIS JSON response to GeoJSON FeatureCollection"""
    if not arcgis_data or 'features' not in arcgis_data:
        return None
    
    features = []
    for feature in arcgis_data['features']:
        try:
            attrs = feature['attributes']
            geom = feature.get('geometry', {})
            
            # Extract required fields
            station_id = attrs.get('station_id', attrs.get('station_eu_code', 'N/A'))
            station_name = attrs.get('station_name', 'N/A')
            value = attrs.get('data_record_value')
            
            # Normalize timestamp from epoch milliseconds to ISO 8601
            timestamp = attrs.get('data_record')
            date_str = datetime.fromtimestamp(timestamp / 1000).isoformat() + 'Z' if timestamp else None
            
            # Calculate color classification
            color = get_color(value, pollutant_type)
            
            # Build GeoJSON Feature
            geojson_feature = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [geom.get('x'), geom.get('y')]
                },
                'properties': {
                    'station_id': station_id,
                    'station_name': station_name,
                    'value': value,
                    'unit': 'μg/m³',
                    'pollutant': pollutant_type.upper(),
                    'date': date_str,
                    'color': color
                }
            }
            features.append(geojson_feature)
        except KeyError as e:
            app.logger.warning(f'Missing field in feature: {e}')
            continue
    
    return {
        'type': 'FeatureCollection',
        'features': features
    }

def transform_to_dictionary(arcgis_data):
    """Transform ArcGIS JSON response to dictionary keyed by station_id"""
    if not arcgis_data or 'features' not in arcgis_data:
        return {}
    
    realtime_dict = {}
    for feature in arcgis_data['features']:
        try:
            attrs = feature['attributes']
            
            # Extract required fields - try both station_id and station_eu_code
            station_id = attrs.get('station_id') or attrs.get('station_eu_code')
            if not station_id:
                continue
            
            value = attrs.get('data_record_value')
            if value is None:
                continue  # Skip stations without valid data
            
            unit = attrs.get('unit', 'μg/m³')
            
            # Normalize timestamp from epoch milliseconds to ISO 8601
            timestamp = attrs.get('data_record_end_time')
            if not timestamp:
                continue  # Skip if no timestamp
                
            timestamp_str = datetime.fromtimestamp(timestamp / 1000).isoformat() + 'Z'
            
            # Store in dictionary for O(1) lookup
            realtime_dict[station_id] = {
                'value': value,
                'unit': unit,
                'timestamp': timestamp_str
            }
        except (KeyError, TypeError, ValueError) as e:
            app.logger.warning(f'Error processing feature: {e}')
            continue
    
    return realtime_dict

# New Endpoints for Hybrid Data Architecture

@app.route('/api/map-base')
@cache.cached(timeout=86400, query_string=True)  # 24 hours
def get_map_base():
    """Get Layer 2 daily average data for all stations (base map)"""
    pollutant_type = request.args.get('pollutant', 'pm10')
    
    # Validate pollutant type
    if pollutant_type not in ['pm10', 'pm25']:
        return jsonify({'error': 'Invalid pollutant type'}), 400
    
    try:
        # Construct Layer 2 URL
        url = get_layer_url(pollutant_type, layer=2)
        
        # Query parameters for all stations
        params = {
            'where': '1=1',
            'outFields': 'station_id,station_eu_code,station_name,data_record_value,data_record',
            'f': 'json',
            'outSR': '4326'
        }
        
        # Fetch from ISPRA
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        arcgis_data = response.json()
        
        # Transform to GeoJSON
        geojson = transform_to_geojson(arcgis_data, pollutant_type)
        
        if not geojson:
            return jsonify({'error': 'Failed to process data'}), 500
        
        return jsonify(geojson)
        
    except requests.exceptions.Timeout:
        app.logger.error('ISPRA service timeout')
        return jsonify({'error': 'ISPRA service timeout'}), 504
    except json.JSONDecodeError:
        app.logger.error('Invalid JSON from ISPRA service')
        return jsonify({'error': 'Invalid JSON from ISPRA service'}), 500
    except requests.exceptions.HTTPError as e:
        app.logger.error(f'ISPRA service error: {e.response.status_code}')
        return jsonify({'error': f'ISPRA service error: {e.response.status_code}'}), 500
    except Exception as e:
        app.logger.error(f'Unexpected error: {str(e)}')
        return jsonify({'error': 'Failed to fetch data'}), 500

@app.route('/api/realtime-details')
@cache.cached(timeout=3600, query_string=True)  # 1 hour
def get_realtime_details():
    """Get Layer 3 hourly real-time data for active stations"""
    pollutant_type = request.args.get('pollutant', 'pm10')
    
    # Validate pollutant type
    if pollutant_type not in ['pm10', 'pm25']:
        return jsonify({'error': 'Invalid pollutant type'}), 400
    
    try:
        # Construct Layer 3 URL
        url = get_layer_url(pollutant_type, layer=3)
        
        # Query parameters for active stations only
        params = {
            'where': 'station_id IS NOT NULL',
            'outFields': 'station_id,station_eu_code,station_name,station_lat,station_lon,data_record_end_time,data_record_value',
            'returnGeometry': 'false',
            'f': 'json'
        }
        
        # Add headers to match working script
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://sinacloud.isprambiente.it/'
        }
        
        # Fetch from ISPRA
        app.logger.info(f'Fetching Layer 3 data from: {url}')
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        arcgis_data = response.json()
        
        app.logger.info(f'Layer 3 response: {len(arcgis_data.get("features", []))} features')
        
        # Transform to dictionary
        realtime_dict = transform_to_dictionary(arcgis_data)
        
        app.logger.info(f'Transformed to dictionary with {len(realtime_dict)} stations')
        
        return jsonify(realtime_dict)
        
    except Exception as e:
        # Graceful degradation: return empty dictionary on any error
        app.logger.warning(f'Layer 3 data unavailable: {str(e)}')
        return jsonify({})

# Legacy endpoint for backward compatibility
@app.route('/api/data/<pollutant_type>')
def get_data_legacy(pollutant_type):
    """Legacy endpoint - redirects to new map-base endpoint"""
    app.logger.warning('Legacy endpoint /api/data called - will be deprecated')
    
    if pollutant_type not in ['pm10', 'pm25']:
        return jsonify({'error': 'Invalid pollutant type'}), 400
    
    # Redirect to new endpoint logic
    request.args = {'pollutant': pollutant_type}
    return get_map_base()

@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
