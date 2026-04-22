"""
Forecast Extractor - Extract forecast values from ARPAE maps

This module extracts pollution forecast values for specific station coordinates
by sampling the ARPAE/CHIMERE forecast map images at those coordinates.
"""
import requests
from PIL import Image
from io import BytesIO
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache

logger = logging.getLogger(__name__)

# Cache for downloaded images (in-memory, max 100 images)
@lru_cache(maxsize=100)
def download_image_cached(image_url):
    """Download and cache image"""
    response = requests.get(image_url, timeout=10)
    response.raise_for_status()
    return response.content

# ARPAE color legend mapping (color -> concentration range in μg/m³)
ARPAE_LEGEND = [
    {'color': (19, 99, 190), 'range': (0, 2), 'label': '0 - 2'},
    {'color': (19, 99, 209), 'range': (2, 5), 'label': '2 - 5'},
    {'color': (39, 129, 239), 'range': (5, 10), 'label': '5 - 10'},
    {'color': (81, 156, 255), 'range': (10, 20), 'label': '10 - 20'},
    {'color': (80, 240, 80), 'range': (20, 30), 'label': '20 - 30'},
    {'color': (253, 255, 0), 'range': (30, 40), 'label': '30 - 40'},
    {'color': (255, 195, 0), 'range': (40, 50), 'label': '40 - 50'},
    {'color': (255, 87, 51), 'range': (50, 75), 'label': '50 - 75'},
    {'color': (225, 75, 0), 'range': (75, 100), 'label': '75 - 100'},
    {'color': (199, 0, 57), 'range': (100, 150), 'label': '100 - 150'},
    {'color': (144, 12, 62), 'range': (150, 200), 'label': '150 - 200'},
    {'color': (87, 24, 69), 'range': (200, 300), 'label': '> 200'},
]


def color_distance(c1, c2):
    """Calculate Euclidean distance between two RGB colors"""
    return sum((a - b) ** 2 for a, b in zip(c1, c2)) ** 0.5


def find_closest_legend_entry(pixel_color):
    """
    Find the closest legend entry for a given pixel color
    
    Args:
        pixel_color: RGB tuple (r, g, b)
    
    Returns:
        Dict with 'range' and 'label' keys, or None if too far from any legend color
    """
    min_distance = float('inf')
    closest_entry = None
    
    for entry in ARPAE_LEGEND:
        distance = color_distance(pixel_color[:3], entry['color'])
        if distance < min_distance:
            min_distance = distance
            closest_entry = entry
    
    # If distance is too large, the pixel might be outside the map or in a masked area
    if min_distance > 100:  # Threshold for "too different"
        return None
    
    return closest_entry


def lat_lon_to_pixel(lat, lon, bounds, image_width, image_height):
    """
    Convert lat/lon coordinates to pixel coordinates in the image
    
    Args:
        lat: Latitude
        lon: Longitude
        bounds: [[south, west], [north, east]]
        image_width: Image width in pixels
        image_height: Image height in pixels
    
    Returns:
        (x, y) pixel coordinates, or None if outside bounds
    """
    south, west = bounds[0]
    north, east = bounds[1]
    
    # Check if coordinates are within bounds
    if not (south <= lat <= north and west <= lon <= east):
        return None
    
    # Convert to pixel coordinates
    # X increases from west to east
    x = int((lon - west) / (east - west) * image_width)
    # Y increases from north to south (image coordinates)
    y = int((north - lat) / (north - south) * image_height)
    
    # Clamp to image bounds
    x = max(0, min(x, image_width - 1))
    y = max(0, min(y, image_height - 1))
    
    return (x, y)


def extract_value_from_map(image_url, lat, lon, bounds):
    """
    Extract pollution value from ARPAE map at given coordinates
    
    Args:
        image_url: URL of the ARPAE forecast map image
        lat: Station latitude
        lon: Station longitude
        bounds: Map bounds [[south, west], [north, east]]
    
    Returns:
        Float value in μg/m³, or None if extraction failed
    """
    try:
        # Download image (with caching)
        image_content = download_image_cached(image_url)
        
        # Open image
        img = Image.open(BytesIO(image_content))
        
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        width, height = img.size
        
        # Convert lat/lon to pixel coordinates
        pixel_coords = lat_lon_to_pixel(lat, lon, bounds, width, height)
        
        if pixel_coords is None:
            logger.warning(f"Coordinates ({lat}, {lon}) outside map bounds")
            return None
        
        x, y = pixel_coords
        
        # Get pixel color
        pixel_color = img.getpixel((x, y))
        
        # Find closest legend entry
        legend_entry = find_closest_legend_entry(pixel_color)
        
        if legend_entry is None:
            logger.warning(f"Pixel color {pixel_color} at ({x}, {y}) doesn't match any legend entry")
            return None
        
        # Return middle of range
        range_min, range_max = legend_entry['range']
        value = (range_min + range_max) / 2
        
        logger.debug(f"Extracted value {value} μg/m³ at ({lat}, {lon}) -> pixel ({x}, {y}), color {pixel_color}")
        
        return value
        
    except Exception as e:
        logger.error(f"Error extracting value from map: {e}")
        return None


def extract_forecast_for_station(forecast_maps_data, lat, lon, max_hours=None):
    """
    Extract complete forecast time series for a station from ARPAE maps
    Uses parallel processing for faster extraction
    
    Args:
        forecast_maps_data: Response from /api/forecast-maps endpoint
        lat: Station latitude
        lon: Station longitude
        max_hours: Maximum number of hours to extract (None = all)
    
    Returns:
        List of dicts with 'timestamp' and 'value' keys
    """
    forecast = []
    bounds = forecast_maps_data.get('bounds')
    maps = forecast_maps_data.get('maps', [])
    
    if not bounds or not maps:
        logger.error("Invalid forecast maps data")
        return []
    
    # Limit maps if max_hours specified
    if max_hours:
        maps = maps[:max_hours]
    
    logger.info(f"Extracting forecast for station at ({lat}, {lon}) from {len(maps)} maps")
    
    # Process maps in parallel for faster extraction
    def process_map(map_data):
        """Process a single map and return result"""
        image_url = map_data.get('image_url')
        timestamp = map_data.get('timestamp')
        
        if not image_url or not timestamp:
            return None
        
        value = extract_value_from_map(image_url, lat, lon, bounds)
        
        if value is not None:
            return {
                'timestamp': timestamp,
                'value': round(value, 1),
                'source': 'ARPAE_CHIMERE'
            }
        return None
    
    # Use ThreadPoolExecutor for parallel downloads
    with ThreadPoolExecutor(max_workers=10) as executor:
        # Submit all tasks
        future_to_map = {executor.submit(process_map, map_data): map_data for map_data in maps}
        
        # Collect results as they complete
        for future in as_completed(future_to_map):
            result = future.result()
            if result:
                forecast.append(result)
    
    # Sort by timestamp to maintain chronological order
    forecast.sort(key=lambda x: x['timestamp'])
    
    logger.info(f"Extracted {len(forecast)} forecast points for station")
    
    return forecast
