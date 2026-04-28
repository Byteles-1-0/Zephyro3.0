import React from 'react';
import LayerTogglePanel from './LayerTogglePanel';

function FABGroup({ 
  onZoomIn, 
  onZoomOut, 
  onRecenter,
  fireLayerEnabled,
  industryLayerEnabled,
  onFireToggle,
  onIndustryToggle,
  layerDataStatus,
  viewMode
}) {
  
  return (
    <>
      {viewMode === 'realtime' && (fireLayerEnabled !== undefined || industryLayerEnabled !== undefined) && (
        <LayerTogglePanel
          fireLayerEnabled={fireLayerEnabled}
          industryLayerEnabled={industryLayerEnabled}
          onFireToggle={onFireToggle}
          onIndustryToggle={onIndustryToggle}
          layerDataStatus={layerDataStatus}
        />
      )}
      
      {/* Zoom and Recenter Widget */}
      <div 
        className="widget" 
        style={{ 
          position: 'fixed', 
          bottom: '24px', 
          right: '24px', 
          flexDirection: 'column', 
          gap: '6px', 
          padding: '6px',
          boxShadow: 'var(--shadow-color) 0px 4px 20px',
          borderRadius: '12px',
          zIndex: 1100
        }}
      >
        <button 
          className="map-layer-button" 
          onClick={onZoomIn}
          title="Zoom In"
          aria-label="Aumenta zoom"
          style={{ width: '34px', height: '34px', fontSize: '16px', borderRadius: '8px', border: 'none', background: 'var(--bg-color)', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
        >
          ➕
        </button>

        <button 
          className="map-layer-button" 
          onClick={onZoomOut}
          title="Zoom Out"
          aria-label="Riduci zoom"
          style={{ width: '34px', height: '34px', fontSize: '16px', borderRadius: '8px', border: 'none', background: 'var(--bg-color)', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
        >
          ➖
        </button>

        <div style={{ width: '100%', height: '1px', background: '#ccc', margin: '2px 0' }} />

        <button 
          className="map-layer-button" 
          onClick={onRecenter}
          title="Ricentralizza"
          aria-label="Ricentralizza mappa"
          style={{ width: '34px', height: '34px', fontSize: '16px', borderRadius: '8px', border: 'none', background: 'var(--bg-color)', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
        >
          📍
        </button>
      </div>
    </>
  );
}

export default FABGroup;