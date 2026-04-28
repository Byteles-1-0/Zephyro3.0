import React from 'react';

function Legend({ viewMode }) {
  // Don't show legend in forecast mode (forecast has its own color scale)
  if (viewMode === 'forecast') {
    return null;
  }

  const legendItems = [
    { color: '#22c55e', label: 'Buona' },
    { color: '#eab308', label: 'Moderata' },
    { color: '#ef4444', label: 'Scarsa' },
    { color: '#6b7280', label: 'Nessun dato' }
  ];

  return (
    <div className="widget" id="aqi-legend-widget" title="Legenda Qualità Aria">
      <div id="legend-content">
        {legendItems.map((item, index) => (
          <div key={index} style={{ marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
            <span 
              className="color-block" 
              style={{ 
                background: item.color, 
                width: '18px', 
                height: '14px', 
                display: 'inline-block', 
                borderRadius: '4px', 
                marginRight: '8px' 
              }}
            ></span> 
            <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Legend;
