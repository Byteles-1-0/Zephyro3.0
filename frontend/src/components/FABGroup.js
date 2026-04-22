import React from 'react';
import LayerTogglePanel from './LayerTogglePanel';
import './FABGroup.css';

function FABGroup({ 
  onZoomIn, 
  onZoomOut, 
  onRecenter,
  // Layer toggle props
  fireLayerEnabled,
  industryLayerEnabled,
  onFireToggle,
  onIndustryToggle,
  layerDataStatus
}) {
  
  return (
    <>
      {/* Layer Toggle Panel - positioned separately to maintain existing FAB positioning */}
      {(fireLayerEnabled !== undefined || industryLayerEnabled !== undefined) && (
        <LayerTogglePanel
          fireLayerEnabled={fireLayerEnabled}
          industryLayerEnabled={industryLayerEnabled}
          onFireToggle={onFireToggle}
          onIndustryToggle={onIndustryToggle}
          layerDataStatus={layerDataStatus}
        />
      )}
      
      <div className="fab-group">
        {/* Zoom In Button */}
        <button 
          className="fab fab-zoom-in" 
          onClick={onZoomIn}
          title="Zoom In"
          aria-label="Aumenta zoom"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            width="20" 
            height="20"
            aria-hidden="true"
          >
            <path 
              fill="currentColor" 
              d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
            />
          </svg>
        </button>

        {/* Zoom Out Button */}
        <button 
          className="fab fab-zoom-out" 
          onClick={onZoomOut}
          title="Zoom Out"
          aria-label="Riduci zoom"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            width="20" 
            height="20"
            aria-hidden="true"
          >
            <path 
              fill="currentColor" 
              d="M19 13H5v-2h14v2z"
            />
          </svg>
        </button>

        {/* Recenter Button */}
        <button 
          className="fab fab-recenter" 
          onClick={onRecenter}
          title="Ricentralizza"
          aria-label="Ricentralizza mappa sulla tua posizione"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            width="20" 
            height="20"
            aria-hidden="true"
          >
            <path 
              fill="currentColor" 
              d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"
            />
          </svg>
        </button>
      </div>
    </>
  );
}

export default FABGroup;