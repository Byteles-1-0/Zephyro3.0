# Custom Hooks

This directory contains custom React hooks for the Smart Map application.

## useMapBounds

A custom hook that tracks the visible map bounds and converts them to BBOX format for API requests.

### Purpose

This hook is part of the BBOX spatial filtering feature. It listens to map movement events and extracts the current viewport boundaries, which can then be used to request only the data visible in the current map view.

### Requirements

- **5.1**: Uses Leaflet's `useMapEvents` hook to listen for `moveend` event
- **5.2**: Extracts map bounds using `map.getBounds()`
- **5.3**: Converts bounds to BBOX format (ne_lat, ne_lon, sw_lat, sw_lon)
- **5.4**: Stores current BBOX in component state

### Usage

The hook must be used within a React Leaflet component that is a child of `MapContainer`:

```javascript
import { useMapBounds } from './hooks';

function MapBoundsTracker({ onBoundsChange }) {
  const bbox = useMapBounds();
  
  useEffect(() => {
    if (bbox) {
      console.log('Current BBOX:', bbox);
      // Trigger API call with bbox parameters
      onBoundsChange(bbox);
    }
  }, [bbox, onBoundsChange]);
  
  return null; // This is a utility component
}

// In your App component:
function App() {
  const handleBoundsChange = (bbox) => {
    // Make API call with bbox parameters
    fetchLayerData(bbox);
  };
  
  return (
    <MapContainer center={[42.5, 12.5]} zoom={6}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapBoundsTracker onBoundsChange={handleBoundsChange} />
      {/* Other map components */}
    </MapContainer>
  );
}
```

### Return Value

The hook returns an object with the following structure, or `null` if bounds haven't been extracted yet:

```javascript
{
  ne_lat: number,  // Northeast corner latitude
  ne_lon: number,  // Northeast corner longitude
  sw_lat: number,  // Southwest corner latitude
  sw_lon: number   // Southwest corner longitude
}
```

### Error Handling

If an error occurs while extracting bounds (e.g., map not initialized), the hook returns `null` and logs the error to the console. This allows the application to gracefully degrade by making API requests without BBOX parameters.

### Integration with Debouncing

This hook should be used in conjunction with a debouncing mechanism to prevent excessive API calls during rapid map movements. See task 7.1 for the `useDebouncedCallback` hook implementation.

### Testing

Unit tests are provided in `useMapBounds.test.js` that verify:
- Correct BBOX format conversion
- Handling of edge case coordinates (±90° lat, ±180° lon)
- Proper handling of antimeridian crossing
- Validation that ne_lat >= sw_lat

Integration tests should be added when the hook is wired into the App component to verify:
- Map movement triggers bounds extraction
- State updates correctly
- Error handling works as expected
