import React from 'react';

function ViewModeToggle({ viewMode, onViewModeChange }) {
  return (
    <div className="widget" style={{ 
      justifyContent: 'center', 
      gap: '4px', 
      padding: '6px',
      borderRadius: '30px',
      background: 'var(--bg-color)',
      boxShadow: 'var(--shadow-color) 0px 4px 15px'
    }}>
      <button
        className={`view-mode-btn-modern ${viewMode === 'realtime' ? 'active' : ''}`}
        onClick={() => onViewModeChange('realtime')}
        aria-label="Passa alla modalità tempo reale"
        title="Tempo Reale"
        style={{ 
          width: 'auto', 
          padding: '8px 16px', 
          fontSize: '14px', 
          display: 'flex', 
          gap: '8px',
          alignItems: 'center',
          borderRadius: '24px',
          border: 'none',
          background: viewMode === 'realtime' ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
          color: viewMode === 'realtime' ? '#667eea' : 'var(--text-color)',
          fontWeight: viewMode === 'realtime' ? '600' : '500',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      >
        <span style={{ fontSize: '16px' }}>⏱️</span> Tempo Reale
      </button>
      
      <button
        className={`view-mode-btn-modern ${viewMode === 'forecast' ? 'active' : ''}`}
        onClick={() => onViewModeChange('forecast')}
        aria-label="Passa alla modalità previsioni"
        title="Previsioni"
        style={{ 
          width: 'auto', 
          padding: '8px 16px', 
          fontSize: '14px', 
          display: 'flex', 
          gap: '8px',
          alignItems: 'center',
          borderRadius: '24px',
          border: 'none',
          background: viewMode === 'forecast' ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
          color: viewMode === 'forecast' ? '#667eea' : 'var(--text-color)',
          fontWeight: viewMode === 'forecast' ? '600' : '500',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      >
        <span style={{ fontSize: '16px' }}>📅</span> Previsioni
      </button>
    </div>
  );
}

export default ViewModeToggle;
