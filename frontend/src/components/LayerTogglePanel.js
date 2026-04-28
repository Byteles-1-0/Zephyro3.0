import React from 'react';

function LayerTogglePanel({ 
  fireLayerEnabled, 
  industryLayerEnabled, 
  onFireToggle, 
  onIndustryToggle, 
  layerDataStatus 
}) {
  return (
    <div className="widget" id="layer-toggle-widget" title="Toggle Map Layer" aria-label="Toggle Map Layer" style={{ 
      gap: '8px', 
      padding: '8px', 
      borderRadius: '16px',
      background: 'var(--bg-color)',
      boxShadow: 'var(--shadow-color) 0px 4px 20px',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Real logic buttons */}
      <button 
        id="industry-toggle" 
        className={`map-layer-button ${industryLayerEnabled ? 'active' : ''}`} 
        title="Toggle Industrie" 
        aria-label="Toggle Industrie"
        onClick={() => {
          if (layerDataStatus.industries !== 'unavailable') {
            onIndustryToggle(!industryLayerEnabled);
          }
        }}
        style={{ 
          opacity: layerDataStatus.industries === 'unavailable' ? 0.5 : 1,
          width: '46px', 
          height: '46px', 
          fontSize: '22px', 
          borderRadius: '12px',
          border: 'none',
          background: industryLayerEnabled ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
          color: industryLayerEnabled ? '#667eea' : 'var(--text-color)',
          cursor: layerDataStatus.industries === 'unavailable' ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: industryLayerEnabled ? 'inset 0 0 0 2px #667eea' : '0 2px 8px rgba(0,0,0,0.08)'
        }}
      >
        🏭
      </button>
      
      <button 
        id="wildfires-toggle" 
        className={`map-layer-button ${fireLayerEnabled ? 'active' : ''}`} 
        title="Toggle Incendi" 
        aria-label="Toggle Incendi"
        onClick={() => {
          if (layerDataStatus.fires !== 'unavailable') {
            onFireToggle(!fireLayerEnabled);
          }
        }}
        style={{ 
          opacity: layerDataStatus.fires === 'unavailable' ? 0.5 : 1,
          width: '46px', 
          height: '46px', 
          fontSize: '22px', 
          borderRadius: '12px',
          border: 'none',
          background: fireLayerEnabled ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
          color: fireLayerEnabled ? '#ef4444' : 'var(--text-color)',
          cursor: layerDataStatus.fires === 'unavailable' ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: fireLayerEnabled ? 'inset 0 0 0 2px #ef4444' : '0 2px 8px rgba(0,0,0,0.08)'
        }}
      >
        🔥
      </button>  
    </div>
  );
}

export default LayerTogglePanel;