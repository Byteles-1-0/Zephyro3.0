"""
Fire Fetcher Module
Checks for nearby active fires using incendioggi.it API
"""
import requests
from flask import current_app
from utils import haversine_distance
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def _categorize_fire_intensity(fire_data):
    """
    Categorize fire intensity based on fire characteristics
    
    Uses multiple indicators:
    - Fire Radiative Power (FRP) - primary indicator
    - Brightness temperature (bright_ti4) - secondary indicator  
    - Confidence level - modifier
    
    Args:
        fire_data: Raw fire data from API
        
    Returns:
        str: 'low', 'medium', or 'high'
    """
    try:
        # Extract fire characteristics
        frp = float(fire_data.get('frp', 0))
        brightness = float(fire_data.get('bright_ti4', 0))
        confidence = fire_data.get('confidence', 'n')
        
        # Primary categorization based on Fire Radiative Power (FRP)
        # FRP thresholds based on MODIS/VIIRS fire detection standards
        if frp >= 10.0:  # High intensity fires
            base_intensity = 'high'
        elif frp >= 2.0:  # Medium intensity fires
            base_intensity = 'medium'
        else:  # Low intensity fires (including very small fires)
            base_intensity = 'low'
        
        # Secondary check using brightness temperature
        # Brightness temperature thresholds (Kelvin)
        if brightness >= 330.0:  # Very hot fires
            if base_intensity == 'low':
                base_intensity = 'medium'  # Upgrade low to medium
        elif brightness >= 320.0:  # Hot fires
            # Keep current intensity
            pass
        elif brightness > 0 and brightness < 310.0:  # Cooler fires
            if base_intensity == 'high':
                base_intensity = 'medium'  # Downgrade high to medium
        
        # Confidence modifier
        if confidence == 'l':  # Low confidence
            # Downgrade intensity for low confidence detections
            if base_intensity == 'high':
                base_intensity = 'medium'
            elif base_intensity == 'medium':
                base_intensity = 'low'
        elif confidence == 'h':  # High confidence
            # Upgrade intensity for high confidence detections
            if base_intensity == 'low' and frp >= 1.0:
                base_intensity = 'medium'
        
        return base_intensity
        
    except (ValueError, TypeError):
        # If we can't parse the data, default to medium
        return 'medium'

def get_all_active_fires(bbox=None):
    """
    Retrieve all active fires in Italy from incendioggi.it API with comprehensive error handling
    
    Args:
        bbox: Optional dict with keys: ne_lat, ne_lon, sw_lat, sw_lon
    
    Returns:
        List of fire dictionaries with standardized structure
    """
    try:
        logger.debug("Fetching active fires from incendioggi.it API")
        
        # Fetch current fires data with timeout
        try:
            response = requests.get(
                'https://incendioggi.it/data/current_fires.json',
                timeout=5
            )
            response.raise_for_status()
        except requests.exceptions.Timeout:
            logger.warning("Fire API request timed out")
            return []
        except requests.exceptions.ConnectionError:
            logger.warning("Fire API connection failed")
            return []
        except requests.exceptions.HTTPError as e:
            logger.warning(f"Fire API HTTP error: {e.response.status_code}")
            return []
        except requests.exceptions.RequestException as e:
            logger.warning(f"Fire API request failed: {e}")
            return []
        
        # Parse JSON response with error handling
        try:
            fires_data = response.json()
        except ValueError as e:
            logger.warning(f"Invalid JSON response from fire API: {e}")
            return []
        
        # Handle different response formats with validation
        fires_list = []
        try:
            if isinstance(fires_data, dict):
                # If response is a dict, look for fires in a 'fires' key or similar
                fires_list = fires_data.get('fires', fires_data.get('data', []))
                if not isinstance(fires_list, list):
                    logger.warning(f"Fire data is not a list: {type(fires_list)}")
                    return []
            elif isinstance(fires_data, list):
                # If response is directly a list
                fires_list = fires_data
            else:
                # Unknown format
                logger.warning(f"Unexpected fire API response format: {type(fires_data)}")
                return []
        except Exception as e:
            logger.warning(f"Error parsing fire API response structure: {e}")
            return []
        
        # Standardize fire data with comprehensive error handling
        standardized_fires = []
        processing_errors = 0
        
        for i, fire in enumerate(fires_list):
            try:
                standardized_fire = standardize_fire_data(fire, i)
                if standardized_fire:
                    standardized_fires.append(standardized_fire)
                else:
                    processing_errors += 1
            except Exception as e:
                logger.debug(f"Error processing fire data {i}: {e}")
                processing_errors += 1
                continue
        
        if processing_errors > 0:
            logger.info(f"Skipped {processing_errors} fires due to processing errors")
        
        logger.info(f"Retrieved {len(standardized_fires)} active fires from {len(fires_list)} raw entries")
        
        # Apply BBOX filtering if provided with error handling
        if bbox:
            try:
                # Validate bbox structure
                if not isinstance(bbox, dict):
                    logger.error(f"Invalid bbox type for fire filtering: {type(bbox)}")
                    return standardized_fires  # Return unfiltered on bbox error
                
                required_keys = ['ne_lat', 'ne_lon', 'sw_lat', 'sw_lon']
                missing_keys = [key for key in required_keys if key not in bbox]
                
                if missing_keys:
                    logger.error(f"Missing bbox parameters for fire filtering: {missing_keys}")
                    return standardized_fires  # Return unfiltered on bbox error
                
                logger.debug(f"Applying BBOX filtering to {len(standardized_fires)} fires")
                filtered_fires = filter_fires_by_bbox(
                    standardized_fires,
                    bbox['ne_lat'],
                    bbox['ne_lon'],
                    bbox['sw_lat'],
                    bbox['sw_lon']
                )
                
                logger.info(f"Filtered to {len(filtered_fires)} fires within BBOX")
                return filtered_fires
                
            except Exception as e:
                logger.error(f"Error during BBOX filtering of fires: {e}")
                # Return unfiltered data on filtering error
                return standardized_fires
        
        return standardized_fires
        
    except Exception as e:
        logger.error(f"Critical error in get_all_active_fires: {e}")
        # Return empty list on critical error to ensure graceful degradation
        return []

def standardize_fire_data(raw_fire_data, index=0):
    """
    Convert raw API response to standardized fire data format
    
    Args:
        raw_fire_data: Raw fire data from external API
        index: Index for generating unique ID if not available
        
    Returns:
        Standardized fire data dictionary or None if invalid
    """
    if not isinstance(raw_fire_data, dict):
        return None
    
    try:
        # Extract coordinates
        fire_lat = float(raw_fire_data.get('lat', raw_fire_data.get('latitude', 0)))
        fire_lon = float(raw_fire_data.get('lon', raw_fire_data.get('lng', raw_fire_data.get('longitude', 0))))
        
        # Skip fires with invalid coordinates
        if fire_lat == 0 or fire_lon == 0:
            return None
        
        # Extract location
        location = raw_fire_data.get('location', raw_fire_data.get('name', 'Località non specificata'))
        
        # Handle location object format
        if isinstance(location, dict):
            location = location.get('placeName', location.get('title', 'Località non specificata'))
        
        # Ensure location is a string
        if not isinstance(location, str):
            location = 'Località non specificata'
        
        # Generate unique ID
        fire_id = raw_fire_data.get('id', f"fire_{index:03d}")
        
        # Determine intensity based on fire characteristics
        intensity = _categorize_fire_intensity(raw_fire_data)
        
        # Generate timestamp from acquisition date/time if available, otherwise use current time
        timestamp = raw_fire_data.get('timestamp')
        if not timestamp:
            # Try to construct timestamp from MODIS/VIIRS standard fields
            acq_date = raw_fire_data.get('acq_date')  # Format: YYYY-MM-DD
            acq_time = raw_fire_data.get('acq_time')  # Format: HHMM, HMM, or MM
            
            if acq_date and acq_time:
                try:
                    # Parse acquisition time - can be HHMM, HMM, or MM format
                    time_str = str(acq_time).zfill(4)  # Pad with zeros to get HHMM format
                    hours = int(time_str[:2])
                    minutes = int(time_str[2:4])
                    
                    # Construct ISO 8601 timestamp in UTC
                    timestamp = f"{acq_date}T{hours:02d}:{minutes:02d}:00Z"
                except (ValueError, IndexError):
                    # If parsing fails, use current time
                    timestamp = datetime.utcnow().isoformat() + 'Z'
            else:
                # No acquisition data available, use current time
                timestamp = datetime.utcnow().isoformat() + 'Z'
        
        return {
            'id': str(fire_id),
            'latitude': fire_lat,
            'longitude': fire_lon,
            'intensity': intensity,
            'location': location,
            'timestamp': timestamp
        }
        
    except (ValueError, TypeError, KeyError) as e:
        logger.warning(f"Invalid fire data structure: {e}")
        return None

def filter_fires_by_bbox(fires, ne_lat, ne_lon, sw_lat, sw_lon):
    """
    Filter fires by bounding box coordinates with comprehensive error handling.
    
    Args:
        fires: List of fire dictionaries with lat/lon
        ne_lat: Northeast corner latitude
        ne_lon: Northeast corner longitude
        sw_lat: Southwest corner latitude
        sw_lon: Southwest corner longitude
    
    Returns:
        List of fires within BBOX (no limit, return all matching)
    
    Algorithm:
        1. Filter fires where sw_lat <= lat <= ne_lat
        2. Handle longitude wraparound for BBOX crossing ±180°
        3. Preserve original fire data structure
        4. Return all fires within BBOX (no ranking needed)
    
    Error Handling:
        - Validates input parameters
        - Skips fires with invalid coordinates
        - Logs detailed error information
        - Returns unfiltered data on critical errors
    """
    try:
        # Validate input parameters
        if not isinstance(fires, list):
            logger.error(f"Invalid fires parameter type: {type(fires)}, expected list")
            return fires if fires else []
        
        if not fires:
            logger.debug("Empty fires list provided to filter_fires_by_bbox")
            return []
        
        # Validate BBOX parameters
        try:
            ne_lat, ne_lon, sw_lat, sw_lon = float(ne_lat), float(ne_lon), float(sw_lat), float(sw_lon)
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid BBOX parameter types in filter_fires_by_bbox: {e}")
            return fires  # Return unfiltered data on parameter error
        
        # Validate coordinate ranges
        if not (-90 <= ne_lat <= 90) or not (-90 <= sw_lat <= 90):
            logger.error(f"Latitude values out of range: ne_lat={ne_lat}, sw_lat={sw_lat}")
            return fires  # Return unfiltered data on invalid coordinates
        
        if not (-180 <= ne_lon <= 180) or not (-180 <= sw_lon <= 180):
            logger.error(f"Longitude values out of range: ne_lon={ne_lon}, sw_lon={sw_lon}")
            return fires  # Return unfiltered data on invalid coordinates
        
        if ne_lat < sw_lat:
            logger.error(f"Invalid BBOX: ne_lat ({ne_lat}) < sw_lat ({sw_lat})")
            return fires  # Return unfiltered data on invalid BBOX
        
        logger.debug(f"Filtering {len(fires)} fires by BBOX: ne=({ne_lat},{ne_lon}), sw=({sw_lat},{sw_lon})")
        
        filtered = []
        invalid_coordinate_count = 0
        
        for i, fire in enumerate(fires):
            try:
                # Extract coordinates with error handling
                if not isinstance(fire, dict):
                    logger.warning(f"Fire {i} is not a dictionary, skipping")
                    continue
                
                lat = fire.get('latitude')
                lon = fire.get('longitude')
                
                if lat is None or lon is None:
                    invalid_coordinate_count += 1
                    continue
                
                # Convert to float and validate
                try:
                    lat, lon = float(lat), float(lon)
                except (ValueError, TypeError):
                    invalid_coordinate_count += 1
                    logger.debug(f"Fire {i} has invalid coordinate values: lat={lat}, lon={lon}")
                    continue
                
                # Validate coordinate ranges
                if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                    invalid_coordinate_count += 1
                    logger.debug(f"Fire {i} coordinates out of range: lat={lat}, lon={lon}")
                    continue
                
                # Check latitude bounds
                if not (sw_lat <= lat <= ne_lat):
                    continue
                
                # Check longitude bounds (handle wraparound)
                if sw_lon <= ne_lon:
                    # Normal case: BBOX doesn't cross ±180°
                    if not (sw_lon <= lon <= ne_lon):
                        continue
                else:
                    # Wraparound case: BBOX crosses ±180°
                    if not (lon >= sw_lon or lon <= ne_lon):
                        continue
                
                filtered.append(fire)
                
            except Exception as e:
                # Skip fires with any processing errors
                logger.warning(f"Error processing fire {i} in BBOX filter: {e}")
                continue
        
        if invalid_coordinate_count > 0:
            logger.info(f"Skipped {invalid_coordinate_count} fires with invalid coordinates during BBOX filtering")
        
        logger.info(f"BBOX filtering: {len(filtered)} fires within bounds (from {len(fires)} total)")
        
        return filtered
        
    except Exception as e:
        logger.error(f"Critical error in filter_fires_by_bbox: {e}")
        # Return unfiltered data on any critical error to ensure graceful degradation
        return fires if isinstance(fires, list) else []


def check_nearby_fires(station_lat, station_lon, radius_km=50):
    """
    Check for active fires within radius_km of the station
    
    Args:
        station_lat (float): Station latitude
        station_lon (float): Station longitude
        radius_km (int): Search radius in kilometers (default: 50)
        
    Returns:
        dict: {"found": bool, "count": int, "closest_distance": float} or {"found": False}
    """
    try:
        # Fetch current fires data with timeout
        response = requests.get(
            'https://incendioggi.it/data/current_fires.json',
            timeout=3
        )
        response.raise_for_status()
        
        fires_data = response.json()
        
        # Handle different response formats
        if isinstance(fires_data, dict):
            # If response is a dict, look for fires in a 'fires' key or similar
            fires_list = fires_data.get('fires', fires_data.get('data', []))
        elif isinstance(fires_data, list):
            # If response is directly a list
            fires_list = fires_data
        else:
            # Unknown format
            print(f"⚠️ Unexpected fire API response format: {type(fires_data)}")
            return {"found": False, "error": "Formato risposta non riconosciuto"}
        
        # Check each fire
        nearby_fires = []
        
        for fire in fires_list:
            try:
                # Handle different fire object formats
                if isinstance(fire, dict):
                    fire_lat = float(fire.get('lat', fire.get('latitude', 0)))
                    fire_lon = float(fire.get('lon', fire.get('lng', fire.get('longitude', 0))))
                    location = fire.get('location', fire.get('name', 'Località non specificata'))
                else:
                    # Skip non-dict fire objects
                    continue
                
                # Calculate distance
                distance = haversine_distance(station_lat, station_lon, fire_lat, fire_lon)
                
                # If within radius, add to nearby fires
                if distance <= radius_km:
                    nearby_fires.append({
                        'distance': distance,
                        'location': location
                    })
                    
            except (ValueError, TypeError, KeyError):
                # Skip malformed fire data
                continue
        
        if nearby_fires:
            # Sort by distance and return info about closest fires
            nearby_fires.sort(key=lambda x: x['distance'])
            
            return {
                "found": True,
                "count": len(nearby_fires),
                "closest_distance": round(nearby_fires[0]['distance'], 1),
                "closest_location": nearby_fires[0]['location']
            }
        else:
            return {"found": False}
            
    except requests.exceptions.RequestException as e:
        # Network error - log and return False to not block the app
        print(f"⚠️ Fire API unavailable: {e}")
        return {"found": False, "error": "API non disponibile"}
    
    except Exception as e:
        # Other errors
        print(f"❌ Error checking fires: {e}")
        return {"found": False, "error": "Errore interno"}