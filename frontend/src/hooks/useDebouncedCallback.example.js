/**
 * Example usage of useDebouncedCallback hook
 * 
 * This file demonstrates how to use the useDebouncedCallback hook
 * in various scenarios, particularly for debouncing API calls during
 * map movement.
 */

import React, { useEffect, useState } from 'react';
import { useDebouncedCallback, useMapBounds } from './index';

/**
 * Example 1: Basic debounced API call
 * 
 * This example shows how to debounce an API call when the map moves.
 * The API call will only be triggered 500ms after the user stops moving the map.
 */
function Example1_BasicDebounce() {
  const [data, setData] = useState(null);
  const bbox = useMapBounds();

  // Create a debounced version of the fetch function
  const debouncedFetch = useDebouncedCallback(
    (bboxParams) => {
      console.log('Fetching data with BBOX:', bboxParams);
      fetch(`/api/map-layers?ne_lat=${bboxParams.ne_lat}&ne_lon=${bboxParams.ne_lon}&sw_lat=${bboxParams.sw_lat}&sw_lon=${bboxParams.sw_lon}`)
        .then(response => response.json())
        .then(data => setData(data))
        .catch(error => console.error('Error fetching data:', error));
    },
    500, // 500ms delay
    []   // No dependencies
  );

  // Trigger debounced fetch when bbox changes
  useEffect(() => {
    if (bbox) {
      debouncedFetch(bbox);
    }
  }, [bbox, debouncedFetch]);

  return (
    <div>
      <h3>Map Data</h3>
      {data ? (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

/**
 * Example 2: Debounced search input
 * 
 * This example shows how to debounce a search input field.
 * The search will only be triggered 500ms after the user stops typing.
 */
function Example2_DebouncedSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);

  const debouncedSearch = useDebouncedCallback(
    (term) => {
      console.log('Searching for:', term);
      // Simulate API call
      fetch(`/api/search?q=${encodeURIComponent(term)}`)
        .then(response => response.json())
        .then(data => setResults(data))
        .catch(error => console.error('Search error:', error));
    },
    500,
    []
  );

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        placeholder="Search..."
      />
      <ul>
        {results.map((result, index) => (
          <li key={index}>{result}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example 3: Custom delay
 * 
 * This example shows how to use a custom delay value.
 * Useful when you need different debounce times for different actions.
 */
function Example3_CustomDelay() {
  const [value, setValue] = useState('');

  // Short delay for quick feedback
  const debouncedQuickAction = useDebouncedCallback(
    (val) => {
      console.log('Quick action:', val);
    },
    200, // 200ms delay
    []
  );

  // Long delay for expensive operations
  const debouncedExpensiveAction = useDebouncedCallback(
    (val) => {
      console.log('Expensive action:', val);
    },
    1000, // 1000ms delay
    []
  );

  const handleChange = (e) => {
    const val = e.target.value;
    setValue(val);
    debouncedQuickAction(val);
    debouncedExpensiveAction(val);
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder="Type something..."
    />
  );
}

/**
 * Example 4: With dependencies
 * 
 * This example shows how to use dependencies to ensure the debounced
 * callback has access to the latest values from the component scope.
 */
function Example4_WithDependencies() {
  const [multiplier, setMultiplier] = useState(1);
  const [value, setValue] = useState(0);

  const debouncedCalculation = useDebouncedCallback(
    (val) => {
      const result = val * multiplier;
      console.log(`${val} × ${multiplier} = ${result}`);
    },
    500,
    [multiplier] // Include multiplier as dependency
  );

  return (
    <div>
      <input
        type="number"
        value={multiplier}
        onChange={(e) => setMultiplier(Number(e.target.value))}
        placeholder="Multiplier"
      />
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const val = Number(e.target.value);
          setValue(val);
          debouncedCalculation(val);
        }}
        placeholder="Value"
      />
    </div>
  );
}

/**
 * Example 5: Real-world map integration
 * 
 * This example shows the complete integration with map bounds tracking
 * and API calls, as used in the BBOX spatial filtering feature.
 */
function Example5_MapIntegration() {
  const [layerData, setLayerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const bbox = useMapBounds();

  const fetchLayerData = async (bboxParams) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        ne_lat: bboxParams.ne_lat,
        ne_lon: bboxParams.ne_lon,
        sw_lat: bboxParams.sw_lat,
        sw_lon: bboxParams.sw_lon
      });

      const response = await fetch(`/api/map-layers?${queryParams}`);
      const data = await response.json();
      setLayerData(data);
    } catch (error) {
      console.error('Error fetching layer data:', error);
      // Retry without BBOX on error (graceful degradation)
      try {
        const response = await fetch('/api/map-layers');
        const data = await response.json();
        setLayerData(data);
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounce the API call to prevent spam during map movement
  const debouncedFetchLayerData = useDebouncedCallback(
    fetchLayerData,
    500,
    []
  );

  // Trigger fetch when bbox changes
  useEffect(() => {
    if (bbox) {
      debouncedFetchLayerData(bbox);
    }
  }, [bbox, debouncedFetchLayerData]);

  return (
    <div>
      {loading && <div className="loading-indicator">Loading...</div>}
      {layerData && (
        <div>
          <p>Industries: {layerData.top_industries?.length || 0}</p>
          <p>Fires: {layerData.fires?.length || 0}</p>
          {layerData.bbox_applied && (
            <p>BBOX filtering applied</p>
          )}
        </div>
      )}
    </div>
  );
}

export {
  Example1_BasicDebounce,
  Example2_DebouncedSearch,
  Example3_CustomDelay,
  Example4_WithDependencies,
  Example5_MapIntegration
};
