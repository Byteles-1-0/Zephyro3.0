/**
 * Unit tests for useDebouncedCallback hook
 * 
 * These tests verify the debouncing behavior including:
 * - Delay before execution
 * - Cancellation of pending callbacks
 * - Cleanup on unmount
 */

import { renderHook, act } from '@testing-library/react';
import useDebouncedCallback from './useDebouncedCallback';

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should delay callback execution by specified delay', () => {
    // Requirement 6.1: Implement delay before triggering callback
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    // Call the debounced function
    act(() => {
      result.current('test-arg');
    });

    // Callback should not be called immediately
    expect(callback).not.toHaveBeenCalled();

    // Fast-forward time by 499ms (just before delay)
    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(callback).not.toHaveBeenCalled();

    // Fast-forward time by 1ms more (reaching 500ms)
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('test-arg');
  });

  it('should cancel pending callbacks on new invocations', () => {
    // Requirement 6.2: Cancel pending callbacks on new invocations
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    // First call
    act(() => {
      result.current('call-1');
    });

    // Advance time by 300ms (not enough to trigger)
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(callback).not.toHaveBeenCalled();

    // Second call (should cancel first)
    act(() => {
      result.current('call-2');
    });

    // Advance time by 300ms more (total 600ms from first call, but only 300ms from second)
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(callback).not.toHaveBeenCalled();

    // Advance time by 200ms more (500ms from second call)
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('call-2'); // Only second call executes
  });

  it('should trigger exactly one callback after delay period', () => {
    // Requirement 6.3: Trigger exactly one callback after delay period
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    // Multiple rapid calls
    act(() => {
      result.current('call-1');
      result.current('call-2');
      result.current('call-3');
    });

    // No calls yet
    expect(callback).not.toHaveBeenCalled();

    // Fast-forward past delay
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Only one call (the last one)
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('call-3');
  });

  it('should clean up pending callbacks on unmount', () => {
    // Requirement 6.4: Clean up pending callbacks on component unmount
    const callback = jest.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 500));

    // Call the debounced function
    act(() => {
      result.current('test-arg');
    });

    // Unmount before delay expires
    unmount();

    // Fast-forward past delay
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Callback should not be called after unmount
    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle multiple arguments correctly', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    act(() => {
      result.current('arg1', 'arg2', 'arg3');
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });

  it('should use default delay of 500ms when not specified', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback));

    act(() => {
      result.current();
    });

    // Should not execute before 500ms
    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(callback).not.toHaveBeenCalled();

    // Should execute at 500ms
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle custom delay values', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 1000));

    act(() => {
      result.current();
    });

    // Should not execute before 1000ms
    act(() => {
      jest.advanceTimersByTime(999);
    });
    expect(callback).not.toHaveBeenCalled();

    // Should execute at 1000ms
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should allow multiple separate debounced calls after delay', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    // First call
    act(() => {
      result.current('call-1');
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('call-1');

    // Second call (after first completed)
    act(() => {
      result.current('call-2');
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith('call-2');
  });

  it('should update callback when dependencies change', () => {
    let callbackValue = 'initial';
    const callback = jest.fn(() => callbackValue);
    
    const { result, rerender } = renderHook(
      ({ cb }) => useDebouncedCallback(cb, 500),
      { initialProps: { cb: callback } }
    );

    // First call
    act(() => {
      result.current();
    });

    // Update callback value
    callbackValue = 'updated';
    rerender({ cb: callback });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should use updated callback
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback()).toBe('updated');
  });

  it('should handle rapid successive calls correctly', () => {
    // Simulates rapid map movement scenario
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    // Simulate 10 rapid calls within 100ms
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current(`call-${i}`);
        jest.advanceTimersByTime(10);
      });
    }

    // No calls yet (only 100ms passed)
    expect(callback).not.toHaveBeenCalled();

    // Fast-forward to complete the delay from last call
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Only the last call should execute
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('call-9');
  });
});

/**
 * Integration test notes:
 * 
 * Full integration testing of this hook with map movement requires:
 * 1. Integration with useMapBounds hook
 * 2. Real map movement events
 * 3. API call verification
 * 
 * These tests should be added as part of the integration testing phase
 * when the hook is wired into the App component with actual API calls.
 */
