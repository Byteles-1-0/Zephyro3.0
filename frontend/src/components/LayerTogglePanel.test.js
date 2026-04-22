import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LayerTogglePanel from './LayerTogglePanel';

describe('LayerTogglePanel', () => {
  const defaultProps = {
    fireLayerEnabled: false,
    industryLayerEnabled: false,
    onFireToggle: jest.fn(),
    onIndustryToggle: jest.fn(),
    layerDataStatus: {
      fires: 'available',
      industries: 'available'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders layer toggle panel with title', () => {
    render(<LayerTogglePanel {...defaultProps} />);
    
    expect(screen.getByText('Layer Contestuali')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Controlli layer mappa' })).toBeInTheDocument();
  });

  test('renders fire and industry toggle buttons', () => {
    render(<LayerTogglePanel {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /mostra layer incendi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mostra layer industrie/i })).toBeInTheDocument();
    expect(screen.getByText('Incendi')).toBeInTheDocument();
    expect(screen.getByText('Industrie')).toBeInTheDocument();
  });

  test('calls onFireToggle when fire button is clicked', () => {
    render(<LayerTogglePanel {...defaultProps} />);
    
    const fireButton = screen.getByRole('button', { name: /mostra layer incendi/i });
    fireEvent.click(fireButton);
    
    expect(defaultProps.onFireToggle).toHaveBeenCalledWith(true);
  });

  test('calls onIndustryToggle when industry button is clicked', () => {
    render(<LayerTogglePanel {...defaultProps} />);
    
    const industryButton = screen.getByRole('button', { name: /mostra layer industrie/i });
    fireEvent.click(industryButton);
    
    expect(defaultProps.onIndustryToggle).toHaveBeenCalledWith(true);
  });

  test('shows active state when layers are enabled', () => {
    const props = {
      ...defaultProps,
      fireLayerEnabled: true,
      industryLayerEnabled: true
    };
    
    render(<LayerTogglePanel {...props} />);
    
    const fireButton = screen.getByRole('button', { name: /nascondi layer incendi/i });
    const industryButton = screen.getByRole('button', { name: /nascondi layer industrie/i });
    
    expect(fireButton).toHaveClass('active');
    expect(industryButton).toHaveClass('active');
    expect(fireButton).toHaveAttribute('aria-pressed', 'true');
    expect(industryButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('disables buttons when data is unavailable', () => {
    const props = {
      ...defaultProps,
      layerDataStatus: {
        fires: 'unavailable',
        industries: 'unavailable'
      }
    };
    
    render(<LayerTogglePanel {...props} />);
    
    const fireButton = screen.getByRole('button', { name: /mostra layer incendi/i });
    const industryButton = screen.getByRole('button', { name: /mostra layer industrie/i });
    
    expect(fireButton).toBeDisabled();
    expect(industryButton).toBeDisabled();
    expect(fireButton).toHaveClass('disabled');
    expect(industryButton).toHaveClass('disabled');
  });

  test('shows loading indicators when data is loading', () => {
    const props = {
      ...defaultProps,
      layerDataStatus: {
        fires: 'loading',
        industries: 'loading'
      }
    };
    
    render(<LayerTogglePanel {...props} />);
    
    const loadingIndicators = screen.getAllByLabelText('Caricamento dati');
    expect(loadingIndicators).toHaveLength(2);
    
    loadingIndicators.forEach(indicator => {
      expect(indicator).toHaveClass('loading');
    });
  });

  test('shows available indicators when data is available', () => {
    render(<LayerTogglePanel {...defaultProps} />);
    
    const availableIndicators = screen.getAllByLabelText('Dati disponibili');
    expect(availableIndicators).toHaveLength(2);
    
    availableIndicators.forEach(indicator => {
      expect(indicator).toHaveClass('available');
    });
  });

  test('shows unavailable indicators when data is unavailable', () => {
    const props = {
      ...defaultProps,
      layerDataStatus: {
        fires: 'unavailable',
        industries: 'unavailable'
      }
    };
    
    render(<LayerTogglePanel {...props} />);
    
    const unavailableIndicators = screen.getAllByLabelText('Dati non disponibili');
    expect(unavailableIndicators).toHaveLength(2);
    
    unavailableIndicators.forEach(indicator => {
      expect(indicator).toHaveClass('unavailable');
    });
  });

  test('does not call toggle functions when buttons are disabled', () => {
    const props = {
      ...defaultProps,
      layerDataStatus: {
        fires: 'unavailable',
        industries: 'unavailable'
      }
    };
    
    render(<LayerTogglePanel {...props} />);
    
    const fireButton = screen.getByRole('button', { name: /mostra layer incendi/i });
    const industryButton = screen.getByRole('button', { name: /mostra layer industrie/i });
    
    fireEvent.click(fireButton);
    fireEvent.click(industryButton);
    
    expect(defaultProps.onFireToggle).not.toHaveBeenCalled();
    expect(defaultProps.onIndustryToggle).not.toHaveBeenCalled();
  });

  test('has proper accessibility attributes', () => {
    render(<LayerTogglePanel {...defaultProps} />);
    
    const fireButton = screen.getByRole('button', { name: /mostra layer incendi/i });
    const industryButton = screen.getByRole('button', { name: /mostra layer industrie/i });
    
    expect(fireButton).toHaveAttribute('aria-pressed', 'false');
    expect(industryButton).toHaveAttribute('aria-pressed', 'false');
    expect(fireButton).toHaveAttribute('title');
    expect(industryButton).toHaveAttribute('title');
  });

  test('toggles correctly from enabled to disabled state', () => {
    const props = {
      ...defaultProps,
      fireLayerEnabled: true
    };
    
    render(<LayerTogglePanel {...props} />);
    
    const fireButton = screen.getByRole('button', { name: /nascondi layer incendi/i });
    fireEvent.click(fireButton);
    
    expect(defaultProps.onFireToggle).toHaveBeenCalledWith(false);
  });
});