# useDebouncedCallback Hook

## Overview

The `useDebouncedCallback` hook provides a way to delay the execution of a callback function until after a specified delay period has elapsed since the last time it was invoked. This is particularly useful for optimizing performance when handling rapid user interactions like map panning, search input, or window resizing.

## Features

- ✅ **Configurable Delay**: Set custom delay periods (default: 500ms)
- ✅ **Automatic Cancellation**: Cancels pending callbacks when invoked again within the delay period
- ✅ **Cleanup on Unmount**: Automatically cleans up pending callbacks when the component unmounts
- ✅ **Multiple Arguments**: Supports callbacks with any number of arguments
- ✅ **Dependency Support**: Allows specifying dependencies to ensure the callback has access to latest values

## Requirements Satisfied

- **Requirement 6.1**: Implements 500ms debounce delay (configurable)
- **Requirement 6.2**: Cancels pending callbacks on new invocations
- **Requirement 6.3**: Triggers exactly one callback after delay period
- **Requirement 6.4**: Cleans up pending callbacks on component unmount

## API

```javascript
const debouncedCallback = useDebouncedCallback(callback, delay, dependencies);
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `callback` | Function | Yes | - | The function to debounce |
| `delay` | Number | No | 500 | Delay in milliseconds before executing the callback |
| `dependencies` | Array | No | [] | Dependency array for useCallback (similar to useEffect) |

### Returns

Returns a debounced version of the callback function that can be called multiple times but will only execute once after the delay period.

## Usage Examples

### Basic Usage

```javascript
import { useDebouncedCallback } from './hooks';

function MyComponent() {
  const debouncedSave = useDebouncedCallback(
    (data) => {
      console.log('Saving:', data);
      // API call here
    },
    500,
    []
  );

  return (
    <button onClick={() => debouncedSave({ foo: 'bar' })}>
      Save
    </button>
  );
}
```

### Map Movement (Primary Use Case)

```javascript
import { useDebouncedCallback, useMapBounds } from './hooks';

function MapComponent() {
  const bbox = useMapBounds();
  
  const debouncedFetch = useDebouncedCallback(
    (bboxParams) => {
      fetch(`/api/map-layers?ne_lat=${bboxParams.ne_lat}&...`)
        .then(response => response.json())
        .then(data => console.log(data));
    },
    500,
    []
  );

  useEffect(() => {
    if (bbox) {
      debouncedFetch(bbox);
    }
  }, [bbox, debouncedFetch]);

  return <div>Map content...</div>;
}
```

### Search Input

```javascript
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');

  const debouncedSearch = useDebouncedCallback(
    (term) => {
      fetch(`/api/search?q=${term}`)
        .then(response => response.json())
        .then(results => console.log(results));
    },
    500,
    []
  );

  const handleChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  return <input value={searchTerm} onChange={handleChange} />;
}
```

### With Dependencies

```javascript
function CalculatorComponent() {
  const [multiplier, setMultiplier] = useState(2);

  const debouncedCalculate = useDebouncedCallback(
    (value) => {
      const result = value * multiplier;
      console.log(`Result: ${result}`);
    },
    500,
    [multiplier] // Include multiplier as dependency
  );

  return (
    <input
      type="number"
      onChange={(e) => debouncedCalculate(Number(e.target.value))}
    />
  );
}
```

## Behavior

### Debouncing Flow

1. **First Call**: When the debounced function is called, it starts a timer for the specified delay
2. **Subsequent Calls**: If called again before the delay expires, the previous timer is cancelled and a new timer starts
3. **Execution**: After the delay expires without any new calls, the callback executes with the arguments from the last call
4. **Cleanup**: If the component unmounts before the delay expires, the pending callback is cancelled

### Visual Timeline

```
Time:     0ms   100ms  200ms  300ms  400ms  500ms  600ms  700ms  800ms
Call:     A     B      C                                   Execute C
Timer:    [----X[----X[------------------------]
          ^    ^     ^                         ^
          |    |     |                         |
          |    |     |                         Callback executes with args from C
          |    |     Timer restarted
          |    Timer cancelled and restarted
          Timer started
```

## Testing

The hook includes comprehensive unit tests covering:

- ✅ Delay before execution
- ✅ Cancellation of pending callbacks
- ✅ Exactly one execution after delay
- ✅ Cleanup on unmount
- ✅ Multiple arguments handling
- ✅ Default and custom delays
- ✅ Multiple separate calls
- ✅ Dependency updates
- ✅ Rapid successive calls

Run tests with:

```bash
npm test -- --testPathPattern=useDebouncedCallback
```

## Performance Considerations

### Benefits

- **Reduces API Calls**: Prevents excessive API requests during rapid user interactions
- **Improves Responsiveness**: Reduces unnecessary computations and re-renders
- **Network Efficiency**: Minimizes network traffic by batching rapid changes

### Best Practices

1. **Choose Appropriate Delay**: 
   - 200-300ms for quick feedback (search suggestions)
   - 500ms for API calls (map movement, form autosave)
   - 1000ms+ for expensive operations (complex calculations)

2. **Use Dependencies Wisely**: Include values from component scope that the callback needs to access

3. **Avoid Over-Debouncing**: Don't debounce everything - only use for operations that benefit from it

4. **Consider User Experience**: Balance between responsiveness and performance

## Common Pitfalls

### ❌ Incorrect: Creating debounced function inside render

```javascript
function MyComponent() {
  // This creates a new debounced function on every render!
  const debouncedFn = useDebouncedCallback(() => {}, 500, []);
  // ...
}
```

### ✅ Correct: Stable debounced function

```javascript
function MyComponent() {
  // This creates a stable debounced function
  const debouncedFn = useDebouncedCallback(
    () => {},
    500,
    [] // Empty dependencies for stable reference
  );
  // ...
}
```

### ❌ Incorrect: Missing dependencies

```javascript
function MyComponent() {
  const [multiplier, setMultiplier] = useState(2);
  
  // multiplier will be stale!
  const debouncedCalc = useDebouncedCallback(
    (val) => console.log(val * multiplier),
    500,
    [] // Missing multiplier dependency
  );
}
```

### ✅ Correct: Including dependencies

```javascript
function MyComponent() {
  const [multiplier, setMultiplier] = useState(2);
  
  const debouncedCalc = useDebouncedCallback(
    (val) => console.log(val * multiplier),
    500,
    [multiplier] // Include multiplier
  );
}
```

## Related Hooks

- **useMapBounds**: Tracks map bounds and provides BBOX parameters
- **useCallback**: React's built-in hook for memoizing callbacks (no debouncing)
- **useEffect**: React's built-in hook for side effects

## Implementation Details

The hook uses:
- `useRef` to store the timeout ID and latest callback
- `useCallback` to create a stable debounced function reference
- `useEffect` for cleanup on unmount
- `setTimeout` and `clearTimeout` for the debouncing mechanism

## Browser Compatibility

Works in all modern browsers that support React 18+ and ES6 features:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

Part of the Smart Map (Mappa Intelligente) project.
