import React, { useState, useCallback } from 'react';
import './SearchBar.css';

function SearchBar({
  searchQuery,
  onSearchChange,
  pollutantType,
  onPollutantChange,
  dataSource,
  onDataSourceChange,
  viewMode
}) {
  const [showPM10Dropdown, setShowPM10Dropdown] = useState(false);
  const [showPM25Dropdown, setShowPM25Dropdown] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Debounced search handler
  const handleSearchInput = useCallback((e) => {
    const value = e.target.value;
    onSearchChange(value);
  }, [onSearchChange]);

  const handlePollutantClick = (pollutant) => {
    onPollutantChange(pollutant);
    if (pollutant === 'pm10') {
      setShowPM10Dropdown(!showPM10Dropdown);
      setShowPM25Dropdown(false);
    } else {
      setShowPM25Dropdown(!showPM25Dropdown);
      setShowPM10Dropdown(false);
    }
  };

  const handleDataSourceSelect = (source, pollutant) => {
    onDataSourceChange(source);
    if (pollutant === 'pm10') {
      setShowPM10Dropdown(false);
    } else {
      setShowPM25Dropdown(false);
    }
  };

  return (
    <div className={`search-bar ${isExpanded ? 'expanded' : ''}`}>
      {/* Search Input Container */}
      <div className="search-input-container">
        <button 
          className="search-icon-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label="Espandi ricerca"
        >
          <svg 
            className="search-icon" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            width="20" 
            height="20"
            aria-hidden="true"
          >
            <path 
              fill="currentColor" 
              d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            />
          </svg>
        </button>
        <input
          type="text"
          className="search-input"
          placeholder="Cerca località o stazione..."
          value={searchQuery}
          onChange={handleSearchInput}
          aria-label="Cerca località o stazione"
        />
      </div>

      {/* Vertical Divider */}
      <div className="search-divider" />

      {/* Pollutant Selector */}
      <div className="pollutant-selector">
        {/* PM10 Button with Dropdown */}
        <div className="pollutant-dropdown-container">
          <button 
            className={`pollutant-btn ${pollutantType === 'pm10' ? 'active' : ''}`}
            onClick={() => handlePollutantClick('pm10')}
            title="Particolato PM10"
            aria-label="Seleziona PM10"
          >
            <span className="pollutant-label">
              <span className="pollutant-main">PM10</span>
              {pollutantType === 'pm10' && viewMode === 'realtime' && (
                <span className="pollutant-sublabel">
                  {dataSource === 'daily' ? 'Giornalieri' : 'Orari'}
                </span>
              )}
            </span>
            {viewMode === 'realtime' && (
              <span className="pollutant-caret">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="10" height="10" className="caret-icon">
                  <path d="M4.103 7.873L16 19.25 27.897 7.873c.939-.898 2.46-.898 3.399 0s.939 2.353 0 3.251L17.7 24.127a2.481 2.481 0 01-3.399 0L.705 11.124c-.939-.898-.939-2.353 0-3.251s2.46-.898 3.399 0z"></path>
                </svg>
              </span>
            )}
          </button>
          
          {showPM10Dropdown && pollutantType === 'pm10' && viewMode === 'realtime' && (
            <div className="pollutant-dropdown">
              <button 
                className={`dropdown-item ${dataSource === 'daily' ? 'active' : ''}`}
                onClick={() => handleDataSourceSelect('daily', 'pm10')}
              >
                📅 Dati Giornalieri
              </button>
              <button 
                className={`dropdown-item ${dataSource === 'hourly' ? 'active' : ''}`}
                onClick={() => handleDataSourceSelect('hourly', 'pm10')}
              >
                🕐 Dati Orari
              </button>
            </div>
          )}
        </div>
        
        {/* PM2.5 Button with Dropdown */}
        <div className="pollutant-dropdown-container">
          <button 
            className={`pollutant-btn ${pollutantType === 'pm25' ? 'active' : ''}`}
            onClick={() => handlePollutantClick('pm25')}
            title="Particolato PM2.5"
            aria-label="Seleziona PM2.5"
          >
            <span className="pollutant-label">
              <span className="pollutant-main">PM2.5</span>
              {pollutantType === 'pm25' && viewMode === 'realtime' && (
                <span className="pollutant-sublabel">
                  {dataSource === 'daily' ? 'Giornalieri' : 'Orari'}
                </span>
              )}
            </span>
            {viewMode === 'realtime' && (
              <span className="pollutant-caret">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="10" height="10" className="caret-icon">
                  <path d="M4.103 7.873L16 19.25 27.897 7.873c.939-.898 2.46-.898 3.399 0s.939 2.353 0 3.251L17.7 24.127a2.481 2.481 0 01-3.399 0L.705 11.124c-.939-.898-.939-2.353 0-3.251s2.46-.898 3.399 0z"></path>
                </svg>
              </span>
            )}
          </button>
          
          {showPM25Dropdown && pollutantType === 'pm25' && viewMode === 'realtime' && (
            <div className="pollutant-dropdown">
              <button 
                className={`dropdown-item ${dataSource === 'daily' ? 'active' : ''}`}
                onClick={() => handleDataSourceSelect('daily', 'pm25')}
              >
                📅 Dati Giornalieri
              </button>
              <button 
                className={`dropdown-item ${dataSource === 'hourly' ? 'active' : ''}`}
                onClick={() => handleDataSourceSelect('hourly', 'pm25')}
              >
                🕐 Dati Orari
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchBar;
