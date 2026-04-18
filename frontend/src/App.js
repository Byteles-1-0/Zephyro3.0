import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api';

// Raggio di copertura stimato per le stazioni di monitoraggio
// Basato su studi di rappresentatività spaziale delle stazioni urbane/suburbane
const DEFAULT_RADIUS_KM = 10;

function App() {
  const [pollutantType, setPollutantType] = useState('pm10');
  const [dataSource, setDataSource] = useState('daily'); // 'daily' or 'hourly'
  const [baseMapData, setBaseMapData] = useState(null);
  const [realtimeData, setRealtimeData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);

  useEffect(() => {
    fetchData();
  }, [pollutantType, dataSource]);

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

  const getMarkerColor = (color) => {
    const colors = {
      green: '#22c55e',
      yellow: '#eab308',
      red: '#ef4444',
      gray: '#6b7280'
    };
    return colors[color] || colors.gray;
  };

  // Get display data based on selected source
  const getDisplayData = (feature) => {
    const props = feature.properties;
    const stationId = props.station_id;
    
    // If hourly is selected and data is available, use it
    if (dataSource === 'hourly' && realtimeData[stationId]) {
      return {
        value: realtimeData[stationId].value,
        unit: realtimeData[stationId].unit,
        date: realtimeData[stationId].timestamp,
        source: 'hourly'
      };
    }
    
    // Otherwise use daily data
    return {
      value: props.value,
      unit: props.unit,
      date: props.date,
      source: 'daily'
    };
  };

  return (
    <div className="App">
      <header className="header">
        <h1>🌍 Qualità dell'Aria - Italia</h1>
        <div className="controls">
          <div className="control-group">
            <label className="control-label">Inquinante:</label>
            <button 
              className={pollutantType === 'pm10' ? 'active' : ''}
              onClick={() => setPollutantType('pm10')}
            >
              PM10
            </button>
            <button 
              className={pollutantType === 'pm25' ? 'active' : ''}
              onClick={() => setPollutantType('pm25')}
            >
              PM2.5
            </button>
          </div>
          
          <div className="control-group">
            <label className="control-label">Tipo Dati:</label>
            <button 
              className={dataSource === 'daily' ? 'active' : ''}
              onClick={() => setDataSource('daily')}
            >
              📅 Giornalieri
            </button>
            <button 
              className={dataSource === 'hourly' ? 'active' : ''}
              onClick={() => setDataSource('hourly')}
              title="Disponibile solo per ~70 stazioni attive"
            >
              🕐 Orari
            </button>
          </div>
          
          <div className="radius-control">
            <label>Raggio: {radiusKm} km</label>
            <input 
              type="range" 
              min="5" 
              max="25" 
              step="5" 
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
            />
          </div>
          
          <button onClick={fetchData} className="refresh">
            🔄 Aggiorna
          </button>
        </div>
      </header>

      {loading && <div className="loading">Caricamento dati...</div>}
      {error && (
        <div className="error">
          {error}
          <button onClick={fetchData} style={{marginLeft: '1rem', padding: '0.25rem 0.5rem'}}>
            Riprova
          </button>
        </div>
      )}
      
      {dataSource === 'hourly' && baseMapData && Object.keys(realtimeData).length === 0 && !loading && (
        <div className="info-message">
          ℹ️ Dati orari non disponibili. Passa alla visualizzazione giornaliera per vedere tutte le stazioni.
        </div>
      )}

      {baseMapData && (
        <MapContainer 
          center={[42.5, 12.5]} 
          zoom={6} 
          style={{ height: 'calc(100vh - 80px)', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {baseMapData.features.map((feature, idx) => {
            const [lng, lat] = feature.geometry.coordinates;
            const props = feature.properties;
            const radiusMeters = radiusKm * 1000;
            const displayData = getDisplayData(feature);
            
            // Skip stations without hourly data when hourly view is selected
            if (dataSource === 'hourly' && displayData.source === 'daily') {
              return null;
            }
            
            return (
              <Circle
                key={idx}
                center={[lat, lng]}
                radius={radiusMeters}
                fillColor={getMarkerColor(props.color)}
                color={getMarkerColor(props.color)}
                weight={2}
                opacity={0.8}
                fillOpacity={0.4}
              >
                <Popup>
                  <div className="popup-content">
                    <h3>{props.station_name}</h3>
                    
                    {/* Display selected data source */}
                    <div className={`data-section ${displayData.source}`}>
                      <h4>{displayData.source === 'hourly' ? 'Dato Orario' : 'Media Giornaliera'}</h4>
                      <p><strong>{props.pollutant}:</strong> {displayData.value} {displayData.unit}</p>
                      <p><small>{new Date(displayData.date).toLocaleString('it-IT')}</small></p>
                    </div>
                    
                    {/* Show both if daily is selected and hourly is available */}
                    {dataSource === 'daily' && realtimeData[props.station_id] && (
                      <div className="data-section realtime">
                        <h4>Ultimo Rilevamento Orario</h4>
                        <p><strong>{props.pollutant}:</strong> {realtimeData[props.station_id].value} {realtimeData[props.station_id].unit}</p>
                        <p><small>{new Date(realtimeData[props.station_id].timestamp).toLocaleString('it-IT')}</small></p>
                      </div>
                    )}
                    
                    <p className="coverage-info"><strong>Raggio copertura:</strong> ~{radiusKm} km</p>
                  </div>
                </Popup>
              </Circle>
            );
          })}
        </MapContainer>
      )}

      <div className="legend">
        <h4>Qualità dell'Aria</h4>
        <div className="legend-item">
          <span className="legend-color" style={{backgroundColor: '#22c55e'}}></span>
          <span>Buona</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{backgroundColor: '#eab308'}}></span>
          <span>Moderata</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{backgroundColor: '#ef4444'}}></span>
          <span>Scarsa</span>
        </div>
        <div className="legend-info">
          <strong>Visualizzazione:</strong> {dataSource === 'daily' ? 'Dati Giornalieri (~430 stazioni)' : 'Dati Orari (~70 stazioni attive)'}
        </div>
        <div className="legend-info">
          <strong>Nota:</strong> I cerchi rappresentano l'area di copertura stimata di ciascuna stazione.
        </div>
      </div>
    </div>
  );
}

export default App;
