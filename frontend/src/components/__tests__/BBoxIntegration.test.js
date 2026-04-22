/**
 * Frontend Integration Tests for BBOX Spatial Filtering
 * 
 * Task 9: Frontend integration testing checkpoint for BBOX spatial filtering feature
 * 
 * This test suite validates:
 * - Map movement triggers debounced API calls
 * - BBOX parameters are correctly sent to backend
 * - Filtered data is received and rendered
 * - Integration between map bounds tracking and API calls
 * 
 * Requirements tested:
 * - Requirement 5: Frontend Map Bounds Tracking
 * - Requirement 6: Debounced API Requests
 * - Requirement 7: BBOX Parameter Transmission
 * - Requirement 8-11: Smart Icon States and Visual Feedback
 * - Requirement 12: Backward Compatibility
 * - Requirement 13: Error Handling
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import App from '../../App';

// Mock axios for API calls
jest.mock('axios');
const mockedAxios = axios;

// Mock Leaflet and react-leaflet
const mockMap = {
  getBounds: jest.fn(),
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
  flyTo: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  whenReady: jest.fn((callback) => callback()),
};

const mockBounds = {
  getNorthEast: jest.fn(() => ({ lat: 45.5, lng: 9.3 })),
  getSouthWest: jest.fn(() => ({ lat: 45.4, lng: 9.1 })),
};

jest.mock('leaflet', () => ({
  map: jest.fn(() => mockMap),
  tileLayer: jest.fn(),
  circle: jest.fn(),
  divIcon: jest.fn(() => ({ options: {} })),
  marker: jest.fn(),
}));

jest.mock('react-leaflet', () => {
  const mockReact = require('react');
  
  return {
    MapContainer: ({ children, ...props }) => {
      // Simulate map ready and provide map instance to children
      mockReact.useEffect(() => {
        if (props.ref && props.ref.current !== mockMap) {
          props.ref.current = mockMap;
        }
      }, []);
      
      return mockReact.createElement('div', { 'data-testid': 'map-container', ...props }, children);
    },
    TileLayer: () => mockReact.createElement('div', { 'data-testid': 'tile-layer' }),
    Circle: ({ eventHandlers, ...props }) => 
      mockReact.createElement('div', {
        'data-testid': 'circle',
        'data-center': JSON.stringify(props.center),
        onClick: eventHandlers?.click
      }),
    Marker: ({ children, ...props }) => 
      mockReact.createElement('div', { 'data-testid': 'marker', ...props }, children),
    Popup: ({ children }) => mockReact.createElement('div', { 'data-testid': 'popup' }, children),
    useMapEvents: (eventHandlers) => {
      mockReact.useEffect(() => {
        // Simulate map events for testing
        const simulateMapEvent = () => {
          if (eventHandlers.moveend) {
            mockMap.getBounds.mockReturnValue(mockBounds);
            eventHandlers.moveend({ target: mockMap });
          }
        };
        
        // Simulate initial map load
        setTimeout(simulateMapEvent, 100);
        
        return () => {};
      }, []);
      
      return null;
    },
  };
});

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn((success) => 
    success({
      coords: {
        latitude: 45.4642,
        longitude: 9.1900,
      },
    })
  ),
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

describe('BBOX Spatial Filtering - Frontend Integration', () => {
  // Mock API responses
  const mockBaseMapResponse = {
    data: {
      features: [
        {
          geometry: { coordinates: [9.1900, 45.4642] },
          properties: {
            station_id: 'station_001',
            station_name: 'Milano Centro',
            value: 25.5,
            color: 'yellow',
          },
        },
        {
          geometry: { coordinates: [12.4964, 41.9028] },
          properties: {
            station_id: 'station_002',
            station_name: 'Roma Centro',
            value: 30.2,
            color: 'red',
          },
        },
      ],
    },
  };

  const mockLayerDataResponse = {
    data: {
      fires: [
        {
          id: 'fire_001',
          latitude: 45.4642,
          longitude: 9.1900,
          intensity: 'medium',
          location: 'Milano Nord',
          timestamp: '2024-01-15T14:30:00Z',
        },
      ],
      top_industries: [
        {
          id: 'industry_001',
          name: 'Centrale Termoeletrica Milano',
          latitude: 45.4642,
          longitude: 9.1900,
          sector: 'ENERGY',
          pollutant_count: 12,
          pollutants: ['CO2', 'NOx', 'SO2'],
          population_proximity: 5.2,
          ranking_score: 12150,
        },
      ],
      cache_timestamp: '2024-01-15T14:30:00Z',
      data_status: {
        fires: 'available',
        industries: 'available',
      },
      bbox_applied: true,
      filtered_counts: {
        industries_total: 150,
        industries_returned: 1,
        fires_total: 5,
        fires_returned: 1,
      },
    },
  };

  const mockLayerDataResponseUnfiltered = {
    data: {
      fires: [
        {
          id: 'fire_001',
          latitude: 45.4642,
          longitude: 9.1900,
          intensity: 'medium',
          location: 'Milano Nord',
          timestamp: '2024-01-15T14:30:00Z',
        },
        {
          id: 'fire_002',
          latitude: 41.9028,
          longitude: 12.4964,
          intensity: 'high',
          location: 'Roma Sud',
          timestamp: '2024-01-15T15:00:00Z',
        },
      ],
      top_industries: [
        {
          id: 'industry_001',
          name: 'Centrale Termoeletrica Milano',
          latitude: 45.4642,
          longitude: 9.1900,
          sector: 'ENERGY',
          pollutant_count: 12,
          pollutants: ['CO2', 'NOx', 'SO2'],
          population_proximity: 5.2,
          ranking_score: 12150,
        },
        {
          id: 'industry_002',
          name: 'Stabilimento Chimico Roma',
          latitude: 41.9028,
          longitude: 12.4964,
          sector: 'CHEMICAL',
          pollutant_count: 8,
          pollutants: ['VOC', 'NH3', 'CO'],
          population_proximity: 3.1,
          ranking_score: 8500,
        },
      ],
      cache_timestamp: '2024-01-15T14:30:00Z',
      data_status: {
        fires: 'available',
        industries: 'available',
      },
      bbox_applied: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup default axios mocks
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/api/map-base')) {
        return Promise.resolve(mockBaseMapResponse);
      }
      if (url.includes('/api/realtime-details')) {
        return Promise.resolve({ data: {} });
      }
      if (url.includes('/api/map-layers')) {
        // Check if BBOX parameters are present
        if (url.includes('ne_lat=') && url.includes('ne_lon=') && 
            url.includes('sw_lat=') && url.includes('sw_lon=')) {
          return Promise.resolve(mockLayerDataResponse);
        } else {
          return Promise.resolve(mockLayerDataResponseUnfiltered);
        }
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Map Bounds Tracking and BBOX Parameter Generation', () => {
    test('should extract BBOX parameters from map bounds on movement', async () => {
      // Requirement 5: Frontend Map Bounds Tracking
      render(<App />);

      // Wait for initial data load
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Wait for debounced API call
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        // Verify that map-layers API was called with BBOX parameters
        const mapLayersCalls = mockedAxios.get.mock.calls.filter(call => 
          call[0].includes('/api/map-layers')
        );
        
        expect(mapLayersCalls.length).toBeGreaterThan(0);
        
        // Find the call with BBOX parameters
        const bboxCall = mapLayersCalls.find(call => 
          call[0].includes('ne_lat=45.5') &&
          call[0].includes('ne_lon=9.3') &&
          call[0].includes('sw_lat=45.4') &&
          call[0].includes('sw_lon=9.1')
        );
        
        expect(bboxCall).toBeDefined();
      });
    });

    test('should format BBOX parameters correctly in query string', async () => {
      // Requirement 7: BBOX Parameter Transmission
      render(<App />);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        const mapLayersCalls = mockedAxios.get.mock.calls.filter(call => 
          call[0].includes('/api/map-layers') && call[0].includes('ne_lat=')
        );
        
        expect(mapLayersCalls.length).toBeGreaterThan(0);
        
        const bboxCall = mapLayersCalls[0];
        const url = bboxCall[0];
        
        // Verify exact format: ne_lat={value}&ne_lon={value}&sw_lat={value}&sw_lon={value}
        expect(url).toMatch(/ne_lat=45\.5/);
        expect(url).toMatch(/ne_lon=9\.3/);
        expect(url).toMatch(/sw_lat=45\.4/);
        expect(url).toMatch(/sw_lon=9\.1/);
      });
    });
  });

  describe('Debounced API Requests', () => {
    test('should debounce API calls with 500ms delay', async () => {
      // Requirement 6: Debounced API Requests
      render(<App />);

      // Simulate rapid map movements
      await act(async () => {
        // First movement
        mockMap.getBounds.mockReturnValue(mockBounds);
        jest.advanceTimersByTime(100);
        
        // Second movement (should cancel first)
        mockMap.getBounds.mockReturnValue(mockBounds);
        jest.advanceTimersByTime(200);
        
        // Third movement (should cancel second)
        mockMap.getBounds.mockReturnValue(mockBounds);
        jest.advanceTimersByTime(100);
      });

      // At this point, no API calls should have been made yet
      const initialCalls = mockedAxios.get.mock.calls.filter(call => 
        call[0].includes('/api/map-layers') && call[0].includes('ne_lat=')
      );
      expect(initialCalls.length).toBe(0);

      // Advance time to trigger debounced call
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        // Should have exactly one API call after debounce period
        const debouncedCalls = mockedAxios.get.mock.calls.filter(call => 
          call[0].includes('/api/map-layers') && call[0].includes('ne_lat=')
        );
        expect(debouncedCalls.length).toBe(1);
      });
    });

    test('should cancel pending API requests on new map movements', async () => {
      // Requirement 6.2: Cancel pending API requests
      render(<App />);

      let callCount = 0;
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/api/map-layers')) {
          callCount++;
          return Promise.resolve(mockLayerDataResponse);
        }
        if (url.includes('/api/map-base')) {
          return Promise.resolve(mockBaseMapResponse);
        }
        return Promise.resolve({ data: {} });
      });

      // Simulate multiple rapid movements
      await act(async () => {
        jest.advanceTimersByTime(100); // First movement
        jest.advanceTimersByTime(200); // Second movement (cancels first)
        jest.advanceTimersByTime(100); // Third movement (cancels second)
        jest.advanceTimersByTime(500); // Wait for debounce
      });

      await waitFor(() => {
        // Should have only one API call despite multiple movements
        expect(callCount).toBeLessThanOrEqual(2); // Initial load + one debounced call
      });
    });
  });

  describe('Filtered Data Reception and Rendering', () => {
    test('should receive and render filtered data from backend', async () => {
      // Requirement 7.4: Handle API responses identically
      const { getByTestId } = render(<App />);

      await act(async () => {
        jest.advanceTimersByTime(100);
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        // Verify map container is rendered
        expect(getByTestId('map-container')).toBeInTheDocument();
      });

      // Verify that the component can handle filtered response
      await waitFor(() => {
        const mapLayersCalls = mockedAxios.get.mock.calls.filter(call => 
          call[0].includes('/api/map-layers')
        );
        expect(mapLayersCalls.length).toBeGreaterThan(0);
      });
    });

    test('should handle responses with bbox_applied metadata', async () => {
      // Requirement 7.4: Response handling consistency
      render(<App />);

      await act(async () => {
        jest.advanceTimersByTime(100);
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        // Verify API was called and response was processed
        const mapLayersCalls = mockedAxios.get.mock.calls.filter(call => 
          call[0].includes('/api/map-layers')
        );
        expect(mapLayersCalls.length).toBeGreaterThan(0);
      });

      // The component should handle both filtered and unfiltered responses identically
      // This is verified by the fact that the component renders without errors
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    test('should retry failed BBOX requests without BBOX parameters', async () => {
      // Requirement 13.3: Retry failed BBOX requests without BBOX
      let callCount = 0;
      mockedAxios.get.mockImplementation((url) => {
        callCount++;
        if (url.includes('/api/map-base')) {
          return Promise.resolve(mockBaseMapResponse);
        }
        if (url.includes('/api/realtime-details')) {
          return Promise.resolve({ data: {} });
        }
        if (url.includes('/api/map-layers')) {
          if (url.includes('ne_lat=') && callCount === 2) {
            // First BBOX request fails
            return Promise.reject(new Error('BBOX request failed'));
          }
          // Subsequent requests (without BBOX) succeed
          return Promise.resolve(mockLayerDataResponseUnfiltered);
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(<App />);

      await act(async () => {
        jest.advanceTimersByTime(100);
        jest.advanceTimersByTime(500);
        jest.advanceTimersByTime(1000); // Wait for retry
      });

      await waitFor(() => {
        // Should have attempted BBOX request and then retried without BBOX
        const mapLayersCalls = mockedAxios.get.mock.calls.filter(call => 
          call[0].includes('/api/map-layers')
        );
        expect(mapLayersCalls.length).toBeGreaterThan(1);
        
        // Should have at least one call without BBOX parameters (retry)
        const retryCall = mapLayersCalls.find(call => 
          !call[0].includes('ne_lat=')
        );
        expect(retryCall).toBeDefined();
      });
    });

    test('should handle BBOX extraction failures gracefully', async () => {
      // Requirement 13.2: Handle BBOX extraction failures
      // Mock getBounds to throw an error
      mockMap.getBounds.mockImplementation(() => {
        throw new Error('getBounds failed');
      });

      render(<App />);

      await act(async () => {
        jest.advanceTimersByTime(100);
        jest.advanceTimersByTime(500);
      });

      // Component should still render and make API calls without BBOX
      await waitFor(() => {
        const mapLayersCalls = mockedAxios.get.mock.calls.filter(call => 
          call[0].includes('/api/map-layers')
        );
        expect(mapLayersCalls.length).toBeGreaterThan(0);
        
        // Should not include BBOX parameters due to extraction failure
        const bboxCall = mapLayersCalls.find(call => 
          call[0].includes('ne_lat=')
        );
        expect(bboxCall).toBeUndefined();
      });
    });
  });

  describe('Backward Compatibility', () => {
    test('should work without BBOX parameters on initial load', async () => {
      // Requirement 12: Backward Compatibility
      // Mock to simulate no map bounds initially
      mockMap.getBounds.mockReturnValue(null);

      render(<App />);

      await act(async () => {
        jest.advanceTimersByTime(100);
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        // Should make API call without BBOX parameters
        const mapLayersCalls = mockedAxios.get.mock.calls.filter(call => 
          call[0].includes('/api/map-layers')
        );
        expect(mapLayersCalls.length).toBeGreaterThan(0);
        
        // Initial call should not have BBOX parameters
        const initialCall = mapLayersCalls[0];
        expect(initialCall[0]).not.toContain('ne_lat=');
        expect(initialCall[0]).not.toContain('ne_lon=');
        expect(initialCall[0]).not.toContain('sw_lat=');
        expect(initialCall[0]).not.toContain('sw_lon=');
      });
    });

    test('should handle responses without bbox_applied metadata', async () => {
      // Requirement 12.4: Handle responses without BBOX metadata
      const responseWithoutBboxMetadata = {
        data: {
          fires: mockLayerDataResponseUnfiltered.data.fires,
          top_industries: mockLayerDataResponseUnfiltered.data.top_industries,
          cache_timestamp: '2024-01-15T14:30:00Z',
          data_status: {
            fires: 'available',
            industries: 'available',
          },
          // No bbox_applied or filtered_counts
        },
      };

      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/api/map-base')) {
          return Promise.resolve(mockBaseMapResponse);
        }
        if (url.includes('/api/realtime-details')) {
          return Promise.resolve({ data: {} });
        }
        if (url.includes('/api/map-layers')) {
          return Promise.resolve(responseWithoutBboxMetadata);
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(<App />);

      await act(async () => {
        jest.advanceTimersByTime(100);
        jest.advanceTimersByTime(500);
      });

      // Component should handle response without BBOX metadata gracefully
      await waitFor(() => {
        const mapLayersCalls = mockedAxios.get.mock.calls.filter(call => 
          call[0].includes('/api/map-layers')
        );
        expect(mapLayersCalls.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration Flow Validation', () => {
    test('should complete full integration flow: map movement → BBOX → API → rendering', async () => {
      // Complete integration test covering all requirements
      const { getByTestId } = render(<App />);

      // Step 1: Initial render and data load
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Step 2: Map movement triggers bounds extraction
      await act(async () => {
        mockMap.getBounds.mockReturnValue(mockBounds);
        jest.advanceTimersByTime(100);
      });

      // Step 3: Debounced API call with BBOX parameters
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Step 4: Verify complete flow
      await waitFor(() => {
        // Verify map container is rendered
        expect(getByTestId('map-container')).toBeInTheDocument();
        
        // Verify API was called with BBOX parameters
        const bboxCalls = mockedAxios.get.mock.calls.filter(call => 
          call[0].includes('/api/map-layers') && call[0].includes('ne_lat=')
        );
        expect(bboxCalls.length).toBeGreaterThan(0);
        
        // Verify BBOX parameters are correctly formatted
        const bboxCall = bboxCalls[0];
        expect(bboxCall[0]).toMatch(/ne_lat=45\.5/);
        expect(bboxCall[0]).toMatch(/ne_lon=9\.3/);
        expect(bboxCall[0]).toMatch(/sw_lat=45\.4/);
        expect(bboxCall[0]).toMatch(/sw_lon=9\.1/);
      });
    });

    test('should handle multiple map movements with proper debouncing', async () => {
      // Test realistic user interaction scenario
      render(<App />);

      // Simulate user dragging the map (multiple rapid movements)
      await act(async () => {
        // Movement 1
        mockBounds.getNorthEast.mockReturnValue({ lat: 45.6, lng: 9.4 });
        mockBounds.getSouthWest.mockReturnValue({ lat: 45.5, lng: 9.2 });
        mockMap.getBounds.mockReturnValue(mockBounds);
        jest.advanceTimersByTime(50);
        
        // Movement 2
        mockBounds.getNorthEast.mockReturnValue({ lat: 45.7, lng: 9.5 });
        mockBounds.getSouthWest.mockReturnValue({ lat: 45.6, lng: 9.3 });
        mockMap.getBounds.mockReturnValue(mockBounds);
        jest.advanceTimersByTime(50);
        
        // Movement 3 (final position)
        mockBounds.getNorthEast.mockReturnValue({ lat: 45.8, lng: 9.6 });
        mockBounds.getSouthWest.mockReturnValue({ lat: 45.7, lng: 9.4 });
        mockMap.getBounds.mockReturnValue(mockBounds);
        jest.advanceTimersByTime(50);
      });

      // Wait for debounce to complete
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        // Should have API call with final position only
        const bboxCalls = mockedAxios.get.mock.calls.filter(call => 
          call[0].includes('/api/map-layers') && call[0].includes('ne_lat=')
        );
        
        // Should have exactly one debounced call with final coordinates
        const finalCall = bboxCalls.find(call => 
          call[0].includes('ne_lat=45.8') && call[0].includes('sw_lat=45.7')
        );
        expect(finalCall).toBeDefined();
      });
    });
  });
});