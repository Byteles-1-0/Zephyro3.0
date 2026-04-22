import React, { useEffect, useRef } from 'react';
import StationPopup from './StationPopup';
import './SideDrawer.css';

function SideDrawer({ 
  isOpen, 
  onClose, 
  station, 
  pollutantType, 
  realtimeData, 
  radiusKm 
}) {
  const drawerRef = useRef(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target) && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <div 
      ref={drawerRef}
      className={`side-drawer ${isOpen ? 'open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Header */}
      <div className="side-drawer-header">
        <h3 id="drawer-title">
          {station ? station.station_name : 'Dettagli Stazione'}
        </h3>
        <button 
          className="close-btn" 
          onClick={onClose}
          aria-label="Chiudi pannello dettagli"
          type="button"
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
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="side-drawer-content">
        {station && (
          <StationPopup
            station={station}
            pollutantType={pollutantType}
            realtimeData={realtimeData}
            radiusKm={radiusKm}
          />
        )}
      </div>
    </div>
  );
}

export default SideDrawer;