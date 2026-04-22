import React from 'react';
import './LayerTogglePanel.css';

function LayerTogglePanel({ 
  fireLayerEnabled, 
  industryLayerEnabled, 
  onFireToggle, 
  onIndustryToggle, 
  layerDataStatus 
}) {
  
  const handleFireToggle = () => {
    if (layerDataStatus.fires !== 'unavailable') {
      onFireToggle(!fireLayerEnabled);
    }
  };

  const handleIndustryToggle = () => {
    if (layerDataStatus.industries !== 'unavailable') {
      onIndustryToggle(!industryLayerEnabled);
    }
  };

  const getStatusIndicator = (status) => {
    switch (status) {
      case 'loading':
        return (
          <div className="status-indicator loading" aria-label="Caricamento dati">
            <div className="loading-spinner"></div>
          </div>
        );
      case 'available':
        return (
          <div className="status-indicator available" aria-label="Dati disponibili">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12">
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
        );
      case 'unavailable':
        return (
          <div className="status-indicator unavailable" aria-label="Dati non disponibili">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const FireIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" className="layer-icon">
      <path fill="currentColor" d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.28 2.67-.2 3.73-.74 1.67-2.23 2.72-4.01 2.72z"/>
    </svg>
  );

  const IndustryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" className="layer-icon">
      <path fill="currentColor" d="M12 3L2 12h3v8h14v-8h3L12 3zm0 2.5L18.5 12H17v6H7v-6H5.5L12 5.5zM9 13h2v4H9v-4zm4 0h2v4h-2v-4z"/>
    </svg>
  );

  return (
    <div className="layer-toggle-panel" role="group" aria-label="Controlli layer mappa">
      <div className="panel-header">
        <h3 className="panel-title">Layer Contestuali</h3>
      </div>
      
      <div className="toggle-controls">
        {/* Fire Layer Toggle */}
        <div className="toggle-item">
          <button
            className={`toggle-button ${fireLayerEnabled ? 'active' : ''} ${layerDataStatus.fires === 'unavailable' ? 'disabled' : ''}`}
            onClick={handleFireToggle}
            disabled={layerDataStatus.fires === 'unavailable'}
            aria-pressed={fireLayerEnabled}
            aria-label={`${fireLayerEnabled ? 'Nascondi' : 'Mostra'} layer incendi`}
            title={layerDataStatus.fires === 'unavailable' ? 'Dati incendi non disponibili' : `${fireLayerEnabled ? 'Nascondi' : 'Mostra'} incendi attivi`}
          >
            <div className="toggle-content">
              <FireIcon />
              <span className="toggle-label">Incendi</span>
            </div>
            {getStatusIndicator(layerDataStatus.fires)}
          </button>
        </div>

        {/* Industry Layer Toggle */}
        <div className="toggle-item">
          <button
            className={`toggle-button ${industryLayerEnabled ? 'active' : ''} ${layerDataStatus.industries === 'unavailable' ? 'disabled' : ''}`}
            onClick={handleIndustryToggle}
            disabled={layerDataStatus.industries === 'unavailable'}
            aria-pressed={industryLayerEnabled}
            aria-label={`${industryLayerEnabled ? 'Nascondi' : 'Mostra'} layer industrie`}
            title={layerDataStatus.industries === 'unavailable' ? 'Dati industrie non disponibili' : `${industryLayerEnabled ? 'Nascondi' : 'Mostra'} industrie inquinanti`}
          >
            <div className="toggle-content">
              <IndustryIcon />
              <span className="toggle-label">Industrie</span>
            </div>
            {getStatusIndicator(layerDataStatus.industries)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LayerTogglePanel;