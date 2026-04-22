"""
Cause Analyzer - Source Apportionment Engine
Analyzes pollution data and determines the most likely cause
"""
from context.industry_checker import check_nearby_industries
from context.fire_fetcher import check_nearby_fires

def analyze_pollution_cause(pm10_val, pm25_val, lat, lon, is_rural=False, weather_data=None, month=None, hour=None):
    """
    Analyze pollution values and determine the most likely cause
    
    Args:
        pm10_val (float): PM10 concentration (μg/m³)
        pm25_val (float): PM2.5 concentration (μg/m³)
        lat (float): Station latitude
        lon (float): Station longitude
        is_rural (bool): Whether station is in rural area (default: False)
        weather_data (dict): Weather conditions (mocked if None)
        month (int): Current month (1-12)
        hour (int): Current hour (0-23)
        
    Returns:
        dict: Alert context with status, cause, icon, and description
    """
    
    # Mock weather data if not provided
    if weather_data is None:
        weather_data = {
            "wind_speed": 2.5,  # m/s
            "wind_direction": 180,  # degrees (South = Scirocco)
            "precipitation": 0,  # mm
            "temperature": 15  # °C
        }
    
    # Mock temporal data if not provided
    if month is None:
        import datetime
        month = datetime.datetime.now().month
    if hour is None:
        import datetime
        hour = datetime.datetime.now().hour
    
    # Convert values to float for safety
    try:
        pm10_val = float(pm10_val) if pm10_val is not None else 0
        pm25_val = float(pm25_val) if pm25_val is not None else 0
    except (ValueError, TypeError):
        pm10_val = pm25_val = 0
    
    # Calculate PM2.5/PM10 ratio (avoid division by zero)
    pm_ratio = (pm25_val / pm10_val) if pm10_val > 0 else 0
    
    # Extract weather conditions
    wind_speed = weather_data.get('wind_speed', 2.5)
    wind_direction = weather_data.get('wind_direction', 180)
    precipitation = weather_data.get('precipitation', 0)
    
    # Check if wind is from South (Scirocco) - between 135° and 225°
    is_scirocco = 135 <= wind_direction <= 225
    
    print(f"🔍 Analyzing: PM10={pm10_val}, PM2.5={pm25_val}, ratio={pm_ratio:.2f}, wind={wind_speed}m/s from {wind_direction}°")
    
    # PRIORITY 1 - FIRES 🔥
    fire_check = check_nearby_fires(lat, lon, radius_km=50)
    if fire_check["found"] and pm25_val > 25:
        return {
            "status": "critical",
            "cause": "Fumo da Incendio Boschivo",
            "icon": "🔥🌲",
            "desc": f"Rilevati incendi attivi nel raggio di 50km (più vicino a {fire_check['closest_distance']}km) che stanno trasportando particolato.",
            "context": {
                "fires_count": fire_check["count"],
                "closest_distance": fire_check["closest_distance"]
            }
        }
    
    # PRIORITY 2 - SAHARAN DUST 🏜️
    if pm10_val > 40 and pm_ratio < 0.4 and is_scirocco:
        return {
            "status": "warning", 
            "cause": "Polveri Sahariane",
            "icon": "🏜️",
            "desc": "Il picco di PM10 è dovuto a sabbia e polveri fini trasportate dai venti di scirocco dal Nord Africa.",
            "context": {
                "pm_ratio": round(pm_ratio, 2),
                "wind_direction": wind_direction
            }
        }
    
    # PRIORITY 3 - INDUSTRIES 🏭
    industry_check = check_nearby_industries(lat, lon, radius_km=10)
    if industry_check["found"] and pm10_val > 30:
        return {
            "status": "warning",
            "cause": "Emissioni Industriali", 
            "icon": "🏭",
            "desc": f"Possibile impatto delle emissioni dal vicino polo industriale ({industry_check['name']}) a {industry_check['distance_km']}km.",
            "context": {
                "industry_name": industry_check["name"],
                "industry_sector": industry_check["sector"],
                "distance": industry_check["distance_km"]
            }
        }
    
    # PRIORITY 4 - AGRICULTURAL ACTIVITIES 🚜
    if month in [2, 3, 10, 11] and is_rural and pm10_val > 40:
        return {
            "status": "warning",
            "cause": "Attività Agricole (Ammoniaca)",
            "icon": "🚜", 
            "desc": "Tipico periodo di spandimento di fertilizzanti e liquami che generano particolato secondario.",
            "context": {
                "season": "spreading_season",
                "month": month
            }
        }
    
    # PRIORITY 5 - TRAFFIC AND HEATING (Fallback) 🚗🔥
    
    # Winter heating (November to March, evening/night hours)
    if month in [11, 12, 1, 2, 3] and hour in range(17, 24):
        cause_detail = "Riscaldamento Domestico"
        icon = "🔥"
        desc = "Emissioni da riscaldamento domestico nelle ore serali invernali."
        
    # Rush hour traffic
    elif hour in list(range(7, 10)) + list(range(17, 20)):
        cause_detail = "Traffico Veicolare"
        icon = "🚗💨"
        desc = "Emissioni da traffico veicolare nelle ore di punta."
        
    # Low wind stagnation
    elif wind_speed < 1.5:
        cause_detail = "Stagnazione Atmosferica"
        icon = "🌫️"
        desc = "Condizioni di calma di vento che impediscono la dispersione degli inquinanti."
        
    else:
        cause_detail = "Emissioni Urbane"
        icon = "🏙️"
        desc = "Mix di emissioni urbane tipiche (traffico, riscaldamento, attività antropiche)."
    
    # Add stagnation note if wind is very low
    if wind_speed < 1.5 and cause_detail != "Stagnazione Atmosferica":
        cause_detail += " + Stagnazione"
        desc += " Aggravato da condizioni di calma di vento."
    
    # Check if pollution levels warrant a warning
    if pm10_val > 25 or pm25_val > 15:
        status = "warning"
    else:
        status = "moderate"
    
    # CLEAN AIR CONDITIONS 🍃
    if pm10_val < 20 and (wind_speed > 4 or precipitation > 0):
        return {
            "status": "success",
            "cause": "Dispersione Attiva",
            "icon": "🍃",
            "desc": "Le condizioni meteo stanno favorendo un'ottima dispersione degli inquinanti.",
            "context": {
                "wind_speed": wind_speed,
                "precipitation": precipitation
            }
        }
    
    # Return fallback analysis
    return {
        "status": status,
        "cause": cause_detail,
        "icon": icon,
        "desc": desc,
        "context": {
            "pm10": pm10_val,
            "pm25": pm25_val,
            "wind_speed": wind_speed,
            "hour": hour,
            "month": month
        }
    }

def get_pollution_analysis(station_data, weather_data=None):
    """
    Convenience function to analyze pollution for a station
    
    Args:
        station_data (dict): Station data with coordinates and pollution values
        weather_data (dict): Optional weather data
        
    Returns:
        dict: Analysis result
    """
    
    # Extract station info
    lat = station_data.get('lat', 0)
    lon = station_data.get('lon', 0)
    pm10 = station_data.get('pm10_value', 0)
    pm25 = station_data.get('pm25_value', 0)
    
    # Determine if rural (simple heuristic - can be improved)
    station_name = station_data.get('station_name', '').lower()
    is_rural = any(keyword in station_name for keyword in ['rurale', 'campagna', 'agricola', 'bosco', 'parco'])
    
    # Run analysis
    result = analyze_pollution_cause(
        pm10_val=pm10,
        pm25_val=pm25, 
        lat=lat,
        lon=lon,
        is_rural=is_rural,
        weather_data=weather_data
    )
    
    # Log result for debugging
    print(f"📊 Analysis result for {station_data.get('station_name', 'Unknown')}: {result['cause']} ({result['status']})")
    
    return result