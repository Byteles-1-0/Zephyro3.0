# Implementation Plan: Hybrid Data Architecture

## Overview

This implementation plan breaks down the hybrid data architecture feature into discrete coding tasks. The approach follows a sequential pattern: backend infrastructure first, then backend endpoints, followed by frontend integration, and finally testing and documentation.

The implementation prioritizes fast initial map rendering (Layer 2) while progressively enhancing with real-time data (Layer 3) through background loading.

## Tasks

- [x] 1. Set up backend caching infrastructure
  - Install Flask-Caching dependency in backend/requirements.txt
  - Configure Flask-Caching with SimpleCache in app.py
  - Set up cache instance with default 1-hour timeout
  - _Requirements: 8.1, 8.2_

- [ ]* 1.1 Write unit tests for cache configuration
  - Test cache initialization
  - Test cache key generation for different pollutants
  - _Requirements: 8.3, 8.4_

- [x] 2. Implement data transformation functions
  - [x] 2.1 Create `transform_to_geojson()` function
    - Accept ArcGIS JSON response and pollutant type as parameters
    - Extract features array from response
    - Map geometry.x/y to GeoJSON coordinates [lng, lat]
    - Convert epoch milliseconds timestamps to ISO 8601 format
    - Calculate color classification using `get_color()` helper
    - Build GeoJSON FeatureCollection with required properties
    - _Requirements: 1.3, 10.1, 10.2_
  
  - [x] 2.2 Create `transform_to_dictionary()` function
    - Accept ArcGIS JSON response as parameter
    - Extract features array from response
    - Build dictionary with station_id as keys
    - Store value, unit, and ISO 8601 timestamp for each station
    - Return dictionary for O(1) lookup performance
    - _Requirements: 2.1, 2.6, 10.3, 10.4_
  
  - [x] 2.3 Update `get_layer_url()` helper function
    - Add layer parameter (default=2) to function signature
    - Support Layer 3 by replacing `/MapServer/2/` with `/MapServer/3/`
    - Return appropriate URL for PM10 or PM2.5 based on pollutant type
    - _Requirements: 3.1_

- [ ]* 2.4 Write unit tests for transformation functions
  - Test `transform_to_geojson()` with mock ArcGIS JSON (3 features)
  - Assert valid GeoJSON FeatureCollection structure
  - Assert all required properties present (station_id, station_name, value, unit, pollutant, date, color)
  - Assert timestamps converted to ISO 8601
  - Test `transform_to_dictionary()` with mock ArcGIS JSON (2 features)
  - Assert dictionary has station_id keys
  - Assert all values have required fields (value, unit, timestamp)
  - Test `get_color()` classification for PM10 and PM2.5 thresholds
  - _Requirements: 1.3, 2.1, 10.2, 10.4_

- [x] 3. Implement `/api/map-base` endpoint
  - [x] 3.1 Create Flask route for `/api/map-base`
    - Accept pollutant query parameter (default: 'pm10')
    - Validate pollutant type (pm10 or pm25 only)
    - Apply @cache.cached decorator with 24-hour TTL and query_string=True
    - Construct Layer 2 URL using `get_layer_url(pollutant_type, layer=2)`
    - Build query parameters: where='1=1', outFields with required fields, f='json', outSR='4326'
    - Make GET request to ISPRA service with 30-second timeout
    - Parse JSON response
    - Call `transform_to_geojson()` to convert to GeoJSON
    - Return JSON response
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1, 8.3_
  
  - [x] 3.2 Add error handling for `/api/map-base`
    - Catch requests.exceptions.Timeout and return 504 error
    - Catch json.JSONDecodeError and return 500 error with message
    - Catch HTTPError and return 500 error with status code
    - Log errors using app.logger
    - _Requirements: 1.5, 7.3, 7.4_

- [ ]* 3.3 Write integration tests for `/api/map-base`
  - Test successful response returns valid GeoJSON
  - Test cache hit behavior (second request faster)
  - Test invalid pollutant type returns 400 error
  - Test ISPRA service timeout returns 504 error
  - _Requirements: 1.1, 1.4, 8.1_

- [x] 4. Implement `/api/realtime-details` endpoint
  - [x] 4.1 Create Flask route for `/api/realtime-details`
    - Accept pollutant query parameter (default: 'pm10')
    - Validate pollutant type (pm10 or pm25 only)
    - Apply @cache.cached decorator with 1-hour TTL and query_string=True
    - Construct Layer 3 URL using `get_layer_url(pollutant_type, layer=3)`
    - Build query parameters: where='station_id IS NOT NULL', outFields with required fields, f='json', outSR='4326'
    - Make GET request to ISPRA service with 30-second timeout
    - Parse JSON response
    - Call `transform_to_dictionary()` to convert to dictionary
    - Return JSON response
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 3.1, 3.2, 3.3, 3.4, 8.2, 8.4_
  
  - [x] 4.2 Add graceful error handling for `/api/realtime-details`
    - Catch any exception and return empty dictionary {} instead of error
    - Log warning using app.logger
    - Ensure Layer 3 failures don't break the application
    - _Requirements: 2.5, 7.2_

- [ ]* 4.3 Write integration tests for `/api/realtime-details`
  - Test successful response returns dictionary with station_id keys
  - Test cache hit behavior (second request faster)
  - Test Layer 3 unavailable returns empty dictionary (not error)
  - Test O(1) lookup performance with dictionary structure
  - _Requirements: 2.1, 2.4, 2.5, 2.6, 8.2_

- [ ] 5. Checkpoint - Ensure backend tests pass
  - Run all backend unit tests and integration tests
  - Verify both endpoints return correct data formats
  - Verify cache behavior with appropriate TTLs
  - Ask the user if questions arise

- [x] 6. Update frontend state management
  - [x] 6.1 Add new state variables to App component
    - Add `baseMapData` state variable (replaces `data`)
    - Add `realtimeData` state variable (initialized as empty object {})
    - Keep existing `pollutantType`, `loading`, `error`, `radiusKm` state
    - _Requirements: 4.1_
  
  - [x] 6.2 Implement sequential data loading in useEffect
    - Create async `loadData()` function inside useEffect
    - Step 1: Fetch Layer 2 from `/api/map-base?pollutant=${pollutantType}`
    - Set `baseMapData` state and set `loading` to false
    - Step 2: Fetch Layer 3 from `/api/realtime-details?pollutant=${pollutantType}` in try-catch
    - Set `realtimeData` state on success
    - On Layer 3 failure: log warning to console and set `realtimeData` to empty object
    - Ensure Layer 3 failure doesn't affect Layer 2 rendering
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.2_

- [ ]* 6.3 Write unit tests for sequential loading logic
  - Mock axios responses for both endpoints
  - Assert base map endpoint called first
  - Assert realtime endpoint called after base map resolves
  - Assert map renders after base map data received
  - Assert Layer 3 failure doesn't prevent Layer 2 rendering
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 7. Update map rendering to use baseMapData
  - Replace `data` references with `baseMapData` in MapContainer conditional
  - Update `data.features.map()` to `baseMapData.features.map()`
  - Ensure circles render immediately after Layer 2 loads
  - Keep existing circle rendering logic (color, radius, coordinates)
  - _Requirements: 4.2, 6.3, 6.4_

- [x] 8. Implement enhanced popup with data enrichment
  - [x] 8.1 Update Popup component structure
    - Add "Daily Average" section displaying Layer 2 data (props.value, props.date)
    - Add conditional "Latest Hourly" section for Layer 3 data
    - Check if `realtimeData[props.station_id]` exists (O(1) lookup)
    - Display Layer 3 value and timestamp if available
    - Format timestamps using `new Date().toLocaleString('it-IT')`
    - Keep existing coverage radius display
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 8.2 Add CSS styling for popup sections
    - Style "Daily Average" and "Latest Hourly" sections distinctly
    - Add visual separator between sections
    - Ensure readability on mobile devices
    - _Requirements: 5.1_

- [ ]* 8.3 Write unit tests for popup enrichment
  - Render popup with Layer 2 data only (realtimeData empty)
  - Assert daily average section displayed
  - Assert hourly section not displayed
  - Update realtimeData state with mock Layer 3 data
  - Assert hourly section now displayed with correct values
  - _Requirements: 5.2, 5.3, 5.4, 5.6_

- [x] 9. Implement frontend error handling
  - [x] 9.1 Add error handling for base map failures
    - Display error message when `/api/map-base` fails
    - Prevent map rendering on Layer 2 failure
    - Show retry button to reload data
    - _Requirements: 7.1_
  
  - [x] 9.2 Add graceful degradation for Layer 3 failures
    - Log console warning when `/api/realtime-details` fails
    - Continue with Layer 2 visualization only
    - Ensure popups display daily data without error messages
    - _Requirements: 7.2, 7.5_

- [ ]* 9.3 Write unit tests for error handling
  - Mock base map endpoint failure
  - Assert error message displayed
  - Assert map not rendered
  - Mock realtime endpoint failure
  - Assert no error message to user
  - Assert map still rendered with Layer 2 data
  - _Requirements: 7.1, 7.2, 7.5_

- [ ] 10. Checkpoint - Ensure frontend tests pass
  - Run all frontend unit tests
  - Verify sequential loading works correctly
  - Verify popup enrichment displays both data layers
  - Verify error handling for both endpoints
  - Ask the user if questions arise

- [x] 11. Maintain backward compatibility
  - [x] 11.1 Keep existing `/api/data/{pollutant_type}` endpoint
    - Create legacy endpoint that redirects to `get_map_base()`
    - Ensure existing features work: PM10/PM2.5 toggle, radius slider, color coding, legend
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 11.2 Add deprecation notice to legacy endpoint
    - Log deprecation warning when legacy endpoint is called
    - Add comment indicating endpoint will be removed in future version
    - _Requirements: 6.5_

- [ ]* 12. Write end-to-end integration tests
  - Test complete user flow: page load → map renders → click station → popup displays
  - Test pollutant switching (PM10 to PM2.5)
  - Test graceful degradation when Layer 3 unavailable
  - Test performance: initial map load < 3 seconds, popup enrichment < 500ms
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 7.5, 9.3, 9.4_

- [x] 13. Update documentation
  - [x] 13.1 Update README.md with new endpoints
    - Document `/api/map-base` endpoint with parameters and response format
    - Document `/api/realtime-details` endpoint with parameters and response format
    - Add example requests and responses
    - Document caching behavior and TTLs
    - _Requirements: 1.1, 2.1, 8.1, 8.2_
  
  - [x] 13.2 Add deployment notes
    - Document Flask-Caching dependency installation
    - Document environment variables for cache configuration
    - Add monitoring recommendations (cache hit rate, response times, error rates)
    - Note future upgrade path to Redis for multi-server deployments
    - _Requirements: 8.1, 8.2_

- [ ] 14. Final checkpoint - Complete integration verification
  - Run full test suite (backend + frontend)
  - Manually test complete user flow in browser
  - Verify performance targets met (< 3s initial load, < 1s Layer 3 load)
  - Verify cache behavior with both endpoints
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Backend tasks (1-5) should be completed before frontend tasks (6-10)
- Checkpoints ensure incremental validation at key milestones
- The implementation maintains backward compatibility with existing `/api/data` endpoint
- Layer 3 failures are non-critical and handled gracefully without user-facing errors
- All timestamps must be normalized to ISO 8601 format for consistency
- Cache keys include pollutant type and date/hour to ensure proper invalidation
