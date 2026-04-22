import { useEffect } from 'react';
import useMapBounds from './useMapBounds';

/**
 * Example component demonstrating how to use the useMapBounds hook
 * 
 * This component should be placed inside a MapContainer as a child component.
 * It tracks map bounds and triggers a callback whenever the bounds change.
 * 
 * Example usage in App.js:
 * 
 * <MapContainer center={[42.5, 12.5]} zoom={6}>
 *   <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
 *   <MapBoundsTracker onBoundsChange={handleBoundsChange} />
 *   {/* Other map components *\/}
 * </MapContainer>
 */
function MapBoundsTracker({ onBoundsChange }) {
  // Extract current map bounds
  const bbox = useMapBounds();
  
  // Trigger callback when bounds change
  useEffect(() => {
    if (bbox && onBoundsChange) {
      onBoundsChange(bbox);
    }
  }, [bbox, onBoundsChange]);
  
  // This is a utility component - it doesn't render anything
  return null;
}

export default MapBoundsTracker;

/**
 * Example callback handler in parent component:
 * 
 * const handleBoundsChange = useCallback((bbox) => {
 *   console.log('Map bounds changed:', bbox);
 *   // Example: Trigger debounced API call
 *   debouncedFetchLayerData(bbox);
 * }, [debouncedFetchLayerData]);
 * 
 * Example API call with BBOX parameters:
 * 
 * const fetchLayerData = async (bbox) => {
 *   const params = new URLSearchParams();
 *   if (bbox) {
 *     params.append('ne_lat', bbox.ne_lat);
 *     params.append('ne_lon', bbox.ne_lon);
 *     params.append('sw_lat', bbox.sw_lat);
 *     params.append('sw_lon', bbox.sw_lon);
 *   }
 *   
 *   const response = await axios.get(
 *     `${API_BASE_URL}/map-layers?${params.toString()}`
 *   );
 *   
 *   // Process response...
 * };
 */
