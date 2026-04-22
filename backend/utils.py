"""
Utility functions for the AirQuality Italy backend
"""
import math
import logging

logger = logging.getLogger(__name__)

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    
    Returns distance in kilometers
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    
    return c * r


def extract_bbox_params(request_args):
    """
    Extract BBOX parameters from Flask request.args
    
    Args:
        request_args: Flask request.args object containing query parameters
    
    Returns:
        dict with keys {ne_lat, ne_lon, sw_lat, sw_lon} if all parameters are present,
        None if any parameter is missing (for backward compatibility)
    
    Note:
        This function only extracts parameters. Use validate_bbox() to validate them.
    """
    try:
        # Check if all four BBOX parameters are present
        required_params = ['ne_lat', 'ne_lon', 'sw_lat', 'sw_lon']
        
        # Return None if any parameter is missing (backward compatibility)
        for param in required_params:
            if param not in request_args:
                logger.debug(f'BBOX parameter {param} is missing, returning None')
                return None
        
        # Extract and convert to float
        bbox = {
            'ne_lat': float(request_args.get('ne_lat')),
            'ne_lon': float(request_args.get('ne_lon')),
            'sw_lat': float(request_args.get('sw_lat')),
            'sw_lon': float(request_args.get('sw_lon'))
        }
        
        logger.debug(f'Extracted BBOX parameters: {bbox}')
        return bbox
        
    except (ValueError, TypeError) as e:
        # Invalid parameter format (e.g., non-numeric values)
        logger.warning(f'Invalid BBOX parameter format: {e}')
        return None
    except Exception as e:
        # Unexpected error during extraction
        logger.error(f'Unexpected error extracting BBOX parameters: {e}')
        return None


def validate_bbox(bbox):
    """
    Validate BBOX parameters
    
    Args:
        bbox: dict with keys {ne_lat, ne_lon, sw_lat, sw_lon}
    
    Returns:
        bool: True if BBOX is valid, False otherwise
    
    Validation Rules:
        - Latitude values must be in range [-90, 90]
        - Longitude values must be in range [-180, 180]
        - Northeast latitude must be >= Southwest latitude
    """
    if bbox is None:
        return False
    
    try:
        ne_lat = bbox.get('ne_lat')
        ne_lon = bbox.get('ne_lon')
        sw_lat = bbox.get('sw_lat')
        sw_lon = bbox.get('sw_lon')
        
        # Check if all parameters are present
        if None in [ne_lat, ne_lon, sw_lat, sw_lon]:
            logger.warning('BBOX validation failed: missing parameters')
            return False
        
        # Validate latitude range [-90, 90]
        if not (-90 <= ne_lat <= 90):
            logger.warning(f'BBOX validation failed: ne_lat {ne_lat} out of range [-90, 90]')
            return False
        
        if not (-90 <= sw_lat <= 90):
            logger.warning(f'BBOX validation failed: sw_lat {sw_lat} out of range [-90, 90]')
            return False
        
        # Validate longitude range [-180, 180]
        if not (-180 <= ne_lon <= 180):
            logger.warning(f'BBOX validation failed: ne_lon {ne_lon} out of range [-180, 180]')
            return False
        
        if not (-180 <= sw_lon <= 180):
            logger.warning(f'BBOX validation failed: sw_lon {sw_lon} out of range [-180, 180]')
            return False
        
        # Validate that northeast latitude >= southwest latitude
        if ne_lat < sw_lat:
            logger.warning(f'BBOX validation failed: ne_lat {ne_lat} < sw_lat {sw_lat}')
            return False
        
        logger.debug(f'BBOX validation passed: {bbox}')
        return True
        
    except (TypeError, AttributeError) as e:
        logger.error(f'BBOX validation error: {e}')
        return False