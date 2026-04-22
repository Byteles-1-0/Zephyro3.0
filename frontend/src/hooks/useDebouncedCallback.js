import { useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for debounced callbacks
 * 
 * This hook delays callback execution by a specified delay period.
 * If the callback is invoked again within the delay period, the previous
 * pending callback is cancelled and a new delay period begins.
 * 
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds (default: 500)
 * @param {Array} dependencies - Dependency array for useCallback
 * 
 * @returns {Function} Debounced callback function
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * 
 * Behavior:
 *   - Requirement 6.1: Delays callback execution by 'delay' milliseconds
 *   - Requirement 6.2: Cancels pending callbacks if called again within delay
 *   - Requirement 6.3: Triggers exactly one callback after delay period
 *   - Requirement 6.4: Cleans up pending callbacks on unmount
 * 
 * Usage:
 *   const debouncedFetch = useDebouncedCallback(
 *     (bbox) => {
 *       fetchLayerData(bbox);
 *     },
 *     500,
 *     []
 *   );
 *   
 *   // Call multiple times rapidly
 *   debouncedFetch(bbox1); // Cancelled
 *   debouncedFetch(bbox2); // Cancelled
 *   debouncedFetch(bbox3); // Executes after 500ms
 */
function useDebouncedCallback(callback, delay = 500, dependencies = []) {
  // Store timeout ID to allow cancellation
  const timeoutRef = useRef(null);
  
  // Store the latest callback to avoid stale closures
  const callbackRef = useRef(callback);
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Create the debounced function
  const debouncedCallback = useCallback(
    (...args) => {
      // Requirement 6.2: Cancel pending callbacks on new invocations
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Requirement 6.1: Implement delay before triggering callback
      // Requirement 6.3: Trigger exactly one callback after delay period
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timeoutRef.current = null;
      }, delay);
    },
    [delay, ...dependencies] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Requirement 6.4: Clean up pending callbacks on component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

export default useDebouncedCallback;
