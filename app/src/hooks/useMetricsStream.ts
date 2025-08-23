import { useEffect, useRef } from 'react';
import { useAppState } from '../store/AppContext';
import { getHRZone } from '../config/HRZoneConfig';
import { HRDataPoint } from '../types/AppState';

export const useMetricsStream = () => {
  const { state, dispatch } = useAppState();
  const lastZoneUpdate = useRef<number>(0);
  const currentZone = useRef<number>(1);

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
              state.hrConfig.age, 
              state.hrConfig.restingHR
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
            if (currentZone.current !== zone) {
              // Zone changed - update time spent in previous zone
              if (lastZoneUpdate.current > 0) {
                const timeSpent = now - lastZoneUpdate.current;
                const zoneKey = `zone${currentZone.current}` as keyof typeof state.hrAnalytics.zoneTimes;
                const currentZoneTime = state.hrAnalytics.zoneTimes[zoneKey];
                
                dispatch({ 
                  type: 'UPDATE_HR_ANALYTICS', 
                  payload: { 
                    zoneTimes: {
                      ...state.hrAnalytics.zoneTimes,
                      [zoneKey]: currentZoneTime + timeSpent
                    }
                  } 
                });
              }
              
              currentZone.current = zone;
              lastZoneUpdate.current = now;
            }
            
            // Update HR analytics
            dispatch({ 
              type: 'UPDATE_HR_ANALYTICS', 
              payload: { 
                currentZone: zone, 
                hasValidHeartRate: true 
              } 
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    }, 1000); // Update every second

    return () => {
      clearInterval(metricsInterval);
    };
  }, [dispatch, state.hrConfig.age, state.hrConfig.restingHR]);
};