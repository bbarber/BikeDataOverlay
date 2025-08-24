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
      
      // For display, show minimum 0.1% if there's any time in the zone (for better precision)
      // But for the bar height, use a minimum of 3% so it's visible
      const displayPercentage = percentage > 0 && percentage < 0.1 ? 0.1 : Math.round(percentage * 10) / 10;
      const barHeight = percentage > 0 ? Math.max(3, percentage) : 0;
      
      console.log('Zone:', zone);
      console.log('Zone Time:', zoneTime);
      console.log('Percentage:', percentage);
      console.log('Display Percentage:', displayPercentage);
      console.log('Bar Height:', barHeight);
      console.log('Zone Config:', zoneConfig);
      console.log('Range:', formatZoneRange(zoneConfig));
      console.log('Formatted Time:', formatTime(Math.floor(zoneTime / 1000)));

      return {
        ...zone,
        time: zoneTime,
        percentage: barHeight,
        displayPercentage,
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
              <div className="bar-value">{zone.displayPercentage}%</div>
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