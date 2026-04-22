import React, { useState, useEffect } from 'react';
import './ForecastTimeline.css';

function ForecastTimeline({ maps, currentIndex, onIndexChange, pollutant }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackSpeed = 500; // Fixed at 2x speed (500ms per frame)

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying || !maps || maps.length === 0) return;

    const interval = setInterval(() => {
      onIndexChange((prevIndex) => {
        // Loop back to start when reaching the end
        if (prevIndex >= maps.length - 1) {
          return 0;
        }
        return prevIndex + 1;
      });
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, maps, onIndexChange]);

  if (!maps || maps.length === 0) {
    return null;
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="forecast-timeline">
      <div className="forecast-timeline-content">
        <div className="current-time">
          <span className="time-value">{formatTimestamp(maps[currentIndex].timestamp)}</span>
        </div>

        <input
          type="range"
          min="0"
          max={maps.length - 1}
          value={currentIndex}
          onChange={(e) => {
            setIsPlaying(false); // Stop playing when manually changing
            onIndexChange(parseInt(e.target.value));
          }}
          className="forecast-slider"
          style={{'--value': `${(currentIndex / (maps.length - 1)) * 100}%`}}
        />

        <button 
          onClick={togglePlayPause}
          className={`control-btn-play ${isPlaying ? 'playing' : ''}`}
          title={isPlaying ? 'Pausa' : 'Riproduci (2x)'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
      </div>
    </div>
  );
}

export default ForecastTimeline;
