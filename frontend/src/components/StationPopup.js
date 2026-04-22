import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './StationPopup.css';

const API_BASE_URL = 'http://localhost:5000/api';

function StationPopup({ station, pollutantType, realtimeData, radiusKm }) {
  const [showForecast, setShowForecast] = useState(false);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [horizon, setHorizon] = useState(24);
  
  // Pollution cause analysis state
  const [causeAnalysis, setCauseAnalysis] = useState(null);
  const [causeLoading, setCauseLoading] = useState(false);
  const [causeError, setCauseError] = useState(null);

  const fetchForecast = React.useCallback(async () => {
    if (forecastData && forecastData.horizon_hours === horizon) {
      // Already have data for this horizon
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/forecast/${station.station_id}`,
        {
          params: {
            pollutant: pollutantType,
            horizon: horizon
          }
        }
      );

      setForecastData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Forecast error:', err);
      setError(err.response?.data?.message || 'Errore nel caricamento delle previsioni');
      setLoading(false);
    }
  }, [station.station_id, pollutantType, horizon, forecastData]);

  // Get display data based on available sources
  const getDisplayData = React.useCallback(() => {
    const stationId = station.station_id;
    
    if (realtimeData && realtimeData[stationId]) {
      return {
        value: realtimeData[stationId].value,
        unit: realtimeData[stationId].unit,
        date: realtimeData[stationId].timestamp,
        source: 'hourly',
        hasData: true
      };
    }
    
    if (station.value !== null && station.value !== undefined) {
      return {
        value: station.value,
        unit: station.unit,
        date: station.date,
        source: 'daily',
        hasData: true
      };
    }
    
    return {
      value: null,
      unit: 'μg/m³',
      date: null,
      source: 'none',
      hasData: false
    };
  }, [station, realtimeData]);

  // Fetch pollution cause analysis
  const fetchCauseAnalysis = React.useCallback(async () => {
    setCauseLoading(true);
    setCauseError(null);

    try {
      const [lng, lat] = station.coordinates || [0, 0];
      
      // Get current display data
      const currentDisplayData = getDisplayData();
      
      // Get both PM10 and PM2.5 values for analysis
      let pm10Value = null;
      let pm25Value = null;
      
      if (pollutantType === 'pm10') {
        pm10Value = currentDisplayData.value;
        // Try to get PM2.5 from realtime data if available
        if (realtimeData && realtimeData[station.station_id]) {
          // This would need PM2.5 data from another API call, for now use null
          pm25Value = null;
        }
      } else if (pollutantType === 'pm25') {
        pm25Value = currentDisplayData.value;
        // Try to get PM10 from realtime data if available
        pm10Value = null;
      }

      const params = {
        station_id: station.station_id,
        pollutant: pollutantType,
        lat: lat,
        lon: lng
      };
      
      // Add pollution values if available
      if (pm10Value !== null) params.pm10 = pm10Value;
      if (pm25Value !== null) params.pm25 = pm25Value;

      const response = await axios.get(`${API_BASE_URL}/pollution-analysis`, { params });
      setCauseAnalysis(response.data);
      setCauseLoading(false);
    } catch (err) {
      console.error('Cause analysis error:', err);
      setCauseError(err.response?.data?.message || 'Errore nel caricamento dell\'analisi delle cause');
      setCauseLoading(false);
    }
  }, [station, pollutantType, realtimeData, getDisplayData]);

  useEffect(() => {
    if (showForecast && !forecastData) {
      fetchForecast();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForecast]);

  useEffect(() => {
    if (showForecast && forecastData) {
      fetchForecast();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizon]);

  // Fetch cause analysis when component mounts or station changes
  useEffect(() => {
    const displayData = getDisplayData();
    if (displayData.hasData) {
      fetchCauseAnalysis();
    }
  }, [fetchCauseAnalysis, getDisplayData]);

  const prepareChartData = () => {
    if (!forecastData || !forecastData.forecast) {
      return [];
    }

    const chartData = [];

    // Add forecast data from ARPAE maps
    if (forecastData.forecast) {
      forecastData.forecast.forEach(point => {
        chartData.push({
          timestamp: new Date(point.timestamp).getTime(),
          forecast: point.value,
          type: 'forecast'
        });
      });
    }

    // Sort by timestamp
    chartData.sort((a, b) => a.timestamp - b.timestamp);

    return chartData;
  };

  const formatXAxis = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('it-IT', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit'
    });
  };

  // Get status color for cause analysis
  const getStatusColor = (status) => {
    const colors = {
      success: '#22c55e',
      moderate: '#3b82f6', 
      warning: '#f59e0b',
      critical: '#ef4444'
    };
    return colors[status] || colors.moderate;
  };

  // Get display data based on available sources (moved up for use in fetchCauseAnalysis)
  const displayData = getDisplayData();

  return (
    <div className="station-popup">
      {/* Current data section */}
      {displayData.hasData ? (
        <div className={`data-section ${displayData.source}`}>
          <div className="data-header">
            <h4>{displayData.source === 'hourly' ? 'Dato Orario' : 'Media Giornaliera'}</h4>
            <span className="data-value">{displayData.value} <small>{displayData.unit}</small></span>
          </div>
          <p className="data-timestamp">{new Date(displayData.date).toLocaleString('it-IT')}</p>
        </div>
      ) : (
        <div className="data-section no-data">
          <h4>Nessun Dato Disponibile</h4>
          <p>La stazione potrebbe essere offline o in manutenzione</p>
        </div>
      )}
      
      <p className="coverage-info">Raggio copertura: ~{radiusKm} km</p>
      
      {/* Pollution Cause Analysis Section */}
      {displayData.hasData && (
        <div className="cause-analysis-section">
          <h4>🔍 Analisi Cause</h4>
          
          {causeLoading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <span>Analisi in corso...</span>
            </div>
          )}
          
          {causeError && (
            <div className="cause-error">
              <p>⚠️ {causeError}</p>
              <button className="retry-btn" onClick={fetchCauseAnalysis}>Riprova</button>
            </div>
          )}
          
          {causeAnalysis && !causeLoading && (
            <div className="cause-result">
              <div className="cause-header" style={{ borderLeftColor: getStatusColor(causeAnalysis.status) }}>
                <span className="cause-icon">{causeAnalysis.icon}</span>
                <div className="cause-info">
                  <h5>{causeAnalysis.cause}</h5>
                  <span className={`cause-badge ${causeAnalysis.status}`}>
                    {causeAnalysis.status === 'success' && '✅ Pulita'}
                    {causeAnalysis.status === 'moderate' && '🟡 Moderato'}
                    {causeAnalysis.status === 'warning' && '⚠️ Attenzione'}
                    {causeAnalysis.status === 'critical' && '🚨 Critico'}
                  </span>
                </div>
              </div>
              
              <p className="cause-description">{causeAnalysis.desc}</p>
              
              {causeAnalysis.context && (
                <div className="cause-context">
                  {causeAnalysis.context.fires_count && (
                    <div className="context-item">
                      <span className="context-label">Incendi:</span>
                      <span>{causeAnalysis.context.fires_count} (a {causeAnalysis.context.closest_distance}km)</span>
                    </div>
                  )}
                  
                  {causeAnalysis.context.industry_name && (
                    <div className="context-item">
                      <span className="context-label">Industria:</span>
                      <span>{causeAnalysis.context.industry_name}</span>
                    </div>
                  )}
                  
                  {causeAnalysis.context.wind_speed && (
                    <div className="context-item">
                      <span className="context-label">Vento:</span>
                      <span>{causeAnalysis.context.wind_speed} m/s</span>
                    </div>
                  )}
                  
                  {causeAnalysis.context.pm_ratio && (
                    <div className="context-item">
                      <span className="context-label">PM2.5/PM10:</span>
                      <span>{causeAnalysis.context.pm_ratio}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Forecast toggle button */}
      <button 
        className="forecast-toggle"
        onClick={() => setShowForecast(!showForecast)}
      >
        {showForecast ? '📊 Nascondi Previsioni' : '🔮 Mostra Previsioni'}
      </button>
      
      {/* Forecast section */}
      {showForecast && (
        <div className="forecast-section">
          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <span>Caricamento...</span>
            </div>
          )}
          
          {error && (
            <div className="forecast-error">
              <p>⚠️ {error}</p>
            </div>
          )}
          
          {forecastData && forecastData.forecast && !loading && (
            <>
              <div className="horizon-selector">
                <button className={horizon === 24 ? 'active' : ''} onClick={() => setHorizon(24)}>24h</button>
                <button className={horizon === 48 ? 'active' : ''} onClick={() => setHorizon(48)}>48h</button>
                <button className={horizon === 72 ? 'active' : ''} onClick={() => setHorizon(72)}>72h</button>
              </div>
              
              <div className="forecast-chart">
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={prepareChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatXAxis}
                      tick={{ fontSize: 10 }}
                      stroke="#6b7280"
                    />
                    <YAxis 
                      label={{ value: 'μg/m³', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                      tick={{ fontSize: 10 }}
                      stroke="#6b7280"
                    />
                    <Tooltip 
                      labelFormatter={(timestamp) => new Date(timestamp).toLocaleString('it-IT')}
                      formatter={(value) => value ? value.toFixed(1) : 'N/A'}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      name="Previsione"
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              <div className="forecast-metadata">
                <small>Fonte: {forecastData.source} - {forecastData.model || 'CHIMERE'}</small>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}


export default StationPopup;
