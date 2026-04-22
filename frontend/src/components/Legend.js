import React from 'react';
import './Legend.css';

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
    <div className="legend" role="region" aria-label="Legenda qualità dell'aria">
      <div className="legend-title">Qualità dell'aria</div>
      {legendItems.map((item, index) => (
        <div key={index} className="legend-item">
          <div 
            className="legend-dot" 
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="legend-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default Legend;
