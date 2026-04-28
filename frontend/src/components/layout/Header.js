import React, { useEffect } from 'react';
import './Header.css';

const Header = ({ isDarkMode, setIsDarkMode }) => {
  // Toggle body class for dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <header className="zephyro-header">
      <img src={`${process.env.PUBLIC_URL}/assets/ZEPHYRO.png`} alt="Logo" id="logo" />
      <span className="project-name">ZEPHYRO</span>
      <div id="nasa-section" title="NASA Space App Challenge">
        <span>NASA Space App Challenge</span>
        <img 
          src={`${process.env.PUBLIC_URL}/assets/${isDarkMode ? 'nasa_logo_dark.png' : 'nasa_logo.png'}`} 
          alt="NASA Logo" 
          id="nasa-logo" 
        />
      </div>
      <button 
        id="dark-mode-toggle" 
        title="Toggle dark mode" 
        aria-label="Toggle dark mode"
        onClick={toggleDarkMode}
      >
        {isDarkMode ? '☀️' : '🌙'}
      </button>
    </header>
  );
};

export default Header;
