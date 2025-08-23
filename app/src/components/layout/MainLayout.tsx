import React, { useEffect, useMemo, useCallback } from 'react';
import { useAppState } from '../../store/AppContext';
import { useElectronAPI } from '../../hooks/useElectronAPI';
import { useMetricsStream } from '../../hooks/useMetricsStream';
import OverlayContainer from '../core/OverlayContainer';
import MetricDisplay from '../core/MetricDisplay';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import TimerControls from '../features/TimerControls';
import SettingsPanel from '../features/SettingsPanel';
import AnalyticsPanel from '../features/AnalyticsPanel';
import { formatTime } from '../../config/HRZoneConfig';
import { getHRZone } from '../../config/HRZoneConfig';

const MainLayout: React.FC = () => {
  const { state, dispatch } = useAppState();
  
  // Initialize Electron API and metrics stream
  useElectronAPI();
  useMetricsStream();

  const handleToggleSettings = useCallback(() => {
    dispatch({ type: 'TOGGLE_SETTINGS_PANEL' });
  }, [dispatch]);

  const handleToggleAnalytics = useCallback(() => {
    dispatch({ type: 'TOGGLE_ANALYTICS_PANEL' });
  }, [dispatch]);

  // Memoize computed values to avoid unnecessary recalculations
  const timerDisplay = useMemo(() => {
    const totalSeconds = Math.floor(state.timer.elapsedTime / 1000);
    return formatTime(totalSeconds);
  }, [state.timer.elapsedTime]);

  const hrZoneDisplay = useMemo(() => {
    const currentZone = getHRZone(
      state.metrics.heartRate, 
      state.hrConfig.age, 
      state.hrConfig.restingHR
    );
    return `Zone ${currentZone}`;
  }, [state.metrics.heartRate, state.hrConfig.age, state.hrConfig.restingHR]);

  const wattsDisplay = useMemo(() => {
    return state.metrics.watts || '--';
  }, [state.metrics.watts]);

  const heartRateDisplay = useMemo(() => {
    return state.metrics.heartRate || '--';
  }, [state.metrics.heartRate]);

  return (
    <div className="app">
      {/* Watts Display Container */}
      <OverlayContainer>
        <MetricDisplay 
          value={wattsDisplay} 
          label="WATTS" 
        />
        
        <Button 
          className="toggle-btn"
          onClick={handleToggleSettings}
        >
          <Icon name="settings" />
        </Button>
        
        <SettingsPanel />
      </OverlayContainer>
      
      {/* Heart Rate Display Container */}
      <OverlayContainer className="heart-rate-container">
        <MetricDisplay 
          value={heartRateDisplay} 
          label="BPM"
          extraLabel={hrZoneDisplay}
          extraLabelId="hrZoneLabel"
        />
        
        <Button 
          className="toggle-btn"
          onClick={handleToggleAnalytics}
        >
          <Icon name="analytics" />
        </Button>
        
        <AnalyticsPanel />
      </OverlayContainer>
      
      {/* Timer Display Container */}
      <OverlayContainer className="time-container">
        <MetricDisplay 
          value={timerDisplay} 
          label="TIME" 
        />
        
        <TimerControls />
      </OverlayContainer>
    </div>
  );
};

export default MainLayout;