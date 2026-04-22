import React from 'react';
import { render } from '@testing-library/react';
import FireLayerRenderer from './FireLayerRenderer';

// Mock react-leaflet components to avoid ES module issues
jest.mock('react-leaflet', () => ({
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({
    getPane: jest.fn(() => null),
    createPane: jest.fn(() => ({ style: {} })),
    getBounds: jest.fn(() => ({
      contains: jest.fn(() => true) // Mock that all fires are visible
    })),
    on: jest.fn(),
    off: jest.fn()
  })
}));

// Mock react-leaflet-cluster
jest.mock('react-leaflet-cluster', () => {
  return function MockMarkerClusterGroup({ children }) {
    return <div data-testid="marker-cluster-group">{children}</div>;
  };
});

// Mock Leaflet
jest.mock('leaflet', () => ({
  divIcon: jest.fn(() => ({ options: {} }))
}));

// Mock data for testing
const mockFireData = [
  {
    id: 'fire_001',
    latitude: 45.4642,
    longitude: 9.1900,
    intensity: 'medium',
    location: 'Milano Nord',
    timestamp: '2024-01-15T14:30:00Z'
  },
  {
    id: 'fire_002',
    latitude: 41.9028,
    longitude: 12.4964,
    intensity: 'high',
    location: 'Roma Centro',
    timestamp: '2024-01-15T15:00:00Z'
  }
];

describe('FireLayerRenderer', () => {
  test('renders nothing when disabled', () => {
    const { container } = render(
      <FireLayerRenderer
        fires={mockFireData}
        enabled={false}
        onFireClick={() => {}}
      />
    );
    
    // Should not render any markers when disabled
    expect(container.firstChild).toBeNull();
  });

  test('renders nothing when no fires provided', () => {
    const { container } = render(
      <FireLayerRenderer
        fires={[]}
        enabled={true}
        onFireClick={() => {}}
      />
    );
    
    // Should not render any markers when no fires
    expect(container.firstChild).toBeNull();
  });

  test('renders nothing when fires is null', () => {
    const { container } = render(
      <FireLayerRenderer
        fires={null}
        enabled={true}
        onFireClick={() => {}}
      />
    );
    
    // Should not render any markers when fires is null
    expect(container.firstChild).toBeNull();
  });

  test('renders fire markers when enabled with data', () => {
    const { getAllByTestId } = render(
      <FireLayerRenderer
        fires={mockFireData}
        enabled={true}
        onFireClick={() => {}}
      />
    );
    
    // Should render fire markers when enabled with data
    const markers = getAllByTestId('marker');
    expect(markers).toHaveLength(2);
  });

  test('uses clustering for large datasets', () => {
    // Create a large dataset (>10 fires)
    const largeFires = Array.from({ length: 15 }, (_, i) => ({
      id: `fire_${i}`,
      latitude: 45 + (i * 0.1),
      longitude: 9 + (i * 0.1),
      intensity: 'medium',
      location: `Location ${i}`,
      timestamp: '2024-01-15T14:30:00Z'
    }));

    const { getByTestId } = render(
      <FireLayerRenderer
        fires={largeFires}
        enabled={true}
        onFireClick={() => {}}
      />
    );
    
    // Should use clustering for large datasets
    expect(getByTestId('marker-cluster-group')).toBeTruthy();
  });

  test('handles different fire intensities', () => {
    const intensityFires = [
      { ...mockFireData[0], intensity: 'low' },
      { ...mockFireData[1], intensity: 'high' }
    ];

    const { getAllByTestId } = render(
      <FireLayerRenderer
        fires={intensityFires}
        enabled={true}
        onFireClick={() => {}}
      />
    );
    
    // Should render markers for different intensities
    const markers = getAllByTestId('marker');
    expect(markers).toHaveLength(2);
  });

  test('handles missing onFireClick prop', () => {
    const { getAllByTestId } = render(
      <FireLayerRenderer
        fires={mockFireData}
        enabled={true}
      />
    );
    
    // Should render without crashing even without onFireClick
    const markers = getAllByTestId('marker');
    expect(markers).toHaveLength(2);
  });
});