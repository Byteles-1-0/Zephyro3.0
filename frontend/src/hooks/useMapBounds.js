import { useState, useEffect } from 'react';
import { useMapEvents } from 'react-leaflet';

/**
 * Custom hook to track map bounds and extract BBOX parameters
 * 
 * This hook listens to the Leaflet map's 'moveend' event and extracts
 * the current visible bounds, converting them to BBOX format for API requests.
 * 
 * @returns {Object|null} Current BBOX parameters or null if not yet initialized
 *   - ne_lat: Northeast corner latitude
 *   - ne_lon: Northeast corner longitude
 *   - sw_lat: Southwest corner latitude
 *   - sw_lon: Southwest corner longitude
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 * 
 * Usage:
 *   function MapBoundsTracker() {
 *     const bbox = useMapBounds();
 *     
 *     useEffect(() => {
 *       if (bbox) {
 *         console.log('Current BBOX:', bbox);
 *         // Trigger API call with bbox parameters
 *       }
 *     }, [bbox]);
 *     
 *     return null; // This is a utility component
 *   }
 */
function useMapBounds() {
  const [bbox, setBbox] = useState(null);

  // Use Leaflet's useMapEvents to listen for map movement
  // Requirement 5.1: Use Leaflet's useMapEvents hook to listen for moveend event
  const map = useMapEvents({
    moveend: () => {
      try {
        // Requirement 5.2: Extract map bounds using map.getBounds()
        const bounds = map.getBounds();
        
        // Requirement 5.3: Convert bounds to BBOX format
        const bboxParams = {
          ne_lat: bounds.getNorthEast().lat,
          ne_lon: bounds.getNorthEast().lng,
          sw_lat: bounds.getSouthWest().lat,
          sw_lon: bounds.getSouthWest().lng
        };
        
        // Requirement 5.4: Store current BBOX in component state
        setBbox(bboxParams);
      } catch (error) {
        console.error('Error extracting map bounds:', error);
        // On error, set bbox to null to allow graceful degradation
        setBbox(null);
      }
    }
  });

  // Also extract initial bounds when the map is first loaded
  useEffect(() => {
    if (map) {
      try {
        const bounds = map.getBounds();
        const bboxParams = {
          ne_lat: bounds.getNorthEast().lat,
          ne_lon: bounds.getNorthEast().lng,
          sw_lat: bounds.getSouthWest().lat,
          sw_lon: bounds.getSouthWest().lng
        };
        setBbox(bboxParams);
      } catch (error) {
        console.error('Error extracting initial map bounds:', error);
        setBbox(null);
      }
    }
  }, [map]);

  return bbox;
}

export default useMapBounds;
