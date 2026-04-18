# Requirements Document: Hybrid Data Architecture

## Introduction

This feature upgrades the Air Quality monitoring application from a single-layer data architecture (Layer 2: daily averages) to a hybrid architecture that combines Layer 2 (daily consolidated data for ~430 stations) with Layer 3 (hourly real-time data for ~70 active stations). The hybrid approach optimizes initial map load performance while enriching station details with the latest hourly readings.

## Glossary

- **Backend_API**: The Flask server that proxies requests to ISPRA ArcGIS MapServer
- **Frontend_App**: The React application with Leaflet map visualization
- **Layer_2**: ISPRA ArcGIS MapServer Layer 2 containing daily average data for all stations (~430 stations)
- **Layer_3**: ISPRA ArcGIS MapServer Layer 3 containing hourly real-time data for active stations (~70 stations)
- **Base_Map_Endpoint**: The new `/api/map-base` endpoint that returns Layer 2 GeoJSON for initial map rendering
- **Realtime_Details_Endpoint**: The new `/api/realtime-details` endpoint that returns Layer 3 data as a dictionary keyed by station_id
- **Station_Popup**: The interactive popup displayed when a user clicks a station circle on the map
- **Data_Enrichment**: The process of merging Layer 3 hourly data into Layer 2 daily data for display
- **ISPRA_Service**: The external ISPRA ArcGIS MapServer providing air quality data
- **Cache_Manager**: The backend component responsible for caching data with appropriate TTL values

## Requirements

### Requirement 1: Base Map Data Endpoint

**User Story:** As a frontend developer, I want a dedicated endpoint for base map data, so that the initial map loads quickly with all station locations.

#### Acceptance Criteria

1. THE Base_Map_Endpoint SHALL return Layer 2 data in GeoJSON format
2. WHEN the Base_Map_Endpoint is called with a pollutant type parameter, THE Backend_API SHALL query Layer 2 from ISPRA_Service with `where=1=1`
3. THE Base_Map_Endpoint SHALL include fields: station_id, station_name, coordinates, data_record_value, data_record timestamp, and color classification
4. THE Base_Map_Endpoint SHALL cache responses for 24 hours since Layer 2 updates once daily
5. WHEN Layer 2 data is unavailable, THE Backend_API SHALL return an HTTP 500 error with a descriptive message

### Requirement 2: Real-Time Details Endpoint

**User Story:** As a frontend developer, I want a dedicated endpoint for hourly real-time data, so that I can enrich station popups with the latest readings.

#### Acceptance Criteria

1. THE Realtime_Details_Endpoint SHALL return Layer 3 data as a JSON dictionary keyed by station_id
2. WHEN the Realtime_Details_Endpoint is called with a pollutant type parameter, THE Backend_API SHALL query Layer 3 from ISPRA_Service with `where=station_id IS NOT NULL`
3. THE Realtime_Details_Endpoint SHALL include fields: station_id, data_record_value, data_record_end_time timestamp, and unit
4. THE Realtime_Details_Endpoint SHALL cache responses for 1 hour since Layer 3 updates hourly with 2-3 hour delay
5. WHEN Layer 3 data is unavailable, THE Backend_API SHALL return an empty dictionary instead of an error
6. FOR ALL station_id values in the response dictionary, lookup time SHALL be O(1) constant time

### Requirement 3: Layer 3 Query Configuration

**User Story:** As a backend developer, I want to query Layer 3 with the correct parameters, so that I retrieve only active stations with hourly data.

#### Acceptance Criteria

1. THE Backend_API SHALL construct Layer 3 URLs by replacing `/MapServer/2/` with `/MapServer/3/` in the base service URL
2. WHEN querying Layer 3, THE Backend_API SHALL use query parameter `where=station_id IS NOT NULL`
3. THE Backend_API SHALL request outFields containing at minimum: station_id, data_record_value, data_record_end_time, unit
4. THE Backend_API SHALL use outSR=4326 for WGS84 coordinate system consistency with Layer 2

### Requirement 4: Frontend Data Loading Strategy

**User Story:** As an end user, I want the map to load quickly with all stations visible, so that I can immediately see the air quality overview.

#### Acceptance Criteria

1. WHEN the Frontend_App initializes, THE Frontend_App SHALL fetch Layer 2 data from Base_Map_Endpoint first
2. WHEN Layer 2 data is received, THE Frontend_App SHALL render all station circles on the map immediately
3. WHEN Layer 2 rendering is complete, THE Frontend_App SHALL fetch Layer 3 data from Realtime_Details_Endpoint in the background
4. WHEN Layer 3 data is received, THE Frontend_App SHALL store it in application state for popup enrichment
5. IF Layer 3 fetch fails, THE Frontend_App SHALL continue operating with Layer 2 data only

### Requirement 5: Station Popup Data Enrichment

**User Story:** As an end user, I want to see both daily average and latest hourly reading in station popups, so that I understand both the daily trend and current conditions.

#### Acceptance Criteria

1. WHEN a user clicks a station circle, THE Frontend_App SHALL display a Station_Popup
2. THE Station_Popup SHALL always display Layer 2 daily average value with its timestamp labeled "Daily Average"
3. IF Layer 3 data exists for the station_id, THE Station_Popup SHALL additionally display the hourly value with its data_record_end_time timestamp labeled "Latest Hourly"
4. IF Layer 3 data does not exist for the station_id, THE Station_Popup SHALL display only the daily average without error messages
5. THE Station_Popup SHALL format timestamps in Italian locale (it-IT) with date and time
6. WHEN Layer 3 data is enriched into the popup, THE Frontend_App SHALL perform station_id lookup in O(1) constant time

### Requirement 6: Backward Compatibility

**User Story:** As a system maintainer, I want existing visualization features to continue working, so that the upgrade does not break current functionality.

#### Acceptance Criteria

1. THE Frontend_App SHALL continue to support PM10 and PM2.5 pollutant type switching
2. THE Frontend_App SHALL continue to render circles with configurable radius (5-25 km)
3. THE Frontend_App SHALL continue to apply color classification (green/yellow/red) based on Layer 2 daily average values
4. THE Frontend_App SHALL continue to display the legend with quality thresholds
5. THE Backend_API SHALL maintain the existing `/api/data/{pollutant_type}` endpoint for backward compatibility during migration

### Requirement 7: Error Handling and Resilience

**User Story:** As an end user, I want the application to handle data unavailability gracefully, so that I can still use the map even when some data sources fail.

#### Acceptance Criteria

1. WHEN Base_Map_Endpoint fails, THE Frontend_App SHALL display an error message and prevent map rendering
2. WHEN Realtime_Details_Endpoint fails, THE Frontend_App SHALL log a warning and continue with Layer 2 data only
3. WHEN ISPRA_Service returns malformed JSON, THE Backend_API SHALL return an HTTP 500 error with details
4. WHEN ISPRA_Service times out after 30 seconds, THE Backend_API SHALL return an HTTP 504 error
5. IF a station exists in Layer 2 but not in Layer 3, THE Station_Popup SHALL display daily data without indicating an error

### Requirement 8: Cache Management

**User Story:** As a system administrator, I want appropriate caching strategies for each data layer, so that the system balances freshness with performance.

#### Acceptance Criteria

1. THE Cache_Manager SHALL cache Base_Map_Endpoint responses with a 24-hour TTL
2. THE Cache_Manager SHALL cache Realtime_Details_Endpoint responses with a 1-hour TTL
3. THE Cache_Manager SHALL use cache keys that include pollutant type and date for Base_Map_Endpoint
4. THE Cache_Manager SHALL use cache keys that include pollutant type and hour for Realtime_Details_Endpoint
5. WHEN cache TTL expires, THE Backend_API SHALL fetch fresh data from ISPRA_Service on the next request

### Requirement 9: Performance Optimization

**User Story:** As an end user, I want the application to load quickly even with 430 stations, so that I can access air quality information without delays.

#### Acceptance Criteria

1. THE Base_Map_Endpoint SHALL return Layer 2 GeoJSON for 430 stations within 2 seconds under normal network conditions
2. THE Realtime_Details_Endpoint SHALL return Layer 3 dictionary for 70 stations within 1 second under normal network conditions
3. THE Frontend_App SHALL render the initial map with all circles within 3 seconds of page load
4. THE Frontend_App SHALL enrich popups with Layer 3 data within 500 milliseconds of user click
5. WHEN both endpoints are cached, THE Frontend_App SHALL complete full page load within 1 second

### Requirement 10: API Response Format Specification

**User Story:** As a frontend developer, I want clearly defined response formats, so that I can reliably parse and display the data.

#### Acceptance Criteria

1. THE Base_Map_Endpoint SHALL return GeoJSON with FeatureCollection type containing an array of Feature objects
2. WHEN returning Layer 2 data, THE Backend_API SHALL include properties: station_id, station_name, value, unit, pollutant, date, color
3. THE Realtime_Details_Endpoint SHALL return a JSON object where keys are station_id strings and values are objects
4. WHEN returning Layer 3 data, THE Backend_API SHALL include properties: value, unit, timestamp for each station_id key
5. THE Backend_API SHALL normalize all timestamps to ISO 8601 format strings before returning to Frontend_App

