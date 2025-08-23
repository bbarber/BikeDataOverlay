import React, { useCallback } from 'react';
import { useAppState } from '../../store/AppContext';
import Button from '../ui/Button';
import HRZoneHistogram from './HRZoneHistogram';
import HRChart from './HRChart';

const AnalyticsPanel: React.FC = () => {
  const { state, dispatch } = useAppState();

  const handleClosePanel = useCallback(() => {
    dispatch({ type: 'CLOSE_ANALYTICS_PANEL' });
  }, [dispatch]);

  if (!state.ui.analyticsVisible) {
    return null;
  }

  const hasHRData = state.hrDataPoints.length > 0;

  return (
    <div className="hr-analytics-panel visible">
      <div className="analytics-panel-header">
        <h3>HR Zone Analytics</h3>
        <Button className="close-btn" onClick={handleClosePanel}>
          ×
        </Button>
      </div>
      
      <div className="analytics-panel-content">
        {hasHRData ? (
          <>
            <HRZoneHistogram />
            
            <h4>Heart Rate Chart</h4>
            <HRChart />
          </>
        ) : (
          <div className="analytics-empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">No HR Data Yet</div>
            <div className="empty-message">
              Start your session and connect a heart rate monitor to see zone analytics.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPanel;