import React, { useMemo } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import './FireLayerRenderer.css';

// Custom flame-shaped marker icons for different intensities
const createFlameIcon = (intensity) => {
  const colors = {
    low: '#fbbf24',    // Yellow for low intensity
    medium: '#f97316', // Orange for medium intensity
    high: '#dc2626'    // Red for high intensity
  };

  const color = colors[intensity] || colors.medium;
  
  // Create flame-shaped SVG icon
  const flameSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path fill="${color}" stroke="#000" stroke-width="1" 
            d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.28 2.67-.2 3.73-.74 1.67-2.23 2.72-4.01 2.72z"/>
    </svg>
  `;

  return L.divIcon({
    html: flameSvg,
    className: `fire-marker fire-${intensity}`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
};

// Popup component for fire details (using data already loaded)
const FirePopup = ({ fire }) => {
  return (
    <div className="fire-popup">
      <div className="fire-popup-header">
        <h3>🔥 Incendio Attivo</h3>
        <span className={`intensity-badge intensity-${fire.intensity}`}>
          {fire.intensity === 'low' && 'Bassa Intensità'}
          {fire.intensity === 'medium' && 'Media Intensità'}
          {fire.intensity === 'high' && 'Alta Intensità'}
        </span>
      </div>
      
      <div className="fire-popup-content">
        <div className="fire-detail">
          <strong>📍 Località:</strong>
          <span>{fire.location}</span>
        </div>
        
        <div className="fire-detail">
          <strong>📊 Intensità:</strong>
          <span className={`intensity-text intensity-${fire.intensity}`}>
            {fire.intensity === 'low' && 'Bassa'}
            {fire.intensity === 'medium' && 'Media'}
            {fire.intensity === 'high' && 'Alta'}
          </span>
        </div>
        
        <div className="fire-detail">
          <strong>🕒 Rilevamento:</strong>
          <span>{new Date(fire.timestamp).toLocaleString('it-IT')}</span>
        </div>
        
        <div className="fire-detail">
          <strong>🌍 Coordinate:</strong>
          <span>{fire.latitude.toFixed(4)}, {fire.longitude.toFixed(4)}</span>
        </div>
      </div>
      
      <div className="fire-popup-footer">
        <small>Fonte: incendioggi.it</small>
      </div>
    </div>
  );
};

function FireLayerRenderer({ fires, enabled, onFireClick }) {
  const map = useMap();

  // Create custom pane for fire layer with proper z-index (synchronously)
  // Check if pane already exists or create it
  if (map && !map.getPane('firePane')) {
    const firePane = map.createPane('firePane');
    // Set z-index between overlays (400) and marker shadows (500)
    // This ensures fires render above base tiles but below station markers
    firePane.style.zIndex = 450;
    // Prevent fire markers from interfering with station marker clicks
    firePane.style.pointerEvents = 'auto';
  }

  // Memoize fire markers to prevent unnecessary re-renders
  const fireMarkers = useMemo(() => {
    if (!fires || fires.length === 0) {
      return [];
    }

    return fires.map((fire) => {
      const icon = createFlameIcon(fire.intensity);
      
      return (
        <Marker
          key={fire.id}
          position={[fire.latitude, fire.longitude]}
          icon={icon}
          pane="firePane"
          eventHandlers={{
            click: (e) => {
              // Stop event propagation to prevent interference with station markers
              e.originalEvent.stopPropagation();
              if (onFireClick) {
                onFireClick(fire);
              }
            }
          }}
        >
          <Popup>
            <FirePopup fire={fire} />
          </Popup>
        </Marker>
      );
    });
  }, [fires, onFireClick]);

  // Don't render anything if layer is disabled (should not happen due to conditional mounting)
  if (!enabled) {
    return null;
  }

  // If no fires available, return null
  if (!fires || fires.length === 0) {
    return null;
  }

  // Use clustering when more than 10 fires exist in total
  // Note: Clustering is currently disabled due to compatibility issues with react-leaflet-cluster
  // Individual markers are rendered instead for better reliability
  const shouldUseCluster = false; // fires.length > 10;

  // Render individual markers without clustering
  return <>{fireMarkers}</>;
}

export default FireLayerRenderer;