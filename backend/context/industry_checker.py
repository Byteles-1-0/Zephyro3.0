"""
Industry Checker Module
Checks for nearby industrial facilities using E-PRTR data
"""
import json
import os
from utils import haversine_distance
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

# Global variable to store industry data (loaded once at startup)
INDUSTRIES_DATA = None

# Major Italian cities for proximity ranking
MAJOR_CITIES = [
    {'name': 'Roma', 'lat': 41.9028, 'lon': 12.4964},
    {'name': 'Milano', 'lat': 45.4642, 'lon': 9.1900},
    {'name': 'Napoli', 'lat': 40.8518, 'lon': 14.2681},
    {'name': 'Torino', 'lat': 45.0703, 'lon': 7.6869},
    {'name': 'Palermo', 'lat': 38.1157, 'lon': 13.3615},
    {'name': 'Genova', 'lat': 44.4056, 'lon': 8.9463},
    {'name': 'Bologna', 'lat': 44.4949, 'lon': 11.3426},
    {'name': 'Firenze', 'lat': 43.7696, 'lon': 11.2558}
]

def validate_geojson_structure(data: Dict[str, Any]) -> bool:
    """
    Validate GeoJSON structure for industry data
    
    Args:
        data: Parsed GeoJSON data
        
    Returns:
        bool: True if structure is valid, False otherwise
    """
    try:
        # Check top-level structure
        if not isinstance(data, dict):
            logger.error("GeoJSON data is not a dictionary")
            return False
        
        if data.get('type') != 'FeatureCollection':
            logger.error(f"Invalid GeoJSON type: {data.get('type')}, expected 'FeatureCollection'")
            return False
        
        features = data.get('features')
        if not isinstance(features, list):
            logger.error("GeoJSON features is not a list")
            return False
        
        # Validate a sample of features (first 10 or all if less than 10)
        sample_size = min(10, len(features))
        for i, feature in enumerate(features[:sample_size]):
            if not validate_feature_structure(feature, i):
                logger.warning(f"Invalid feature structure at index {i}, but continuing with validation")
                # Don't return False here - we want to be tolerant of some malformed features
        
        logger.info(f"GeoJSON structure validation passed for {len(features)} features")
        return True
        
    except Exception as e:
        logger.error(f"Error during GeoJSON structure validation: {e}")
        return False

def validate_feature_structure(feature: Dict[str, Any], index: int) -> bool:
    """
    Validate individual GeoJSON feature structure
    
    Args:
        feature: Individual feature from GeoJSON
        index: Feature index for logging
        
    Returns:
        bool: True if feature structure is valid, False otherwise
    """
    try:
        # Check feature type
        if feature.get('type') != 'Feature':
            logger.warning(f"Feature {index}: Invalid type '{feature.get('type')}', expected 'Feature'")
            return False
        
        # Check geometry
        geometry = feature.get('geometry')
        if not isinstance(geometry, dict):
            logger.warning(f"Feature {index}: Geometry is not a dictionary")
            return False
        
        if geometry.get('type') != 'Point':
            logger.warning(f"Feature {index}: Invalid geometry type '{geometry.get('type')}', expected 'Point'")
            return False
        
        coordinates = geometry.get('coordinates')
        if not isinstance(coordinates, list) or len(coordinates) != 2:
            logger.warning(f"Feature {index}: Invalid coordinates structure")
            return False
        
        # Validate coordinate values
        try:
            lon, lat = float(coordinates[0]), float(coordinates[1])
            if not (-180 <= lon <= 180) or not (-90 <= lat <= 90):
                logger.warning(f"Feature {index}: Coordinates out of valid range: lon={lon}, lat={lat}")
                return False
        except (ValueError, TypeError):
            logger.warning(f"Feature {index}: Coordinates are not valid numbers")
            return False
        
        # Check properties
        properties = feature.get('properties')
        if not isinstance(properties, dict):
            logger.warning(f"Feature {index}: Properties is not a dictionary")
            return False
        
        # Check for required properties (siteName is the most critical)
        if not properties.get('siteName'):
            logger.warning(f"Feature {index}: Missing or empty siteName")
            return False
        
        return True
        
    except Exception as e:
        logger.warning(f"Feature {index}: Error during validation: {e}")
        return False

def validate_industry_data_integrity(features: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Validate the integrity of industry data and provide statistics
    
    Args:
        features: List of GeoJSON features
        
    Returns:
        dict: Validation statistics and status
    """
    stats = {
        'total_features': len(features),
        'valid_features': 0,
        'features_with_pollutants': 0,
        'features_with_coordinates': 0,
        'features_with_names': 0,
        'validation_errors': [],
        'is_usable': False
    }
    
    try:
        for i, feature in enumerate(features):
            is_valid = True
            
            # Check coordinates
            try:
                coords = feature['geometry']['coordinates']
                lon, lat = float(coords[0]), float(coords[1])
                if -180 <= lon <= 180 and -90 <= lat <= 90:
                    stats['features_with_coordinates'] += 1
                else:
                    is_valid = False
                    stats['validation_errors'].append(f"Feature {i}: Invalid coordinates")
            except (KeyError, IndexError, TypeError, ValueError):
                is_valid = False
                stats['validation_errors'].append(f"Feature {i}: Missing or invalid coordinates")
            
            # Check site name
            try:
                site_name = feature['properties'].get('siteName')
                if site_name and site_name.strip():
                    stats['features_with_names'] += 1
                else:
                    is_valid = False
                    stats['validation_errors'].append(f"Feature {i}: Missing or empty siteName")
            except (KeyError, TypeError):
                is_valid = False
                stats['validation_errors'].append(f"Feature {i}: Missing properties or siteName")
            
            # Check pollutants (optional but important for ranking)
            try:
                pollutants = feature['properties'].get('pollutants')
                if pollutants and pollutants != 'null' and str(pollutants).strip():
                    stats['features_with_pollutants'] += 1
            except (KeyError, TypeError):
                pass  # Pollutants are optional
            
            if is_valid:
                stats['valid_features'] += 1
        
        # Determine if data is usable
        # We need at least 5 valid features to provide meaningful top 5 results
        stats['is_usable'] = (
            stats['valid_features'] >= 5 and
            stats['features_with_coordinates'] >= 5 and
            stats['features_with_names'] >= 5
        )
        
        # Log validation summary
        logger.info(f"Industry data validation: {stats['valid_features']}/{stats['total_features']} valid features")
        if stats['features_with_pollutants'] > 0:
            logger.info(f"Features with pollutant data: {stats['features_with_pollutants']}")
        
        if not stats['is_usable']:
            logger.warning("Industry data is not usable - insufficient valid features")
        
        return stats
        
    except Exception as e:
        logger.error(f"Error during data integrity validation: {e}")
        stats['validation_errors'].append(f"Validation process error: {e}")
        return stats
def load_industries_data():
    """Load industries data from GeoJSON file at startup with comprehensive validation"""
    global INDUSTRIES_DATA
    
    if INDUSTRIES_DATA is None:
        try:
            # Get the path to the data file
            current_dir = os.path.dirname(os.path.abspath(__file__))
            data_path = os.path.join(current_dir, '..', 'data', 'industrie_italia.geojson')
            
            # Check if file exists
            if not os.path.exists(data_path):
                logger.error(f"Industry data file not found: {data_path}")
                INDUSTRIES_DATA = create_empty_industries_data()
                return INDUSTRIES_DATA
            
            # Check file size and readability
            try:
                file_size = os.path.getsize(data_path)
                if file_size == 0:
                    logger.error("Industry data file is empty")
                    INDUSTRIES_DATA = create_empty_industries_data()
                    return INDUSTRIES_DATA
                
                logger.info(f"Loading industry data file ({file_size} bytes)")
                
            except OSError as e:
                logger.error(f"Cannot access industry data file: {e}")
                INDUSTRIES_DATA = create_empty_industries_data()
                return INDUSTRIES_DATA
            
            # Load and parse JSON
            try:
                with open(data_path, 'r', encoding='utf-8') as f:
                    raw_data = json.load(f)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in industry data file: {e}")
                INDUSTRIES_DATA = create_empty_industries_data()
                return INDUSTRIES_DATA
            except UnicodeDecodeError as e:
                logger.error(f"Encoding error in industry data file: {e}")
                INDUSTRIES_DATA = create_empty_industries_data()
                return INDUSTRIES_DATA
            except Exception as e:
                logger.error(f"Error reading industry data file: {e}")
                INDUSTRIES_DATA = create_empty_industries_data()
                return INDUSTRIES_DATA
            
            # Validate GeoJSON structure
            if not validate_geojson_structure(raw_data):
                logger.error("Industry data file has invalid GeoJSON structure")
                INDUSTRIES_DATA = create_empty_industries_data()
                return INDUSTRIES_DATA
            
            # Validate data integrity
            features = raw_data.get('features', [])
            validation_stats = validate_industry_data_integrity(features)
            
            if not validation_stats['is_usable']:
                logger.error(f"Industry data is not usable: {validation_stats}")
                INDUSTRIES_DATA = create_empty_industries_data()
                return INDUSTRIES_DATA
            
            # Data is valid, store it
            INDUSTRIES_DATA = raw_data
            
            logger.info(f"Successfully loaded {len(features)} industrial facilities")
            logger.info(f"Data quality: {validation_stats['valid_features']} valid, "
                       f"{validation_stats['features_with_pollutants']} with pollutants")
            
            return INDUSTRIES_DATA
            
        except Exception as e:
            logger.error(f"Unexpected error loading industries data: {e}")
            INDUSTRIES_DATA = create_empty_industries_data()
            return INDUSTRIES_DATA
    
    return INDUSTRIES_DATA

def create_empty_industries_data() -> Dict[str, Any]:
    """
    Create empty industries data structure as fallback
    
    Returns:
        dict: Empty GeoJSON FeatureCollection
    """
    return {
        "type": "FeatureCollection",
        "name": "industrie_italia",
        "features": [],
        "error_state": True,
        "error_message": "Industry data unavailable due to file issues"
    }

def filter_industries_by_bbox(
    industries: List[Dict],
    ne_lat: float,
    ne_lon: float,
    sw_lat: float,
    sw_lon: float,
    limit: int = 30
) -> List[Dict]:
    """
    Filter industries by bounding box coordinates with comprehensive error handling.
    
    Args:
        industries: List of industry dictionaries with lat/lon
        ne_lat: Northeast corner latitude
        ne_lon: Northeast corner longitude
        sw_lat: Southwest corner latitude
        sw_lon: Southwest corner longitude
        limit: Maximum number of industries to return (default: 30)
    
    Returns:
        List of industries within BBOX, ranked by pollution impact,
        limited to top 'limit' facilities
    
    Algorithm:
        1. Filter industries where sw_lat <= lat <= ne_lat
        2. Handle longitude wraparound for BBOX crossing ±180°
           - Normal case (sw_lon <= ne_lon): sw_lon <= lon <= ne_lon
           - Wraparound case (sw_lon > ne_lon): lon >= sw_lon OR lon <= ne_lon
        3. Apply existing ranking algorithm to filtered results
        4. Return top 'limit' industries
    
    Error Handling:
        - Validates input parameters
        - Skips industries with invalid coordinates
        - Logs detailed error information
        - Returns unfiltered data on critical errors
    """
    try:
        # Validate input parameters
        if not isinstance(industries, list):
            logger.error(f"Invalid industries parameter type: {type(industries)}, expected list")
            return industries if industries else []
        
        if not industries:
            logger.debug("Empty industries list provided to filter_industries_by_bbox")
            return []
        
        # Validate BBOX parameters
        try:
            ne_lat, ne_lon, sw_lat, sw_lon = float(ne_lat), float(ne_lon), float(sw_lat), float(sw_lon)
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid BBOX parameter types in filter_industries_by_bbox: {e}")
            return industries  # Return unfiltered data on parameter error
        
        # Validate coordinate ranges
        if not (-90 <= ne_lat <= 90) or not (-90 <= sw_lat <= 90):
            logger.error(f"Latitude values out of range: ne_lat={ne_lat}, sw_lat={sw_lat}")
            return industries  # Return unfiltered data on invalid coordinates
        
        if not (-180 <= ne_lon <= 180) or not (-180 <= sw_lon <= 180):
            logger.error(f"Longitude values out of range: ne_lon={ne_lon}, sw_lon={sw_lon}")
            return industries  # Return unfiltered data on invalid coordinates
        
        if ne_lat < sw_lat:
            logger.error(f"Invalid BBOX: ne_lat ({ne_lat}) < sw_lat ({sw_lat})")
            return industries  # Return unfiltered data on invalid BBOX
        
        logger.debug(f"Filtering {len(industries)} industries by BBOX: ne=({ne_lat},{ne_lon}), sw=({sw_lat},{sw_lon})")
        
        filtered = []
        invalid_coordinate_count = 0
        
        for i, industry in enumerate(industries):
            try:
                # Extract coordinates with error handling
                if not isinstance(industry, dict):
                    logger.warning(f"Industry {i} is not a dictionary, skipping")
                    continue
                
                lat = industry.get('latitude')
                lon = industry.get('longitude')
                
                if lat is None or lon is None:
                    invalid_coordinate_count += 1
                    continue
                
                # Convert to float and validate
                try:
                    lat, lon = float(lat), float(lon)
                except (ValueError, TypeError):
                    invalid_coordinate_count += 1
                    logger.debug(f"Industry {i} has invalid coordinate values: lat={lat}, lon={lon}")
                    continue
                
                # Validate coordinate ranges
                if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                    invalid_coordinate_count += 1
                    logger.debug(f"Industry {i} coordinates out of range: lat={lat}, lon={lon}")
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
                
                filtered.append(industry)
                
            except Exception as e:
                # Skip industries with any processing errors
                logger.warning(f"Error processing industry {i} in BBOX filter: {e}")
                continue
        
        if invalid_coordinate_count > 0:
            logger.info(f"Skipped {invalid_coordinate_count} industries with invalid coordinates during BBOX filtering")
        
        logger.info(f"BBOX filtering: {len(filtered)} industries within bounds (from {len(industries)} total)")
        
        # Apply existing ranking to filtered results with error handling
        try:
            ranked = rank_industries_by_pollution_impact(filtered)
        except Exception as e:
            logger.error(f"Error ranking filtered industries: {e}")
            # Return filtered but unranked results
            ranked = filtered
        
        # Return top 'limit' industries
        result = ranked[:limit] if limit > 0 else ranked
        logger.debug(f"Returning top {len(result)} industries after BBOX filtering and ranking")
        
        return result
        
    except Exception as e:
        logger.error(f"Critical error in filter_industries_by_bbox: {e}")
        # Return unfiltered data on any critical error to ensure graceful degradation
        return industries if isinstance(industries, list) else []


def get_top_polluting_industries(
    limit: int = 5,
    bbox: Optional[Dict[str, float]] = None
) -> List[Dict]:
    """
    Get top polluting industrial facilities, optionally filtered by BBOX.
    
    Args:
        limit: Maximum number of facilities to return
        bbox: Optional dict with keys: ne_lat, ne_lon, sw_lat, sw_lon
        
    Returns:
        List of top polluting facilities with ranking metadata
    """
    try:
        # Ensure data is loaded
        if INDUSTRIES_DATA is None:
            load_industries_data()
        
        # Check if data is in error state
        if INDUSTRIES_DATA.get('error_state', False):
            logger.warning("Industry data is in error state, returning empty list")
            return []
        
        # Get all valid industries with comprehensive error handling
        valid_industries = []
        processing_errors = 0
        
        for i, feature in enumerate(INDUSTRIES_DATA.get('features', [])):
            try:
                # Extract basic info with error handling
                geometry = feature.get('geometry', {})
                if not isinstance(geometry, dict):
                    processing_errors += 1
                    continue
                
                coords = geometry.get('coordinates')
                if not isinstance(coords, list) or len(coords) != 2:
                    processing_errors += 1
                    continue
                
                try:
                    industry_lon, industry_lat = float(coords[0]), float(coords[1])
                except (ValueError, TypeError):
                    processing_errors += 1
                    continue
                
                # Validate coordinates
                if not (-180 <= industry_lon <= 180) or not (-90 <= industry_lat <= 90):
                    processing_errors += 1
                    continue
                
                properties = feature.get('properties', {})
                if not isinstance(properties, dict):
                    processing_errors += 1
                    continue
                
                # Skip facilities without pollutant data
                pollutants_raw = properties.get('pollutants')
                if not pollutants_raw or pollutants_raw == 'null':
                    continue
                
                # Parse pollutants string into array with error handling
                try:
                    if isinstance(pollutants_raw, str):
                        pollutants = [p.strip() for p in pollutants_raw.split(',') if p.strip()]
                    else:
                        pollutants = pollutants_raw if isinstance(pollutants_raw, list) else []
                except Exception:
                    processing_errors += 1
                    continue
                
                if not pollutants or len(pollutants) == 0:
                    continue
                
                # Create industry data structure with error handling
                try:
                    site_name = properties.get('siteName', 'Impianto Industriale')
                    if not isinstance(site_name, str):
                        site_name = 'Impianto Industriale'
                    
                    sector_raw = properties.get('eprtr_sectors', 'OTHER')
                    sector = normalize_sector(sector_raw)
                    
                    population_proximity = calculate_population_proximity(industry_lat, industry_lon)
                    
                    industry_data = {
                        'id': f"industry_{i:03d}",
                        'name': site_name,
                        'latitude': industry_lat,
                        'longitude': industry_lon,
                        'sector': sector,
                        'pollutant_count': len(pollutants),
                        'pollutants': pollutants[:10],  # Limit to first 10 pollutants for display
                        'population_proximity': population_proximity
                    }
                    
                    valid_industries.append(industry_data)
                    
                except Exception as e:
                    logger.debug(f"Error creating industry data structure for feature {i}: {e}")
                    processing_errors += 1
                    continue
                
            except Exception as e:
                # Skip malformed features
                logger.debug(f"Error processing industry feature {i}: {e}")
                processing_errors += 1
                continue
        
        if processing_errors > 0:
            logger.info(f"Skipped {processing_errors} industries due to processing errors")
        
        logger.debug(f"Processed {len(valid_industries)} valid industries from {len(INDUSTRIES_DATA.get('features', []))} total features")
        
        # If bbox is provided, filter industries by bounding box with error handling
        if bbox is not None:
            try:
                # Validate bbox structure
                if not isinstance(bbox, dict):
                    logger.error(f"Invalid bbox type: {type(bbox)}, expected dict")
                    bbox = None
                else:
                    # Extract bbox parameters with validation
                    required_keys = ['ne_lat', 'ne_lon', 'sw_lat', 'sw_lon']
                    missing_keys = [key for key in required_keys if key not in bbox]
                    
                    if missing_keys:
                        logger.error(f"Missing bbox parameters: {missing_keys}")
                        bbox = None
                    else:
                        ne_lat = bbox.get('ne_lat')
                        ne_lon = bbox.get('ne_lon')
                        sw_lat = bbox.get('sw_lat')
                        sw_lon = bbox.get('sw_lon')
                        
                        # Call filter_industries_by_bbox with the valid industries
                        logger.debug(f"Applying BBOX filtering to {len(valid_industries)} industries")
                        return filter_industries_by_bbox(
                            valid_industries,
                            ne_lat,
                            ne_lon,
                            sw_lat,
                            sw_lon,
                            limit=limit
                        )
                        
            except Exception as e:
                logger.error(f"Error during BBOX filtering of industries: {e}")
                # Fall through to unfiltered processing
                bbox = None
        
        # No bbox provided or bbox filtering failed - use original behavior
        try:
            # Rank industries by pollution impact
            ranked_industries = rank_industries_by_pollution_impact(valid_industries)
            
            # Return top facilities
            result = ranked_industries[:limit]
            logger.debug(f"Returning top {len(result)} industries (no BBOX filtering)")
            return result
            
        except Exception as e:
            logger.error(f"Error ranking industries: {e}")
            # Return unranked but limited results as fallback
            return valid_industries[:limit] if valid_industries else []
        
    except Exception as e:
        logger.error(f"Critical error in get_top_polluting_industries: {e}")
        # Return empty list on critical error to ensure graceful degradation
        return []

def rank_industries_by_pollution_impact(industries):
    """
    Rank industrial facilities by pollution impact using multi-criteria algorithm
    
    Ranking Criteria (in order of priority):
    1. Number of different pollutants emitted
    2. Sector priority (ENERGY > MANUFACTURING > OTHER)
    3. Proximity to major population centers
    
    Args:
        industries: List of industrial facility data
        
    Returns:
        Sorted list of industries by pollution impact
    """
    def get_ranking_score(industry):
        # Primary: Pollutant count (higher is worse)
        pollutant_score = industry['pollutant_count'] * 1000
        
        # Secondary: Sector priority
        sector_scores = {
            'ENERGY': 100,
            'MANUFACTURING': 50,
            'CHEMICAL': 75,
            'MINING': 60,
            'OTHER': 0
        }
        sector_score = sector_scores.get(industry['sector'], 0)
        
        # Tertiary: Population proximity (closer is worse, so invert)
        proximity_score = max(0, 100 - industry['population_proximity'])
        
        return pollutant_score + sector_score + proximity_score
    
    # Sort by ranking score (descending)
    ranked = sorted(industries, key=get_ranking_score, reverse=True)
    
    # Add ranking scores for debugging
    for i, industry in enumerate(ranked):
        industry['ranking_score'] = get_ranking_score(industry)
    
    return ranked

def normalize_sector(raw_sector):
    """
    Normalize sector names to standard categories
    
    Args:
        raw_sector: Raw sector string from E-PRTR data
        
    Returns:
        Normalized sector category
    """
    if not raw_sector:
        return 'OTHER'
    
    sector_upper = raw_sector.upper()
    
    if 'ENERGY' in sector_upper or 'POWER' in sector_upper or 'ELETTRIC' in sector_upper:
        return 'ENERGY'
    elif 'CHEMICAL' in sector_upper or 'CHIMIC' in sector_upper:
        return 'CHEMICAL'
    elif 'MANUFACTURING' in sector_upper or 'MANIFATTUR' in sector_upper or 'PRODUZ' in sector_upper:
        return 'MANUFACTURING'
    elif 'MINING' in sector_upper or 'ESTRAZ' in sector_upper:
        return 'MINING'
    else:
        return 'OTHER'

def calculate_population_proximity(lat, lon):
    """
    Calculate proximity to major population centers
    
    Args:
        lat: Facility latitude
        lon: Facility longitude
        
    Returns:
        Distance in km to nearest major city
    """
    min_distance = float('inf')
    
    for city in MAJOR_CITIES:
        distance = haversine_distance(lat, lon, city['lat'], city['lon'])
        min_distance = min(min_distance, distance)
    
    return round(min_distance, 1)

def check_nearby_industries(station_lat, station_lon, radius_km=10):
    """
    Check for industrial facilities within radius_km of the station
    
    Args:
        station_lat (float): Station latitude
        station_lon (float): Station longitude  
        radius_km (int): Search radius in kilometers (default: 10)
        
    Returns:
        dict: {"found": bool, "name": str, "sector": str} or {"found": False}
    """
    # Ensure data is loaded
    if INDUSTRIES_DATA is None:
        load_industries_data()
    
    # Check each industry facility
    for feature in INDUSTRIES_DATA.get('features', []):
        try:
            # Get industry coordinates
            coords = feature['geometry']['coordinates']
            industry_lon, industry_lat = coords[0], coords[1]
            
            # Calculate distance
            distance = haversine_distance(station_lat, station_lon, industry_lat, industry_lon)
            
            # If within radius, return industry info
            if distance <= radius_km:
                properties = feature.get('properties', {})
                
                return {
                    "found": True,
                    "name": properties.get('siteName', 'Impianto Industriale'),
                    "sector": properties.get('eprtr_sectors', 'Settore non specificato'),
                    "distance_km": round(distance, 1)
                }
                
        except (KeyError, IndexError, TypeError) as e:
            # Skip malformed features
            continue
    
    return {"found": False}

# Initialize data when module is imported
load_industries_data()