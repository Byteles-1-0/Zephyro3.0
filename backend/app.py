from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_caching import Cache
import requests
from datetime import datetime, timedelta
import json
import logging

# Import the cause analyzer
from cause_analyzer import analyze_pollution_cause, get_pollution_analysis

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

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
    """Transform ArcGIS JSON response to GeoJSON FeatureCollection
    
    Includes ALL stations, even those without current values (shown in gray)
    """
    if not arcgis_data or 'features' not in arcgis_data:
        return None
    
    features = []
    for feature in arcgis_data['features']:
        try:
            attrs = feature['attributes']
            geom = feature.get('geometry', {})
            
            # Skip if no geometry
            if not geom or not geom.get('x') or not geom.get('y'):
                continue
            
            # Extract required fields
            station_id = attrs.get('station_id', attrs.get('station_eu_code', 'N/A'))
            station_name = attrs.get('station_name', 'N/A')
            value = attrs.get('data_record_value')
            
            # Normalize timestamp from epoch milliseconds to ISO 8601
            timestamp = attrs.get('data_record')
            date_str = datetime.fromtimestamp(timestamp / 1000).isoformat() + 'Z' if timestamp else None
            
            # Calculate color classification (gray if no value)
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
                    'color': color,
                    'has_data': value is not None
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
    """Get all stations (Layer 1) enriched with Layer 2 daily average data"""
    pollutant_type = request.args.get('pollutant', 'pm10')
    
    # Validate pollutant type
    if pollutant_type not in ['pm10', 'pm25']:
        return jsonify({'error': 'Invalid pollutant type'}), 400
    
    try:
        # Step 1: Get ALL stations from Layer 1 (station registry)
        stations_url = get_layer_url(pollutant_type, layer=1)
        stations_params = {
            'where': '1=1',
            'outFields': 'station_id,station_eu_code,station_name',
            'f': 'json',
            'outSR': '4326',
            'returnGeometry': 'true'
        }
        
        app.logger.info(f'Fetching all stations from Layer 1')
        stations_response = requests.get(stations_url, params=stations_params, timeout=30)
        stations_response.raise_for_status()
        all_stations = stations_response.json()
        
        # Step 2: Get data from Layer 2 (daily averages)
        data_url = get_layer_url(pollutant_type, layer=2)
        data_params = {
            'where': '1=1',
            'outFields': 'station_id,station_eu_code,data_record_value,data_record',
            'f': 'json',
            'returnGeometry': 'false'
        }
        
        app.logger.info(f'Fetching data from Layer 2')
        data_response = requests.get(data_url, params=data_params, timeout=30)
        data_response.raise_for_status()
        data_features = data_response.json()
        
        # Step 3: Create a map of station_id -> data
        data_map = {}
        for feature in data_features.get('features', []):
            attrs = feature['attributes']
            station_id = attrs.get('station_id') or attrs.get('station_eu_code')
            if station_id:
                data_map[station_id] = {
                    'value': attrs.get('data_record_value'),
                    'timestamp': attrs.get('data_record')
                }
        
        app.logger.info(f'Found {len(all_stations.get("features", []))} stations, {len(data_map)} with data')
        
        # Step 4: Merge stations with data
        merged_data = {
            'features': []
        }
        
        for station_feature in all_stations.get('features', []):
            attrs = station_feature['attributes']
            geom = station_feature.get('geometry', {})
            
            station_id = attrs.get('station_id') or attrs.get('station_eu_code')
            
            # Get data if available
            station_data = data_map.get(station_id, {})
            
            # Add data to attributes
            attrs['data_record_value'] = station_data.get('value')
            attrs['data_record'] = station_data.get('timestamp')
            
            merged_data['features'].append({
                'attributes': attrs,
                'geometry': geom
            })
        
        # Transform to GeoJSON
        geojson = transform_to_geojson(merged_data, pollutant_type)
        
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

@app.route('/api/pollution-analysis')
def get_pollution_analysis_endpoint():
    """
    Analyze pollution causes for a specific station
    
    Query params:
        station_id: Station identifier (required)
        pollutant: 'pm10' or 'pm25' (default: 'pm10')
        lat: Station latitude (optional, will fetch if not provided)
        lon: Station longitude (optional, will fetch if not provided)
        pm10: PM10 value (optional, will fetch if not provided)
        pm25: PM2.5 value (optional, will fetch if not provided)
    
    Returns:
        JSON with pollution cause analysis
    """
    
    station_id = request.args.get('station_id')
    if not station_id:
        return jsonify({'error': 'station_id parameter is required'}), 400
    
    pollutant = request.args.get('pollutant', 'pm10')
    if pollutant not in ['pm10', 'pm25']:
        return jsonify({'error': 'Invalid pollutant type'}), 400
    
    try:
        # Try to get coordinates and values from query params first
        lat = request.args.get('lat', type=float)
        lon = request.args.get('lon', type=float)
        pm10_val = request.args.get('pm10', type=float)
        pm25_val = request.args.get('pm25', type=float)
        
        # If missing data, fetch from ISPRA
        if not all([lat, lon, pm10_val, pm25_val]):
            app.logger.info(f'Fetching station data for analysis: {station_id}')
            
            # Get station coordinates and current values from Layer 2
            layer_url = get_layer_url(pollutant, layer=2)
            params = {
                'where': f"station_id = '{station_id}' OR station_eu_code = '{station_id}'",
                'outFields': 'station_id,station_eu_code,station_name,data_record_value',
                'returnGeometry': 'true',
                'outSR': '4326',
                'f': 'json'
            }
            
            try:
                response = requests.get(layer_url, params=params, timeout=10)
                response.raise_for_status()
                data = response.json()
                
                if data.get('features') and len(data['features']) > 0:
                    feature = data['features'][0]
                    attrs = feature['attributes']
                    geom = feature.get('geometry', {})
                    
                    # Extract coordinates
                    if lat is None:
                        lat = geom.get('y')
                    if lon is None:
                        lon = geom.get('x')
                    
                    # Extract pollution values
                    if pollutant == 'pm10' and pm10_val is None:
                        pm10_val = attrs.get('data_record_value')
                    elif pollutant == 'pm25' and pm25_val is None:
                        pm25_val = attrs.get('data_record_value')
                    
                    station_name = attrs.get('station_name', 'Unknown')
                    
                    # Try to get the other pollutant value
                    other_pollutant = 'pm25' if pollutant == 'pm10' else 'pm10'
                    if (pollutant == 'pm10' and pm25_val is None) or (pollutant == 'pm25' and pm10_val is None):
                        try:
                            other_url = get_layer_url(other_pollutant, layer=2)
                            other_response = requests.get(other_url, params=params, timeout=5)
                            other_response.raise_for_status()
                            other_data = other_response.json()
                            
                            if other_data.get('features'):
                                other_value = other_data['features'][0]['attributes'].get('data_record_value')
                                if pollutant == 'pm10' and pm25_val is None:
                                    pm25_val = other_value
                                elif pollutant == 'pm25' and pm10_val is None:
                                    pm10_val = other_value
                        except:
                            # Ignore errors when fetching other pollutant
                            pass
                else:
                    # Station not found in ISPRA, but we might have coordinates and values from frontend
                    app.logger.warning(f'Station {station_id} not found in ISPRA database')
                    station_name = 'Unknown'
                    
            except Exception as e:
                app.logger.warning(f'Error fetching station data from ISPRA: {e}')
                station_name = 'Unknown'
        
        # Validate required data
        if lat is None or lon is None:
            return jsonify({
                'error': 'Station coordinates not available',
                'station_id': station_id,
                'message': 'Could not determine station location for analysis'
            }), 400
        
        # Use default values if pollution data is missing
        if pm10_val is None:
            pm10_val = 0
        if pm25_val is None:
            pm25_val = 0
        
        app.logger.info(f'Analyzing pollution for {station_id}: PM10={pm10_val}, PM2.5={pm25_val} at ({lat}, {lon})')
        
        # Run cause analysis
        analysis = analyze_pollution_cause(
            pm10_val=pm10_val,
            pm25_val=pm25_val,
            lat=lat,
            lon=lon,
            is_rural=False,  # TODO: Implement rural detection
            weather_data=None,  # TODO: Integrate weather API
            month=None,  # Will use current month
            hour=None   # Will use current hour
        )
        
        # Add station info to response
        analysis['station_id'] = station_id
        analysis['station_name'] = locals().get('station_name', 'Unknown')
        analysis['coordinates'] = {'lat': lat, 'lon': lon}
        analysis['pollution_values'] = {
            'pm10': pm10_val,
            'pm25': pm25_val
        }
        analysis['analyzed_at'] = datetime.now().isoformat()
        
        app.logger.info(f'Analysis complete for {station_id}: {analysis["cause"]} ({analysis["status"]})')
        
        return jsonify(analysis)
        
    except requests.exceptions.Timeout:
        app.logger.error(f'Timeout fetching station data for {station_id}')
        return jsonify({
            'error': 'Request timeout',
            'station_id': station_id
        }), 504
        
    except Exception as e:
        app.logger.error(f'Error analyzing pollution for {station_id}: {str(e)}', exc_info=True)
        return jsonify({
            'error': 'Analysis failed',
            'station_id': station_id,
            'message': str(e)
        }), 500

@app.route('/api/map-layers')
@cache.cached(timeout=1800, query_string=True)  # 30 minutes cache, includes BBOX params
def get_map_layers():
    """
    Returns contextual layer data for fires and industries
    
    Query Parameters (optional):
        ne_lat: Northeast corner latitude
        ne_lon: Northeast corner longitude
        sw_lat: Southwest corner latitude
        sw_lon: Southwest corner longitude
    
    Response Format:
    {
        "fires": [
            {
                "id": "fire_001",
                "latitude": 45.4642,
                "longitude": 9.1900,
                "intensity": "medium",
                "location": "Milano Nord",
                "timestamp": "2024-01-15T14:30:00Z"
            }
        ],
        "top_industries": [
            {
                "id": "industry_001", 
                "name": "Centrale Termoeletrica Milano",
                "latitude": 45.4642,
                "longitude": 9.1900,
                "sector": "ENERGY",
                "pollutant_count": 12,
                "pollutants": ["CO2", "NOx", "SO2", ...]
            }
        ],
        "cache_timestamp": "2024-01-15T14:30:00Z",
        "data_status": {
            "fires": "available",
            "industries": "available"
        },
        "bbox_applied": true,
        "filtered_counts": {
            "industries_total": 150,
            "industries_returned": 30,
            "fires_total": 5,
            "fires_returned": 5
        }
    }
    
    Note: bbox_applied and filtered_counts are only present when BBOX filtering is applied.
    """
    from context.fire_fetcher import get_all_active_fires
    from context.industry_checker import get_top_polluting_industries
    from utils import extract_bbox_params, validate_bbox
    
    # Extract BBOX parameters from request query string with comprehensive error handling
    bbox = None
    try:
        bbox = extract_bbox_params(request.args)
        
        # Validate BBOX if extracted successfully
        if bbox and not validate_bbox(bbox):
            app.logger.warning(f'Invalid BBOX parameters: {bbox}')
            bbox = None  # Fall back to unfiltered
            
    except Exception as e:
        app.logger.error(f'Error extracting BBOX parameters: {e}')
        bbox = None  # Fall back to unfiltered on any extraction error
    
    # Initialize response structure
    response_data = {
        "fires": [],
        "top_industries": [],
        "cache_timestamp": datetime.now().isoformat() + 'Z',
        "data_status": {
            "fires": "unavailable",
            "industries": "unavailable"
        }
    }
    
    # Fetch fire data (with optional BBOX filtering and comprehensive error handling)
    fires = []
    try:
        if bbox is not None:
            app.logger.debug(f'Applying BBOX filtering for fires: {bbox}')
            
        fires = get_all_active_fires(bbox=bbox)
        
        if fires:
            # Return complete fire data as per requirements
            response_data["fires"] = fires
            response_data["data_status"]["fires"] = "available"
            app.logger.info(f"Retrieved {len(fires)} active fires for map layers")
        else:
            app.logger.info("No active fires available")
            response_data["data_status"]["fires"] = "unavailable"
            
    except Exception as e:
        app.logger.error(f"Error fetching fire data for map layers: {e}")
        response_data["data_status"]["fires"] = "unavailable"
        
        # If BBOX filtering failed, try without BBOX as graceful degradation
        if bbox is not None:
            try:
                app.logger.info("Attempting to fetch fire data without BBOX filtering as fallback")
                fires = get_all_active_fires(bbox=None)
                
                if fires:
                    response_data["fires"] = fires
                    response_data["data_status"]["fires"] = "available"
                    app.logger.info(f"Fallback successful: Retrieved {len(fires)} unfiltered fires")
                    # Reset bbox to None to indicate filtering was not applied
                    bbox = None
                else:
                    app.logger.warning("No fire data available even without BBOX filtering")
                    
            except Exception as fallback_e:
                app.logger.error(f"Fallback fire data fetch also failed: {fallback_e}")
                # Keep fires as empty list and status as unavailable
    
    # Fetch industry data (with optional BBOX filtering and comprehensive error handling)
    industries = []
    try:
        if bbox is not None:
            app.logger.debug(f'Applying BBOX filtering for industries: {bbox}')
            
        industries = get_top_polluting_industries(limit=30, bbox=bbox)
        
        if industries:
            # Return complete industry data as per requirements
            response_data["top_industries"] = industries
            response_data["data_status"]["industries"] = "available"
            app.logger.info(f"Retrieved {len(industries)} top polluting industries for map layers")
        else:
            app.logger.info("No industry data available")
            response_data["data_status"]["industries"] = "unavailable"
            
    except Exception as e:
        app.logger.error(f"Error fetching industry data for map layers: {e}")
        response_data["data_status"]["industries"] = "unavailable"
        
        # If BBOX filtering failed, try without BBOX as graceful degradation
        if bbox is not None:
            try:
                app.logger.info("Attempting to fetch industry data without BBOX filtering as fallback")
                industries = get_top_polluting_industries(limit=30, bbox=None)
                
                if industries:
                    response_data["top_industries"] = industries
                    response_data["data_status"]["industries"] = "available"
                    app.logger.info(f"Fallback successful: Retrieved {len(industries)} unfiltered industries")
                    # Reset bbox to None to indicate filtering was not applied
                    bbox = None
                else:
                    app.logger.warning("No industry data available even without BBOX filtering")
                    
            except Exception as fallback_e:
                app.logger.error(f"Fallback industry data fetch also failed: {fallback_e}")
                # Keep industries as empty list and status as unavailable
    
    # Add bbox_applied flag to response
    response_data["bbox_applied"] = bbox is not None
    
    # Add filtered_counts metadata when bbox is applied with comprehensive error handling
    if bbox is not None:
        try:
            app.logger.debug("Calculating filtered_counts metadata for BBOX response")
            
            # Get total counts (unfiltered) - use a very large limit to get all
            all_fires = get_all_active_fires(bbox=None)
            all_industries = get_top_polluting_industries(limit=10000, bbox=None)
            
            response_data["filtered_counts"] = {
                "industries_total": len(all_industries) if all_industries else 0,
                "industries_returned": len(industries) if industries else 0,
                "fires_total": len(all_fires) if all_fires else 0,
                "fires_returned": len(fires) if fires else 0
            }
            
            app.logger.info(f"BBOX filtering applied: industries {response_data['filtered_counts']['industries_returned']}/{response_data['filtered_counts']['industries_total']}, "
                          f"fires {response_data['filtered_counts']['fires_returned']}/{response_data['filtered_counts']['fires_total']}")
                          
        except Exception as e:
            app.logger.warning(f"Error calculating filtered_counts metadata: {e}")
            # Don't fail the request if we can't calculate counts - graceful degradation
            # Remove filtered_counts from response if calculation fails
            if "filtered_counts" in response_data:
                del response_data["filtered_counts"]
    
    return jsonify(response_data)

@app.route('/api/fire-details/<fire_id>')
@cache.cached(timeout=1800)  # 30 minutes cache
def get_fire_details(fire_id):
    """
    Returns detailed information for a specific fire (for lazy loading popups)
    
    Response Format:
    {
        "id": "fire_001",
        "latitude": 45.4642,
        "longitude": 9.1900,
        "intensity": "medium",
        "location": "Milano Nord",
        "timestamp": "2024-01-15T14:30:00Z",
        "source": "incendioggi.it"
    }
    """
    from context.fire_fetcher import get_all_active_fires
    
    try:
        fires = get_all_active_fires()
        
        # Find the specific fire by ID
        fire_details = None
        for fire in fires:
            if fire.get("id") == fire_id:
                fire_details = fire
                break
        
        if not fire_details:
            return jsonify({
                'error': 'Fire not found',
                'fire_id': fire_id
            }), 404
        
        app.logger.info(f"Retrieved detailed information for fire {fire_id}")
        return jsonify(fire_details)
        
    except Exception as e:
        app.logger.error(f"Error fetching fire details for {fire_id}: {e}")
        return jsonify({
            'error': 'Failed to fetch fire details',
            'fire_id': fire_id,
            'message': str(e)
        }), 500

@app.route('/api/industry-details/<industry_id>')
@cache.cached(timeout=1800)  # 30 minutes cache
def get_industry_details(industry_id):
    """
    Returns detailed information for a specific industry (for lazy loading popups)
    
    Response Format:
    {
        "id": "industry_001", 
        "name": "Centrale Termoeletrica Milano",
        "latitude": 45.4642,
        "longitude": 9.1900,
        "sector": "ENERGY",
        "pollutant_count": 12,
        "pollutants": ["CO2", "NOx", "SO2", ...],
        "population_proximity": 5.2
    }
    """
    from context.industry_checker import get_top_polluting_industries
    
    try:
        industries = get_top_polluting_industries(limit=5)
        
        # Find the specific industry by ID
        industry_details = None
        for industry in industries:
            if industry.get("id") == industry_id:
                industry_details = industry
                break
        
        if not industry_details:
            return jsonify({
                'error': 'Industry not found',
                'industry_id': industry_id
            }), 404
        
        app.logger.info(f"Retrieved detailed information for industry {industry_id}")
        return jsonify(industry_details)
        
    except Exception as e:
        app.logger.error(f"Error fetching industry details for {industry_id}: {e}")
        return jsonify({
            'error': 'Failed to fetch industry details',
            'industry_id': industry_id,
            'message': str(e)
        }), 500

@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})

# Forecast API Endpoints - Extract from ARPAE Maps

@app.route('/api/forecast/<station_id>')
@cache.cached(timeout=3600, query_string=True)  # 1 hour cache
def get_forecast(station_id):
    """
    Get forecast for a station by extracting values from ARPAE/CHIMERE maps
    
    OPTIMIZATIONS:
    - Image caching with LRU cache (100 images)
    - Parallel processing (10 workers)
    - Limited downloads based on horizon
    - Response caching (1 hour)
    
    Query params:
        pollutant: 'pm10' or 'pm25' (default: 'pm10')
        horizon: 24, 48, or 72 hours (default: 48)
    
    Returns:
        JSON with forecast time series extracted from ARPAE maps
    """
    from forecast_extractor import extract_forecast_for_station
    import logging
    
    logger = logging.getLogger(__name__)
    
    pollutant = request.args.get('pollutant', 'pm10')
    horizon = request.args.get('horizon', '48')
    
    # Validate pollutant parameter
    if pollutant not in ['pm10', 'pm25']:
        return jsonify({'error': 'Invalid pollutant type. Must be pm10 or pm25'}), 400
    
    # Validate horizon parameter
    try:
        horizon = int(horizon)
        if horizon not in [24, 48, 72]:
            return jsonify({'error': 'Invalid horizon. Must be 24, 48, or 72'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid horizon format. Must be integer'}), 400
    
    try:
        # Get station coordinates from Layer 2 (base map) which has geometry
        layer_url = get_layer_url(pollutant, layer=2)
        params = {
            'where': f"station_id = {station_id}",
            'outFields': 'station_id,station_eu_code,station_name',
            'returnGeometry': 'true',
            'outSR': '4326',
            'f': 'json'
        }
        
        coord_response = requests.get(layer_url, params=params, timeout=10)
        coord_response.raise_for_status()
        coord_data = coord_response.json()
        
        if not coord_data.get('features') or len(coord_data['features']) == 0:
            return jsonify({
                'error': 'Station not found',
                'station_id': station_id
            }), 404
        
        feature = coord_data['features'][0]
        attrs = feature['attributes']
        geom = feature.get('geometry', {})
        
        lon = geom.get('x')
        lat = geom.get('y')
        station_name = attrs.get('station_name', 'Unknown')
        
        if lat is None or lon is None:
            return jsonify({
                'error': 'Station coordinates not available',
                'station_id': station_id
            }), 404
        
        logger.info(f'Extracting forecast for {station_id} ({station_name}) at ({lat}, {lon})')
        
        # Get ARPAE forecast maps
        forecast_maps_response = get_forecast_maps_internal(pollutant)
        
        if 'error' in forecast_maps_response:
            return jsonify({
                'error': 'Failed to fetch ARPAE forecast maps',
                'station_id': station_id
            }), 500
        
        # Extract forecast from maps (pass horizon to limit downloads)
        forecast = extract_forecast_for_station(
            forecast_maps_response, 
            lat, 
            lon,
            max_hours=horizon
        )
        
        if not forecast:
            return jsonify({
                'error': 'Failed to extract forecast values from maps',
                'station_id': station_id
            }), 500
        
        return jsonify({
            'station_id': station_id,
            'station_name': station_name,
            'pollutant': pollutant.upper(),
            'coordinates': {'lat': lat, 'lon': lon},
            'forecast': forecast,
            'horizon_hours': len(forecast),
            'source': 'ARPAE_CHIMERE',
            'generated_at': datetime.now().astimezone().isoformat()
        })
        
    except Exception as e:
        logger.error(f'Forecast error for {station_id}: {str(e)}', exc_info=True)
        return jsonify({
            'station_id': station_id,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


def get_forecast_maps_internal(pollutant):
    """Internal function to get forecast maps data (bypasses Flask request context)"""
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Map pollutant names
    valid_pollutants = {
        'pm10': 'pm10',
        'pm25': 'pm25',
        'pm2.5': 'pm25',
        'no2': 'no2',
        'o3': 'o3',
        'pdust': 'pDUST'
    }
    
    pollutant_code = valid_pollutants.get(pollutant.lower(), 'pm10')
    
    # ARPAE API URL
    arpae_url = f"https://apps.arpae.it/REST/qa_ita7_previsione_{pollutant_code}_concentrazione/?sort=-_id&max_results=1"
    
    try:
        logger.info(f'Fetching forecast maps for {pollutant} from ARPAE')
        
        # Fetch data from ARPAE
        response = requests.get(arpae_url, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if not data.get('_items') or len(data['_items']) == 0:
            return {'error': 'No forecast data available'}
        
        forecast_item = data['_items'][0]
        
        # Extract bounds
        bounds = forecast_item.get('bounds', {})
        if bounds and bounds.get('type') == 'Polygon':
            coords = bounds['coordinates'][0]
            # Convert to Leaflet bounds format [[south, west], [north, east]]
            lons = [c[0] for c in coords]
            lats = [c[1] for c in coords]
            leaflet_bounds = [[min(lats), min(lons)], [max(lats), max(lons)]]
        else:
            # Default bounds for Italy
            leaflet_bounds = [[34.74, 3.87], [49.23, 20.39]]
        
        # Extract forecast maps
        mappe = forecast_item.get('mappe', [])
        forecast_maps = []
        
        for mappa_item in mappe:
            mappa = mappa_item.get('mappa', {})
            file_info = mappa.get('file', {})
            
            # Get the file path from the nested structure
            file_path = file_info.get('file')
            
            if file_path:
                # Construct full image URL
                image_url = f"https://apps.arpae.it/REST{file_path}"
                
                forecast_maps.append({
                    'timestamp': mappa_item.get('data_validita'),
                    'image_url': image_url,
                    'content_type': file_info.get('content_type', 'image/png'),
                    'name': file_info.get('name', ''),
                    'length': file_info.get('length', 0)
                })
        
        # Extract legend
        legenda = forecast_item.get('legenda', [])
        
        response_data = {
            'pollutant': pollutant,
            'pollutant_code': pollutant_code,
            'data_emissione': forecast_item.get('data_emissione'),
            'bounds': leaflet_bounds,
            'maps': forecast_maps,
            'legend': legenda,
            'total_maps': len(forecast_maps),
            'source': 'ARPAE',
            'model': 'CHIMERE',
            '_updated': forecast_item.get('_updated'),
            '_created': forecast_item.get('_created')
        }
        
        logger.info(f'Successfully fetched {len(forecast_maps)} forecast maps for {pollutant}')
        
        return response_data
        
    except Exception as e:
        logger.error(f'Error fetching forecast maps: {e}')
        return {'error': str(e)}


@app.route('/api/forecast-maps')
@cache.cached(timeout=21600, query_string=True)  # 6 hours cache
def get_forecast_maps():
    """
    Proxy endpoint for ARPAE forecast maps
    
    Query params:
        pollutant: 'pm10', 'pm25', 'no2', 'o3', 'pdust' (default: 'pm10')
    
    Returns:
        JSON with forecast maps data including image URLs and bounds
    """
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Get pollutant parameter
    pollutant = request.args.get('pollutant', 'pm10').lower()
    
    # Validate pollutant
    valid_pollutants = {
        'pm10': 'pm10',
        'pm25': 'pm25',
        'pm2.5': 'pm25',
        'no2': 'no2',
        'o3': 'o3',
        'pdust': 'pDUST'
    }
    
    if pollutant not in valid_pollutants:
        return jsonify({
            'error': 'Invalid pollutant type',
            'valid_pollutants': list(valid_pollutants.keys())
        }), 400
    
    pollutant_code = valid_pollutants[pollutant]
    
    # ARPAE API URL
    arpae_url = f"https://apps.arpae.it/REST/qa_ita7_previsione_{pollutant_code}_concentrazione/?sort=-_id&max_results=1"
    
    try:
        logger.info(f'Fetching forecast maps for {pollutant} from ARPAE')
        
        # Fetch data from ARPAE
        response = requests.get(arpae_url, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if not data.get('_items') or len(data['_items']) == 0:
            return jsonify({
                'error': 'No forecast data available',
                'pollutant': pollutant
            }), 404
        
        forecast_item = data['_items'][0]
        
        # Extract bounds
        bounds = forecast_item.get('bounds', {})
        if bounds and bounds.get('type') == 'Polygon':
            coords = bounds['coordinates'][0]
            # Convert to Leaflet bounds format [[south, west], [north, east]]
            lons = [c[0] for c in coords]
            lats = [c[1] for c in coords]
            leaflet_bounds = [[min(lats), min(lons)], [max(lats), max(lons)]]
        else:
            # Default bounds for Italy
            leaflet_bounds = [[34.74, 3.87], [49.23, 20.39]]
        
        # Extract forecast maps
        mappe = forecast_item.get('mappe', [])
        forecast_maps = []
        
        for mappa_item in mappe:
            mappa = mappa_item.get('mappa', {})
            file_info = mappa.get('file', {})
            
            # Get the file path from the nested structure
            file_path = file_info.get('file')
            
            if file_path:
                # Construct full image URL - note: path includes /REST/ before /media/
                image_url = f"https://apps.arpae.it/REST{file_path}"
                
                forecast_maps.append({
                    'timestamp': mappa_item.get('data_validita'),
                    'image_url': image_url,
                    'content_type': file_info.get('content_type', 'image/png'),
                    'name': file_info.get('name', ''),
                    'length': file_info.get('length', 0)
                })
        
        # Extract legend
        legenda = forecast_item.get('legenda', [])
        
        response_data = {
            'pollutant': pollutant,
            'pollutant_code': pollutant_code,
            'data_emissione': forecast_item.get('data_emissione'),
            'bounds': leaflet_bounds,
            'maps': forecast_maps,
            'legend': legenda,
            'total_maps': len(forecast_maps),
            'source': 'ARPAE',
            'model': 'CHIMERE',
            '_updated': forecast_item.get('_updated'),
            '_created': forecast_item.get('_created')
        }
        
        logger.info(f'Successfully fetched {len(forecast_maps)} forecast maps for {pollutant}')
        
        return jsonify(response_data)
        
    except requests.exceptions.Timeout:
        logger.error(f'Timeout fetching forecast maps for {pollutant}')
        return jsonify({
            'error': 'Request timeout',
            'message': 'ARPAE API did not respond in time'
        }), 504
        
    except requests.exceptions.RequestException as e:
        logger.error(f'Error fetching forecast maps for {pollutant}: {str(e)}')
        return jsonify({
            'error': 'Failed to fetch forecast data',
            'message': str(e)
        }), 502
        
    except Exception as e:
        logger.error(f'Unexpected error in forecast maps endpoint: {str(e)}')
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

