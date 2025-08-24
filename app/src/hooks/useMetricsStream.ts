import { useEffect, useRef } from 'react';
import { useAppState } from '../store/AppContext';
import { getHRZone } from '../config/HRZoneConfig';
import { HRDataPoint } from '../types/AppState';

export const useMetricsStream = () => {
  const { state, dispatch } = useAppState();
  const lastZoneUpdate = useRef<number>(0);
  const currentZone = useRef<number>(1);
  const hrConfigRef = useRef(state.hrConfig);
  const stateRef = useRef(state);

  // Update refs when state changes
  hrConfigRef.current = state.hrConfig;
  stateRef.current = state;

  useEffect(() => {
    // Start a metrics update interval for fallback data
    const metricsInterval = setInterval(async () => {
      try {
        if (window.electronAPI) {
          const metrics = await window.electronAPI.getCurrentMetrics();
          dispatch({ type: 'UPDATE_METRICS', payload: metrics });
          
          // Process HR data if available
          if (metrics.heartRate && metrics.heartRate > 0) {
            const zone = getHRZone(
              metrics.heartRate, 
              hrConfigRef.current.age, 
              hrConfigRef.current.restingHR
            );
            
            // Add HR data point
            const dataPoint: HRDataPoint = {
              timestamp: Date.now(),
              heartRate: metrics.heartRate,
              zone: zone
            };
            
            dispatch({ type: 'ADD_HR_DATA_POINT', payload: dataPoint });
            
            // Update zone tracking
            const now = Date.now();
            
            // Initialize tracking on first HR data
            if (lastZoneUpdate.current === 0) {
              lastZoneUpdate.current = now;
              currentZone.current = zone;
              
              // Update HR analytics for initial state
              dispatch({ 
                type: 'UPDATE_HR_ANALYTICS', 
                payload: { 
                  currentZone: zone, 
                  hasValidHeartRate: true 
                } 
              });
            } else {
              // Update time spent in current zone (whether zone changed or not)
              const timeSpent = now - lastZoneUpdate.current;
              const zoneKey = `zone${currentZone.current}` as keyof typeof stateRef.current.hrAnalytics.zoneTimes;
              const currentZoneTime = stateRef.current.hrAnalytics.zoneTimes[zoneKey];
              
              // Single dispatch with all updates combined
              dispatch({ 
                type: 'UPDATE_HR_ANALYTICS', 
                payload: { 
                  zoneTimes: {
                    ...stateRef.current.hrAnalytics.zoneTimes,
                    [zoneKey]: currentZoneTime + timeSpent
                  },
                  currentZone: zone, 
                  hasValidHeartRate: true 
                } 
              });
              
              // Update zone reference for next iteration
              if (currentZone.current !== zone) {
                currentZone.current = zone;
              }
              lastZoneUpdate.current = now;
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    }, 1000); // Update every second

    return () => {
      clearInterval(metricsInterval);
    };
  }, [dispatch]);
};