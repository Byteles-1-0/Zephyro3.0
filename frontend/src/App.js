import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './App.css';
import ForecastMapOverlay from './components/ForecastMapOverlay';
import ForecastTimeline from './components/ForecastTimeline';
import SearchBar from './components/SearchBar';
import SideDrawer from './components/SideDrawer';
import FABGroup from './components/FABGroup';
import ViewModeToggle from './components/ViewModeToggle';
import Legend from './components/Legend';
import FireLayerRenderer from './components/FireLayerRenderer';
import IndustryLayerRenderer from './components/IndustryLayerRenderer';
import useMapBounds from './hooks/useMapBounds';
import useDebouncedCallback from './hooks/useDebouncedCallback';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  // Existing state
  const [pollutantType, setPollutantType] = useState('pm10');
  const [dataSource, setDataSource] = useState('daily'); // 'daily' or 'hourly'
  const [baseMapData, setBaseMapData] = useState(null);
  const [realtimeData, setRealtimeData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const radiusKm = 10; // Fixed radius at 10km
  
  // View mode: 'realtime' or 'forecast'
  const [viewMode, setViewMode] = useState('realtime');
  
  // Forecast state
  const [forecastHourIndex, setForecastHourIndex] = useState(0);
  const [forecastMaps, setForecastMaps] = useState([]);
  
  // NEW: SideDrawer state (replaces sidebar)
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  
  // NEW: Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStations, setFilteredStations] = useState([]);
  
  // Map ref for FAB controls
  const mapRef = useRef(null);

  // Create debounced callback for layer data fetching
  // Requirements: 5.4, 6.3, 7.1
  const debouncedFetchLayerData = useDebouncedCallback(
    (bbox) => {
      fetchLayerData(bbox);
    },
    500,
    []
  );

  // Map bounds tracker component
  // Requirements: 5.4, 6.3, 7.1
  const MapBoundsTracker = () => {
    const bbox = useMapBounds();
    
    useEffect(() => {
      if (bbox) {
        try {
          // Validate BBOX before using it
          const { ne_lat, ne_lon, sw_lat, sw_lon } = bbox;
          if (typeof ne_lat === 'number' && typeof ne_lon === 'number' &&
              typeof sw_lat === 'number' && typeof sw_lon === 'number' &&
              !isNaN(ne_lat) && !isNaN(ne_lon) && !isNaN(sw_lat) && !isNaN(sw_lon)) {
            debouncedFetchLayerData(bbox);
          } else {
            console.warn('Invalid BBOX extracted from map bounds, using unfiltered request');
            debouncedFetchLayerData(null);
          }
        } catch (error) {
          // Requirements: 13.2 - Handle BBOX extraction failures
          console.warn('Error processing map bounds, using unfiltered request:', error);
          debouncedFetchLayerData(null);
        }
      }
    }, [bbox]);
    
    return null; // This is a utility component
  };

  // Layer toggle state with persistence
  const [fireLayerEnabled, setFireLayerEnabled] = useState(() => {
    // Load from localStorage on initialization
    const saved = localStorage.getItem('fireLayerEnabled');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [industryLayerEnabled, setIndustryLayerEnabled] = useState(() => {
    // Load from localStorage on initialization
    const saved = localStorage.getItem('industryLayerEnabled');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [layerData, setLayerData] = useState({ fires: [], industries: [] });
  const [layerDataStatus, setLayerDataStatus] = useState({
    fires: 'loading',
    industries: 'loading'
  });
  
  // NEW: Pollution source tracking for smart icon states
  // Requirements: 10.1, 10.2, 10.3, 10.4
  const [pollutionSources, setPollutionSources] = useState([]);

  // Detect backdrop-filter support
  useEffect(() => {
    if (typeof CSS !== 'undefined' && CSS.supports) {
      const supportsBackdropFilter = CSS.supports('backdrop-filter', 'blur(10px)') || 
                                      CSS.supports('-webkit-backdrop-filter', 'blur(10px)');
      if (!supportsBackdropFilter) {
        document.body.classList.add('no-backdrop-filter');
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollutantType, dataSource]);

  // Fetch layer data on component mount and set up refresh interval
  useEffect(() => {
    fetchLayerData();
    
    // Set up automatic refresh every 30 minutes (1800 seconds)
    // This matches the backend cache timeout to ensure fresh data
    const refreshInterval = setInterval(() => {
      fetchLayerData();
    }, 30 * 60 * 1000); // 30 minutes in milliseconds
    
    return () => clearInterval(refreshInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Layer visibility persistence: maintain layer states across pollutant type changes
  // Layer states are intentionally independent of pollutant type to preserve user preferences
  // This ensures that when users switch between PM10 and PM2.5, their layer preferences are maintained

  // Fetch forecast maps when pollutant changes or view mode is forecast
  useEffect(() => {
    if (viewMode === 'forecast') {
      fetchForecastMaps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollutantType, viewMode]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Always fetch Layer 2 (base map data)
      const baseResponse = await axios.get(`${API_BASE_URL}/map-base?pollutant=${pollutantType}`);
      setBaseMapData(baseResponse.data);
      
      // Fetch Layer 3 (realtime details) - non-blocking
      try {
        const realtimeResponse = await axios.get(`${API_BASE_URL}/realtime-details?pollutant=${pollutantType}`);
        setRealtimeData(realtimeResponse.data);
      } catch (realtimeError) {
        console.warn('Layer 3 data unavailable, continuing with Layer 2 only');
        setRealtimeData({});
      }
      
      setLoading(false);
      
    } catch (err) {
      setError('Errore nel caricamento dei dati. Verifica che il backend sia attivo.');
      setLoading(false);
      console.error(err);
    }
  };

  const fetchForecastMaps = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/forecast-maps`,
        { params: { pollutant: pollutantType } }
      );
      setForecastMaps(response.data.maps || []);
      setForecastHourIndex(0); // Reset to first hour
    } catch (err) {
      console.error('Error fetching forecast maps:', err);
      setForecastMaps([]);
    }
  };

  const fetchLayerData = async (bbox = null, retryCount = 0) => {
    try {
      setLayerDataStatus({
        fires: 'loading',
        industries: 'loading'
      });

      // Build query parameters
      let url = `${API_BASE_URL}/map-layers`;
      const params = new URLSearchParams();
      
      // Include BBOX parameters if provided
      // Requirements: 7.1, 7.2, 7.3
      if (bbox && bbox.ne_lat !== undefined && bbox.ne_lon !== undefined && 
          bbox.sw_lat !== undefined && bbox.sw_lon !== undefined) {
        try {
          // Validate BBOX parameters before sending
          const { ne_lat, ne_lon, sw_lat, sw_lon } = bbox;
          if (typeof ne_lat === 'number' && typeof ne_lon === 'number' &&
              typeof sw_lat === 'number' && typeof sw_lon === 'number' &&
              !isNaN(ne_lat) && !isNaN(ne_lon) && !isNaN(sw_lat) && !isNaN(sw_lon)) {
            params.append('ne_lat', ne_lat.toString());
            params.append('ne_lon', ne_lon.toString());
            params.append('sw_lat', sw_lat.toString());
            params.append('sw_lon', sw_lon.toString());
          } else {
            console.warn('Invalid BBOX parameters, skipping BBOX filtering:', bbox);
          }
        } catch (bboxError) {
          // Requirements: 13.2 - Handle BBOX extraction failures
          console.warn('Error processing BBOX parameters, skipping BBOX filtering:', bboxError);
        }
      }
      
      // Add query string if we have parameters
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await axios.get(url);
      const { fires = [], top_industries = [], data_status = {} } = response.data;
      
      // Only update state if data has actually changed to prevent unnecessary re-renders
      setLayerData(prevData => {
        const firesChanged = JSON.stringify(prevData.fires) !== JSON.stringify(fires);
        const industriesChanged = JSON.stringify(prevData.industries) !== JSON.stringify(top_industries);
        
        if (firesChanged || industriesChanged) {
          return {
            fires,
            industries: top_industries
          };
        }
        return prevData;
      });

      // Use backend data_status if available, otherwise determine from data presence
      setLayerDataStatus({
        fires: data_status.fires || (fires.length > 0 ? 'available' : 'unavailable'),
        industries: data_status.industries || (top_industries.length > 0 ? 'available' : 'unavailable')
      });
    } catch (err) {
      console.error('Error fetching layer data:', err);
      
      // Requirements: 13.3 - Retry failed BBOX requests without BBOX
      if (bbox && retryCount === 0) {
        console.log('Retrying request without BBOX parameters');
        setTimeout(() => {
          fetchLayerData(null, retryCount + 1);
        }, 1000);
        return;
      }
      
      // Implement exponential backoff retry for transient failures
      if (retryCount < 3) {
        const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Retrying layer data fetch in ${retryDelay}ms (attempt ${retryCount + 1}/3)`);
        setTimeout(() => {
          fetchLayerData(bbox, retryCount + 1);
        }, retryDelay);
        return;
      }
      
      // Requirements: 13.4 - Display error messages only after all retries fail
      // After all retries failed, set unavailable status
      setLayerDataStatus({
        fires: 'unavailable',
        industries: 'unavailable'
      });
      setLayerData({ fires: [], industries: [] });
    }
  };

  const getMarkerColor = (color) => {
    const colors = {
      green: '#22c55e',
      yellow: '#eab308',
      red: '#ef4444',
      gray: '#6b7280'
    };
    return colors[color] || colors.gray;
  };

  // Debounced search handler with filtering logic
  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
    
    if (!query.trim() || !baseMapData) {
      setFilteredStations([]);
      return;
    }
    
    const filtered = baseMapData.features
      .filter(feature => {
        const stationName = feature.properties.station_name?.toLowerCase() || '';
        const searchTerm = query.toLowerCase();
        return stationName.includes(searchTerm);
      })
      .map(feature => feature.properties.station_id);
    
    setFilteredStations(filtered);
  }, [baseMapData]);

  // Check if station should be visible based on search filter
  const isStationVisible = (stationId) => {
    if (searchQuery === '' || filteredStations.length === 0) {
      return true;
    }
    return filteredStations.includes(stationId);
  };

  // FAB handlers
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleRecenter = () => {
    if (mapRef.current) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            mapRef.current.flyTo([latitude, longitude], 10);
          },
          (error) => {
            console.warn('Geolocation error:', error);
            // Fallback to Italy center
            mapRef.current.flyTo([42.5, 12.5], 6);
          }
        );
      } else {
        // Fallback to Italy center
        mapRef.current.flyTo([42.5, 12.5], 6);
      }
    }
  };

  // Layer toggle handlers with persistence
  const handleFireToggle = (enabled) => {
    setFireLayerEnabled(enabled);
    // Persist to localStorage
    localStorage.setItem('fireLayerEnabled', JSON.stringify(enabled));
  };

  const handleIndustryToggle = (enabled) => {
    setIndustryLayerEnabled(enabled);
    // Persist to localStorage
    localStorage.setItem('industryLayerEnabled', JSON.stringify(enabled));
  };

  return (
    <div className="App">
      {/* Loading & Error Messages */}
      {loading && <div className="loading">Caricamento dati...</div>}
      {error && (
        <div className="error">
          {error}
          <button onClick={fetchData} style={{marginLeft: '1rem', padding: '0.25rem 0.5rem'}}>
            Riprova
          </button>
        </div>
      )}
      
      {dataSource === 'hourly' && baseMapData && Object.keys(realtimeData).length === 0 && !loading && viewMode === 'realtime' && (
        <div className="info-message">
          ℹ️ Dati orari non disponibili. Passa alla visualizzazione giornaliera per vedere tutte le stazioni.
        </div>
      )}

      {/* Full-Screen Map Container */}
      {viewMode === 'realtime' && baseMapData && (
        <MapContainer 
          ref={mapRef}
          center={[42.5, 12.5]} 
          zoom={6} 
          style={{ height: '100vh', width: '100vw' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Map bounds tracker for BBOX API calls */}
          <MapBoundsTracker />
          
          {baseMapData.features.map((feature, idx) => {
            const [lng, lat] = feature.geometry.coordinates;
            const props = feature.properties;
            const radiusMeters = radiusKm * 1000;
            
            // Determine if station has data
            const hasRealtimeData = realtimeData[props.station_id];
            const hasBaseData = props.value !== null && props.value !== undefined;
            
            // Determine color: gray if no data, otherwise use the color from API
            let displayColor = props.color;
            if (dataSource === 'hourly' && !hasRealtimeData) {
              displayColor = 'gray';
            } else if (dataSource === 'daily' && !hasBaseData) {
              displayColor = 'gray';
            }
            
            // Check if station should be visible based on search
            const visible = isStationVisible(props.station_id);
            if (!visible) return null;
            
            return (
              <Circle
                key={idx}
                center={[lat, lng]}
                radius={radiusMeters}
                fillColor={getMarkerColor(displayColor)}
                color={getMarkerColor(displayColor)}
                weight={2}
                opacity={displayColor === 'gray' ? 0.5 : 0.8}
                fillOpacity={displayColor === 'gray' ? 0.2 : 0.4}
                eventHandlers={{
                  click: async () => {
                    // Include coordinates in the station data
                    const stationWithCoords = {
                      ...props,
                      coordinates: [lng, lat]
                    };
                    setSelectedStation(stationWithCoords);
                    setSideDrawerOpen(true);
                    
                    // Fetch pollution analysis to identify pollution sources
                    // Requirements: 10.1, 10.2
                    try {
                      const displayData = hasRealtimeData ? realtimeData[props.station_id] : props;
                      const pm10Value = displayData?.value;
                      const pm25Value = null; // Could be fetched if available
                      
                      if (pm10Value !== null && pm10Value !== undefined) {
                        const params = new URLSearchParams({
                          station_id: props.station_id,
                          pollutant: pollutantType,
                          lat: lat.toString(),
                          lon: lng.toString()
                        });
                        
                        if (pm10Value !== null) params.append('pm10', pm10Value.toString());
                        if (pm25Value !== null) params.append('pm25', pm25Value.toString());
                        
                        const response = await axios.get(`${API_BASE_URL}/pollution-analysis?${params.toString()}`);
                        const analysis = response.data;
                        
                        // Extract industry ID from pollution analysis context
                        // Requirements: 10.2, 10.3
                        if (analysis.cause === 'Emissioni Industriali' && analysis.context?.industry_name) {
                          // Find the industry by name in the current layer data
                          const matchingIndustry = layerData.industries.find(
                            ind => ind.name === analysis.context.industry_name
                          );
                          
                          if (matchingIndustry) {
                            setPollutionSources([matchingIndustry.id]);
                          } else {
                            setPollutionSources([]);
                          }
                        } else {
                          // No industrial pollution detected, clear pollution sources
                          // Requirements: 10.3
                          setPollutionSources([]);
                        }
                      }
                    } catch (error) {
                      console.error('Error fetching pollution analysis:', error);
                      // On error, clear pollution sources
                      setPollutionSources([]);
                    }
                  }
                }}
              />
            );
          })}
          
          {/* Contextual Layers - Only visible in realtime mode */}
          {viewMode === 'realtime' && (
            <>
              {/* Fire Layer Renderer - Only mount when enabled */}
              {fireLayerEnabled && (
                <FireLayerRenderer
                  fires={layerData.fires}
                  enabled={fireLayerEnabled}
                  onFireClick={(fire) => {
                    console.log('Fire clicked:', fire);
                    // TODO: Could show fire details in sidebar or popup
                  }}
                />
              )}
              
              {/* Industry Layer Renderer - Only mount when enabled */}
              {industryLayerEnabled && (
                <IndustryLayerRenderer
                  industries={layerData.industries}
                  enabled={industryLayerEnabled}
                  pollutionSources={pollutionSources}
                  onIndustryClick={(industry) => {
                    console.log('Industry clicked:', industry);
                    // TODO: Could show industry details in sidebar or popup
                  }}
                />
              )}
            </>
          )}
        </MapContainer>
      )}

      {/* Forecast View */}
      {viewMode === 'forecast' && (
        <MapContainer 
          ref={mapRef}
          center={[42.5, 12.5]} 
          zoom={6} 
          style={{ height: '100vh', width: '100vw' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Map bounds tracker for BBOX API calls */}
          <MapBoundsTracker />
          
          {/* Forecast map overlay */}
          <ForecastMapOverlay
            pollutant={pollutantType}
            enabled={true}
            currentHourIndex={forecastHourIndex}
          />
        </MapContainer>
      )}

      {/* Forecast Timeline (only visible in forecast mode) */}
      {viewMode === 'forecast' && forecastMaps.length > 0 && (
        <ForecastTimeline
          maps={forecastMaps}
          currentIndex={forecastHourIndex}
          onIndexChange={setForecastHourIndex}
          enabled={true}
          onToggle={() => {}}
          pollutant={pollutantType}
        />
      )}

      {/* TODO: Floating UI Components will be added here as siblings of MapContainer */}
      {/* SearchBar (top-left) */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        pollutantType={pollutantType}
        onPollutantChange={setPollutantType}
        dataSource={dataSource}
        onDataSourceChange={setDataSource}
        viewMode={viewMode}
      />
      
      {/* ViewModeToggle (top-right) */}
      <ViewModeToggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      {/* FABGroup (bottom-right) */}
      <FABGroup
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRecenter={handleRecenter}
        fireLayerEnabled={fireLayerEnabled}
        industryLayerEnabled={industryLayerEnabled}
        onFireToggle={handleFireToggle}
        onIndustryToggle={handleIndustryToggle}
        layerDataStatus={layerDataStatus}
      />
      
      {/* Legend (bottom-left) */}
      <Legend viewMode={viewMode} />
      
      {/* SideDrawer (right edge) */}
      <SideDrawer
        isOpen={sideDrawerOpen}
        onClose={() => {
          setSideDrawerOpen(false);
          // Clear pollution sources when station is deselected
          // Requirements: 10.4
          setPollutionSources([]);
        }}
        station={selectedStation}
        pollutantType={pollutantType}
        realtimeData={realtimeData}
        radiusKm={radiusKm}
      />
    </div>
  );
}

export default App;
