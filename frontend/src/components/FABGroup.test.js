import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FABGroup from './FABGroup';

// Mock LayerTogglePanel since it's imported
jest.mock('./LayerTogglePanel', () => {
  return function MockLayerTogglePanel({ 
    fireLayerEnabled, 
    industryLayerEnabled, 
    onFireToggle, 
    onIndustryToggle,
    layerDataStatus 
  }) {
    return (
      <div data-testid="layer-toggle-panel">
        <button 
          data-testid="fire-toggle"
          onClick={() => onFireToggle(!fireLayerEnabled)}
        >
          Fire: {fireLayerEnabled ? 'ON' : 'OFF'}
        </button>
        <button 
          data-testid="industry-toggle"
          onClick={() => onIndustryToggle(!industryLayerEnabled)}
        >
          Industry: {industryLayerEnabled ? 'ON' : 'OFF'}
        </button>
        <div data-testid="fire-status">{layerDataStatus?.fires}</div>
        <div data-testid="industry-status">{layerDataStatus?.industries}</div>
      </div>
    );
  };
});

describe('FABGroup', () => {
  const defaultProps = {
    onZoomIn: jest.fn(),
    onZoomOut: jest.fn(),
    onRecenter: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic FAB functionality', () => {
    it('renders all FAB buttons', () => {
      render(<FABGroup {...defaultProps} />);
      
      expect(screen.getByLabelText('Aumenta zoom')).toBeInTheDocument();
      expect(screen.getByLabelText('Riduci zoom')).toBeInTheDocument();
      expect(screen.getByLabelText('Ricentralizza mappa sulla tua posizione')).toBeInTheDocument();
    });

    it('calls zoom in handler when zoom in button is clicked', () => {
      render(<FABGroup {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Aumenta zoom'));
      expect(defaultProps.onZoomIn).toHaveBeenCalledTimes(1);
    });

    it('calls zoom out handler when zoom out button is clicked', () => {
      render(<FABGroup {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Riduci zoom'));
      expect(defaultProps.onZoomOut).toHaveBeenCalledTimes(1);
    });

    it('calls recenter handler when recenter button is clicked', () => {
      render(<FABGroup {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Ricentralizza mappa sulla tua posizione'));
      expect(defaultProps.onRecenter).toHaveBeenCalledTimes(1);
    });
  });

  describe('Layer toggle integration', () => {
    const layerProps = {
      ...defaultProps,
      fireLayerEnabled: false,
      industryLayerEnabled: true,
      onFireToggle: jest.fn(),
      onIndustryToggle: jest.fn(),
      layerDataStatus: {
        fires: 'available',
        industries: 'loading'
      }
    };

    it('renders LayerTogglePanel when layer props are provided', () => {
      render(<FABGroup {...layerProps} />);
      
      expect(screen.getByTestId('layer-toggle-panel')).toBeInTheDocument();
    });

    it('does not render LayerTogglePanel when layer props are undefined', () => {
      render(<FABGroup {...defaultProps} />);
      
      expect(screen.queryByTestId('layer-toggle-panel')).not.toBeInTheDocument();
    });

    it('passes correct props to LayerTogglePanel', () => {
      render(<FABGroup {...layerProps} />);
      
      expect(screen.getByText('Fire: OFF')).toBeInTheDocument();
      expect(screen.getByText('Industry: ON')).toBeInTheDocument();
      expect(screen.getByTestId('fire-status')).toHaveTextContent('available');
      expect(screen.getByTestId('industry-status')).toHaveTextContent('loading');
    });

    it('calls layer toggle handlers when layer toggles are clicked', () => {
      render(<FABGroup {...layerProps} />);
      
      fireEvent.click(screen.getByTestId('fire-toggle'));
      expect(layerProps.onFireToggle).toHaveBeenCalledWith(true);

      fireEvent.click(screen.getByTestId('industry-toggle'));
      expect(layerProps.onIndustryToggle).toHaveBeenCalledWith(false);
    });

    it('renders LayerTogglePanel when only fireLayerEnabled is defined', () => {
      const partialProps = {
        ...defaultProps,
        fireLayerEnabled: true,
        onFireToggle: jest.fn(),
        layerDataStatus: { fires: 'available' }
      };

      render(<FABGroup {...partialProps} />);
      
      expect(screen.getByTestId('layer-toggle-panel')).toBeInTheDocument();
    });

    it('renders LayerTogglePanel when only industryLayerEnabled is defined', () => {
      const partialProps = {
        ...defaultProps,
        industryLayerEnabled: false,
        onIndustryToggle: jest.fn(),
        layerDataStatus: { industries: 'unavailable' }
      };

      render(<FABGroup {...partialProps} />);
      
      expect(screen.getByTestId('layer-toggle-panel')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for all buttons', () => {
      render(<FABGroup {...defaultProps} />);
      
      expect(screen.getByLabelText('Aumenta zoom')).toHaveAttribute('aria-label', 'Aumenta zoom');
      expect(screen.getByLabelText('Riduci zoom')).toHaveAttribute('aria-label', 'Riduci zoom');
      expect(screen.getByLabelText('Ricentralizza mappa sulla tua posizione')).toHaveAttribute('aria-label', 'Ricentralizza mappa sulla tua posizione');
    });

    it('has proper titles for all buttons', () => {
      render(<FABGroup {...defaultProps} />);
      
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
      expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
      expect(screen.getByTitle('Ricentralizza')).toBeInTheDocument();
    });
  });

  describe('Integration with existing functionality', () => {
    it('preserves existing FAB functionality when layer props are added', () => {
      const layerProps = {
        ...defaultProps,
        fireLayerEnabled: true,
        industryLayerEnabled: false,
        onFireToggle: jest.fn(),
        onIndustryToggle: jest.fn(),
        layerDataStatus: { fires: 'available', industries: 'available' }
      };

      render(<FABGroup {...layerProps} />);
      
      // Ensure all original FAB buttons still work
      fireEvent.click(screen.getByLabelText('Aumenta zoom'));
      expect(defaultProps.onZoomIn).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByLabelText('Riduci zoom'));
      expect(defaultProps.onZoomOut).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByLabelText('Ricentralizza mappa sulla tua posizione'));
      expect(defaultProps.onRecenter).toHaveBeenCalledTimes(1);

      // Ensure layer toggle panel is also present
      expect(screen.getByTestId('layer-toggle-panel')).toBeInTheDocument();
    });
  });
});