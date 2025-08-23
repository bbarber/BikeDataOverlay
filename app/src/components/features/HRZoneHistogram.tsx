import React, { useMemo } from 'react';
import { useAppState } from '../../store/AppContext';
import { HR_ZONES, calculateHRZones, formatZoneRange, formatTime } from '../../config/HRZoneConfig';

const HRZoneHistogram: React.FC = () => {
  const { state } = useAppState();

  const hrZones = useMemo(() => 
    calculateHRZones(state.hrConfig.age, state.hrConfig.restingHR),
    [state.hrConfig.age, state.hrConfig.restingHR]
  );

  // Calculate total time and percentages
  const totalTime = useMemo(() => {
    return Object.values(state.hrAnalytics.zoneTimes).reduce((sum, time) => sum + time, 0);
  }, [state.hrAnalytics.zoneTimes]);

  const zoneData = useMemo(() => {
    return HR_ZONES.map((zone) => {
      const zoneTime = state.hrAnalytics.zoneTimes[`zone${zone.id}` as keyof typeof state.hrAnalytics.zoneTimes];
      const percentage = totalTime > 0 ? (zoneTime / totalTime) * 100 : 0;
      const zoneConfig = hrZones.find(z => z.id === zone.id)!;
      
      return {
        ...zone,
        time: zoneTime,
        percentage: Math.round(percentage),
        range: formatZoneRange(zoneConfig),
        formattedTime: formatTime(Math.floor(zoneTime / 1000))
      };
    });
  }, [hrZones, state.hrAnalytics.zoneTimes, totalTime]);

  return (
    <div className="zone-histogram">
      <h4>Time in Each Zone</h4>
      <div className="histogram-container">
        {zoneData.map((zone) => (
          <div key={zone.id} className="histogram-bar-container" data-zone={zone.id}>
            <div 
              className={`histogram-bar ${zone.color}`} 
              style={{ height: `${zone.percentage}%` }}
            >
              <div className="bar-value">{zone.percentage}%</div>
            </div>
            <div className="zone-label">
              <div className="zone-name">Zone {zone.id}</div>
              <div className="zone-time">{zone.formattedTime}</div>
              <div className="zone-range">{zone.range}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HRZoneHistogram;