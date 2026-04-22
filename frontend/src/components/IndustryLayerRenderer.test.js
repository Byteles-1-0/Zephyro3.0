import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import IndustryLayerRenderer from './IndustryLayerRenderer';

// Mock Leaflet
jest.mock('leaflet', () => ({
  divIcon: jest.fn((options) => ({ 
    options: {
      className: options.className,
      html: options.html,
      iconSize: options.iconSize,
      iconAnchor: options.iconAnchor,
      popupAnchor: options.popupAnchor
    } 
  })),
}));

// Mock react-leaflet components
jest.mock('react-leaflet', () => ({
  Marker: ({ children, position, eventHandlers, icon, ...props }) => (
    <div 
      data-testid="marker" 
      data-position={`${position[0]},${position[1]}`}
      className={icon?.options?.className || ''}
      onClick={eventHandlers?.click}
      {...props}
    >
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({
    createPane: jest.fn(() => ({
      style: {
        zIndex: 0,
        pointerEvents: 'auto'
      }
    })),
    getPane: jest.fn(() => null)
  })
}));

describe('IndustryLayerRenderer', () => {
  const mockIndustries = [
    {
      id: 'industry_001',
      name: 'Centrale Termoeletrica Milano',
      latitude: 45.4642,
      longitude: 9.1900,
      sector: 'ENERGY',
      pollutant_count: 12,
      pollutants: ['CO2', 'NOx', 'SO2', 'PM10', 'PM2.5'],
      population_proximity: 5.2
    },
    {
      id: 'industry_002',
      name: 'Stabilimento Chimico Torino',
      latitude: 45.0703,
      longitude: 7.6869,
      sector: 'CHEMICAL',
      pollutant_count: 8,
      pollutants: ['VOC', 'NH3', 'CO'],
      population_proximity: 3.1
    },
    {
      id: 'industry_003',
      name: 'Acciaieria Roma',
      latitude: 41.9028,
      longitude: 12.4964,
      sector: 'MANUFACTURING',
      pollutant_count: 15,
      pollutants: ['CO2', 'NOx', 'SO2', 'PM10', 'PM2.5', 'CO'],
      population_proximity: 2.8
    },
    {
      id: 'industry_004',
      name: 'Miniera Sardegna',
      latitude: 40.1209,
      longitude: 9.0129,
      sector: 'MINING',
      pollutant_count: 6,
      pollutants: ['PM10', 'PM2.5', 'SO2'],
      population_proximity: 15.7
    },
    {
      id: 'industry_005',
      name: 'Impianto Generico',
      latitude: 44.4949,
      longitude: 11.3426,
      sector: 'OTHER',
      pollutant_count: 4,
      pollutants: ['CO2', 'NOx'],
      population_proximity: 8.3
    },
    {
      id: 'industry_006',
      name: 'Sesto Impianto (dovrebbe essere escluso)',
      latitude: 43.7696,
      longitude: 11.2558,
      sector: 'ENERGY',
      pollutant_count: 10,
      pollutants: ['CO2', 'NOx', 'SO2'],
      population_proximity: 4.5
    }
  ];

  const mockOnIndustryClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders nothing when layer is disabled', () => {
    const { container } = render(
      <IndustryLayerRenderer
        industries={mockIndustries}
        enabled={false}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders nothing when no industries provided', () => {
    const { container } = render(
      <IndustryLayerRenderer
        industries={[]}
        enabled={true}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders exactly 5 facilities when enabled with data', () => {
    const { getAllByTestId } = render(
      <IndustryLayerRenderer
        industries={mockIndustries}
        enabled={true}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    const markers = getAllByTestId('marker');
    expect(markers).toHaveLength(5); // Requirement 3.4: exactly 5 facilities
  });

  test('renders first 5 facilities from the array', () => {
    const { getAllByTestId } = render(
      <IndustryLayerRenderer
        industries={mockIndustries}
        enabled={true}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    const markers = getAllByTestId('marker');
    
    // Check that the first 5 industries are rendered (not the 6th one)
    expect(markers[0]).toHaveAttribute('data-position', '45.4642,9.19');
    expect(markers[1]).toHaveAttribute('data-position', '45.0703,7.6869');
    expect(markers[2]).toHaveAttribute('data-position', '41.9028,12.4964');
    expect(markers[3]).toHaveAttribute('data-position', '40.1209,9.0129');
    expect(markers[4]).toHaveAttribute('data-position', '44.4949,11.3426');
  });

  test('displays comprehensive facility information in popups', () => {
    const { getAllByTestId } = render(
      <IndustryLayerRenderer
        industries={mockIndustries.slice(0, 1)} // Test with first industry
        enabled={true}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    const popups = getAllByTestId('popup');
    expect(popups).toHaveLength(1);

    const popupContent = popups[0].textContent;
    
    // Requirement 3.2: popup shows facility details
    expect(popupContent).toContain('Centrale Termoeletrica Milano'); // name
    expect(popupContent).toContain('Energia'); // sector (translated)
    expect(popupContent).toContain('12 tipi diversi'); // pollutant count
    expect(popupContent).toContain('45.4642, 9.1900'); // coordinates
    expect(popupContent).toContain('5.2 km'); // population proximity
    expect(popupContent).toContain('CO2'); // pollutants list
    expect(popupContent).toContain('NOx');
    expect(popupContent).toContain('SO2');
  });

  test('displays sector-specific information correctly', () => {
    // Test CHEMICAL sector specifically
    const chemicalIndustry = {
      id: 'industry_002',
      name: 'Stabilimento Chimico Torino',
      latitude: 45.0703,
      longitude: 7.6869,
      sector: 'CHEMICAL',
      pollutant_count: 8,
      pollutants: ['VOC', 'NH3', 'CO'],
      population_proximity: 3.1
    };
    
    const { getAllByTestId } = render(
      <IndustryLayerRenderer
        industries={[chemicalIndustry]}
        enabled={true}
        onIndustryClick={mockOnIndustryClick}
      />
    );
    
    const popup = getAllByTestId('popup')[0];
    expect(popup.textContent).toContain('Stabilimento Chimico Torino');
    expect(popup.textContent).toContain('Chimico');
  });

  test('handles industries with many pollutants correctly', () => {
    const industryWithManyPollutants = [{
      ...mockIndustries[0],
      pollutants: ['CO2', 'NOx', 'SO2', 'PM10', 'PM2.5', 'CO', 'NH3', 'VOC', 'CH4', 'N2O']
    }];

    const { getAllByTestId } = render(
      <IndustryLayerRenderer
        industries={industryWithManyPollutants}
        enabled={true}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    const popup = getAllByTestId('popup')[0];
    const popupContent = popup.textContent;
    
    // Should show first 6 pollutants and indicate there are more
    expect(popupContent).toContain('CO2');
    expect(popupContent).toContain('NOx');
    expect(popupContent).toContain('SO2');
    expect(popupContent).toContain('PM10');
    expect(popupContent).toContain('PM2.5');
    expect(popupContent).toContain('CO');
    expect(popupContent).toContain('+4 altri'); // Should show +4 more
  });

  test('handles industries without population proximity data', () => {
    const industryWithoutProximity = [{
      ...mockIndustries[0],
      population_proximity: undefined
    }];

    const { getAllByTestId } = render(
      <IndustryLayerRenderer
        industries={industryWithoutProximity}
        enabled={true}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    const popup = getAllByTestId('popup')[0];
    const popupContent = popup.textContent;
    
    // Should not show distance information when not available
    expect(popupContent).not.toContain('Distanza città');
  });

  test('handles empty pollutants array gracefully', () => {
    const industryWithNoPollutants = [{
      ...mockIndustries[0],
      pollutants: [],
      pollutant_count: 0
    }];

    const { getAllByTestId } = render(
      <IndustryLayerRenderer
        industries={industryWithNoPollutants}
        enabled={true}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    const popup = getAllByTestId('popup')[0];
    const popupContent = popup.textContent;
    
    expect(popupContent).toContain('0 tipi diversi');
    expect(popupContent).not.toContain('Principali inquinanti:');
  });

  test('component re-renders efficiently with memoization', () => {
    const { rerender, getAllByTestId } = render(
      <IndustryLayerRenderer
        industries={mockIndustries}
        enabled={true}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    // Initial render should have 5 markers
    expect(getAllByTestId('marker')).toHaveLength(5);

    // Re-render with same props should not cause issues
    rerender(
      <IndustryLayerRenderer
        industries={mockIndustries}
        enabled={true}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    // Component should still render 5 markers
    expect(getAllByTestId('marker')).toHaveLength(5);
  });

  test('all sector types are handled correctly', () => {
    const allSectorIndustries = [
      { ...mockIndustries[0], sector: 'ENERGY' },
      { ...mockIndustries[1], sector: 'MANUFACTURING' },
      { ...mockIndustries[2], sector: 'CHEMICAL' },
      { ...mockIndustries[3], sector: 'MINING' },
      { ...mockIndustries[4], sector: 'OTHER' }
    ];

    const { getAllByTestId } = render(
      <IndustryLayerRenderer
        industries={allSectorIndustries}
        enabled={true}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    const popups = getAllByTestId('popup');
    expect(popups).toHaveLength(5);

    // Check that all sector translations are present
    const allPopupContent = popups.map(popup => popup.textContent).join(' ');
    expect(allPopupContent).toContain('Energia');
    expect(allPopupContent).toContain('Manifatturiero');
    expect(allPopupContent).toContain('Chimico');
    expect(allPopupContent).toContain('Estrattivo');
    expect(allPopupContent).toContain('Altro');
  });

  // ============================================
  // SMART ICON STATE TESTS
  // Task 10.3: Unit tests for smart icon state logic
  // ============================================

  test('displays neutral state for non-pollution sources', () => {
    const { getAllByTestId } = render(
      <IndustryLayerRenderer
        industries={mockIndustries.slice(0, 3)}
        enabled={true}
        pollutionSources={[]} // No pollution sources
        onIndustryClick={mockOnIndustryClick}
      />
    );

    const markers = getAllByTestId('marker');
    
    // All markers should have neutral state class
    markers.forEach(marker => {
      expect(marker.className).toContain('industry-neutral');
      expect(marker.className).not.toContain('industry-active');
    });
  });

  test('displays active state for pollution sources', () => {
    const pollutionSourceIds = ['industry_001', 'industry_003'];
    
    const { getAllByTestId } = render(
      <IndustryLayerRenderer
        industries={mockIndustries.slice(0, 5)}
        enabled={true}
        pollutionSources={pollutionSourceIds}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    const markers = getAllByTestId('marker');
    
    // First marker (industry_001) should be active
    expect(markers[0].className).toContain('industry-active');
    expect(markers[0].className).not.toContain('industry-neutral');
    
    // Second marker (industry_002) should be neutral
    expect(markers[1].className).toContain('industry-neutral');
    expect(markers[1].className).not.toContain('industry-active');
    
    // Third marker (industry_003) should be active
    expect(markers[2].className).toContain('industry-active');
    expect(markers[2].className).not.toContain('industry-neutral');
    
    // Fourth and fifth markers should be neutral
    expect(markers[3].className).toContain('industry-neutral');
    expect(markers[4].className).toContain('industry-neutral');
  });

  test('updates icon states when pollution sources change', () => {
    const { getAllByTestId, rerender } = render(
      <IndustryLayerRenderer
        industries={mockIndustries.slice(0, 3)}
        enabled={true}
        pollutionSources={[]}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    let markers = getAllByTestId('marker');
    
    // Initially all neutral
    markers.forEach(marker => {
      expect(marker.className).toContain('industry-neutral');
    });

    // Update to mark first industry as pollution source
    rerender(
      <IndustryLayerRenderer
        industries={mockIndustries.slice(0, 3)}
        enabled={true}
        pollutionSources={['industry_001']}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    markers = getAllByTestId('marker');
    
    // First marker should now be active
    expect(markers[0].className).toContain('industry-active');
    
    // Others should remain neutral
    expect(markers[1].className).toContain('industry-neutral');
    expect(markers[2].className).toContain('industry-neutral');
  });

  test('clears active states when pollution sources array is empty', () => {
    const { getAllByTestId, rerender } = render(
      <IndustryLayerRenderer
        industries={mockIndustries.slice(0, 3)}
        enabled={true}
        pollutionSources={['industry_001', 'industry_002']}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    let markers = getAllByTestId('marker');
    
    // First two should be active
    expect(markers[0].className).toContain('industry-active');
    expect(markers[1].className).toContain('industry-active');

    // Clear pollution sources
    rerender(
      <IndustryLayerRenderer
        industries={mockIndustries.slice(0, 3)}
        enabled={true}
        pollutionSources={[]}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    markers = getAllByTestId('marker');
    
    // All should now be neutral
    markers.forEach(marker => {
      expect(marker.className).toContain('industry-neutral');
      expect(marker.className).not.toContain('industry-active');
    });
  });

  test('handles undefined pollutionSources prop gracefully', () => {
    const { getAllByTestId } = render(
      <IndustryLayerRenderer
        industries={mockIndustries.slice(0, 3)}
        enabled={true}
        // pollutionSources prop not provided (undefined)
        onIndustryClick={mockOnIndustryClick}
      />
    );

    const markers = getAllByTestId('marker');
    
    // All markers should default to neutral state
    markers.forEach(marker => {
      expect(marker.className).toContain('industry-neutral');
    });
  });

  test('handles multiple pollution sources correctly', () => {
    const allPollutionSources = [
      'industry_001',
      'industry_002',
      'industry_003',
      'industry_004',
      'industry_005'
    ];
    
    const { getAllByTestId } = render(
      <IndustryLayerRenderer
        industries={mockIndustries.slice(0, 5)}
        enabled={true}
        pollutionSources={allPollutionSources}
        onIndustryClick={mockOnIndustryClick}
      />
    );

    const markers = getAllByTestId('marker');
    
    // All markers should be active
    markers.forEach(marker => {
      expect(marker.className).toContain('industry-active');
      expect(marker.className).not.toContain('industry-neutral');
    });
  });
});