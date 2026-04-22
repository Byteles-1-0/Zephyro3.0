import React, { useState, useEffect } from 'react';
import { ImageOverlay, useMap } from 'react-leaflet';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ForecastMapOverlay({ pollutant, enabled, currentHourIndex }) {
  const [forecastData, setForecastData] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setForecastData(null);
      return;
    }

    const fetchForecastMaps = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/forecast-maps`,
          { params: { pollutant } }
        );
        console.log('ForecastMapOverlay - Data received:', response.data);
        console.log('ForecastMapOverlay - Bounds:', response.data.bounds);
        console.log('ForecastMapOverlay - Maps count:', response.data.maps?.length);
        setForecastData(response.data);
      } catch (err) {
        console.error('Error fetching forecast maps:', err);
      }
    };

    fetchForecastMaps();
  }, [pollutant, enabled]);

  if (!enabled || !forecastData || !forecastData.maps) {
    return null;
  }

  // Get current map based on hour index
  const currentMap = forecastData.maps[currentHourIndex] || forecastData.maps[0];

  if (!currentMap) {
    console.log('ForecastMapOverlay - No current map available');
    return null;
  }

  console.log('ForecastMapOverlay - Rendering map:', {
    index: currentHourIndex,
    timestamp: currentMap.timestamp,
    image_url: currentMap.image_url,
    bounds: forecastData.bounds
  });

  return (
    <ImageOverlay
      url={currentMap.image_url}
      bounds={forecastData.bounds}
      opacity={0.6}
      zIndex={1000}
    />
  );
}

export default ForecastMapOverlay;
