import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import tool_find_station_by_name

print("Testing tool_find_station_by_name('Civita Castellana')...")
result = tool_find_station_by_name('Civita Castellana')
print("Result:")
print(result)
