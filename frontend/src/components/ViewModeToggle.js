import React from 'react';
import './ViewModeToggle.css';

function ViewModeToggle({ viewMode, onViewModeChange }) {
  return (
    <div className="view-mode-toggle">
      <button
        className={`view-mode-btn ${viewMode === 'realtime' ? 'active' : ''}`}
        onClick={() => onViewModeChange('realtime')}
        aria-label="Passa alla modalità tempo reale"
        aria-pressed={viewMode === 'realtime'}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          width="18" 
          height="18"
          aria-hidden="true"
        >
          <path 
            fill="currentColor" 
            d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"
          />
        </svg>
        <span>Tempo Reale</span>
      </button>
      
      <button
        className={`view-mode-btn ${viewMode === 'forecast' ? 'active' : ''}`}
        onClick={() => onViewModeChange('forecast')}
        aria-label="Passa alla modalità previsioni"
        aria-pressed={viewMode === 'forecast'}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          width="18" 
          height="18"
          aria-hidden="true"
        >
          <path 
            fill="currentColor" 
            d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V9h14v10zm0-12H5V5h14v2zM7 11h5v5H7z"
          />
        </svg>
        <span>Previsioni</span>
      </button>
    </div>
  );
}

export default ViewModeToggle;
