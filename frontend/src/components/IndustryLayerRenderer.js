import React, { useMemo, useCallback } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import './IndustryLayerRenderer.css';

// Popup component for industry details (using data already loaded)
const IndustryPopup = ({ industry }) => {
  return (
    <div className="industry-popup">
      <div className="industry-popup-header">
        <h3>🏭 Impianto Industriale</h3>
        <span className={`sector-badge sector-${industry.sector.toLowerCase()}`}>
          {getSectorDisplayName(industry.sector)}
        </span>
      </div>
      
      <div className="industry-popup-content">
        <div className="industry-detail">
          <strong>🏢 Nome:</strong>
          <span>{industry.name}</span>
        </div>
        
        <div className="industry-detail">
          <strong>🏭 Settore:</strong>
          <span className={`sector-text sector-${industry.sector.toLowerCase()}`}>
            {getSectorDisplayName(industry.sector)}
          </span>
        </div>
        
        <div className="industry-detail">
          <strong>☣️ Inquinanti:</strong>
          <span>{industry.pollutant_count} tipi diversi</span>
        </div>
        
        <div className="industry-detail">
          <strong>🌍 Coordinate:</strong>
          <span>{industry.latitude.toFixed(4)}, {industry.longitude.toFixed(4)}</span>
        </div>
        
        {industry.population_proximity && (
          <div className="industry-detail">
            <strong>🏙️ Distanza città:</strong>
            <span>{industry.population_proximity} km</span>
          </div>
        )}
      </div>
      
      {industry.pollutants && industry.pollutants.length > 0 && (
        <div className="industry-pollutants">
          <strong>Principali inquinanti:</strong>
          <div className="pollutants-list">
            {industry.pollutants.slice(0, 6).map((pollutant, index) => (
              <span key={index} className="pollutant-tag">
                {pollutant}
              </span>
            ))}
            {industry.pollutants.length > 6 && (
              <span className="pollutant-tag more">
                +{industry.pollutants.length - 6} altri
              </span>
            )}
          </div>
        </div>
      )}
      
      <div className="industry-popup-footer">
        <small>Fonte: E-PRTR Database</small>
      </div>
    </div>
  );
};

// Custom factory-shaped marker icons for different sectors
// Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4
const createFactoryIcon = (sector, isActive = false) => {
  const colors = {
    ENERGY: '#dc2626',        // Red for energy sector
    MANUFACTURING: '#2563eb', // Blue for manufacturing
    CHEMICAL: '#7c3aed',      // Purple for chemical
    MINING: '#ea580c',        // Orange for mining
    OTHER: '#6b7280'          // Gray for other sectors
  };

  const color = colors[sector] || colors.OTHER;
  
  // Create factory-shaped SVG icon
  const factorySvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
      <g fill="${color}" stroke="#000" stroke-width="1">
        <!-- Main factory building -->
        <rect x="2" y="12" width="20" height="10" rx="1"/>
        <!-- Chimney 1 -->
        <rect x="5" y="6" width="2" height="6"/>
        <!-- Chimney 2 -->
        <rect x="9" y="4" width="2" height="8"/>
        <!-- Chimney 3 -->
        <rect x="13" y="7" width="2" height="5"/>
        <!-- Smoke from chimneys -->
        <circle cx="6" cy="4" r="1" fill="#9ca3af" opacity="0.7"/>
        <circle cx="10" cy="2" r="1" fill="#9ca3af" opacity="0.7"/>
        <circle cx="14" cy="5" r="1" fill="#9ca3af" opacity="0.7"/>
        <!-- Factory windows -->
        <rect x="4" y="15" width="2" height="2" fill="#fff"/>
        <rect x="7" y="15" width="2" height="2" fill="#fff"/>
        <rect x="10" y="15" width="2" height="2" fill="#fff"/>
        <rect x="13" y="15" width="2" height="2" fill="#fff"/>
        <rect x="16" y="15" width="2" height="2" fill="#fff"/>
        <rect x="19" y="15" width="2" height="2" fill="#fff"/>
        <!-- Factory door -->
        <rect x="11" y="18" width="2" height="4" fill="#374151"/>
      </g>
    </svg>
  `;

  // Determine icon state styling
  // Active state: 100% opacity, red border, pulse animation
  // Neutral state: 50% opacity, no border, no animation
  const className = isActive 
    ? 'industry-marker industry-active'
    : 'industry-marker industry-neutral';
  
  const style = isActive
    ? 'opacity: 1; border: 3px solid #dc2626; border-radius: 4px; animation: pulse 2s infinite;'
    : 'opacity: 0.5;';

  return L.divIcon({
    html: `<div style="${style}">${factorySvg}</div>`,
    className: className,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};

function IndustryLayerRenderer({ industries, enabled, pollutionSources = [], onIndustryClick }) {
  const map = useMap();

  // Function to determine if industry is a pollution source
  // Requirements: 10.1, 10.2, 10.3, 10.4
  const isPollutionSource = useCallback((industryId) => {
    return pollutionSources.includes(industryId);
  }, [pollutionSources]);

  // Create custom pane for industry layer with proper z-index (synchronously)
  // Check if pane already exists or create it
  if (map && !map.getPane('industryPane')) {
    const industryPane = map.createPane('industryPane');
    // Set z-index between overlays (400) and marker shadows (500)
    // This ensures industries render above base tiles but below station markers
    industryPane.style.zIndex = 460;
    // Prevent industry markers from interfering with station marker clicks
    industryPane.style.pointerEvents = 'auto';
  }

  // Memoize industry markers to prevent unnecessary re-renders
  // Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4
  const industryMarkers = useMemo(() => {
    if (!industries || industries.length === 0) {
      return [];
    }

    // Ensure exactly 5 facilities are rendered as per requirements
    const facilitiesToRender = industries.slice(0, 5);

    return facilitiesToRender.map((industry) => {
      // Determine if this industry is a pollution source
      const isActive = isPollutionSource(industry.id);
      
      // Create icon with appropriate state (active or neutral)
      const icon = createFactoryIcon(industry.sector, isActive);
      
      return (
        <Marker
          key={industry.id}
          position={[industry.latitude, industry.longitude]}
          icon={icon}
          pane="industryPane"
          eventHandlers={{
            click: (e) => {
              // Stop event propagation to prevent interference with station markers
              e.originalEvent.stopPropagation();
              if (onIndustryClick) {
                onIndustryClick(industry);
              }
            }
          }}
        >
          <Popup>
            <IndustryPopup industry={industry} />
          </Popup>
        </Marker>
      );
    });
  }, [industries, isPollutionSource, onIndustryClick]);

  // Don't render anything if layer is disabled (should not happen due to conditional mounting)
  if (!enabled) {
    return null;
  }

  // If no industries available, return null
  if (!industries || industries.length === 0) {
    return null;
  }

  // Render individual markers (no clustering needed for exactly 5 facilities)
  return <>{industryMarkers}</>;
}

// Helper function to get display names for sectors
function getSectorDisplayName(sector) {
  const sectorNames = {
    ENERGY: 'Energia',
    MANUFACTURING: 'Manifatturiero',
    CHEMICAL: 'Chimico',
    MINING: 'Estrattivo',
    OTHER: 'Altro'
  };
  return sectorNames[sector] || 'Altro';
}

export default IndustryLayerRenderer;