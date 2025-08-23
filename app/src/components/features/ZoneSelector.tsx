import React from 'react';
import { useAppState } from '../../store/AppContext';
import { HR_ZONES, calculateHRZones, formatZoneRange } from '../../config/HRZoneConfig';

const ZoneSelector: React.FC = () => {
  const { state, dispatch } = useAppState();

  const hrZones = calculateHRZones(state.hrConfig.age, state.hrConfig.restingHR);

  const handleZoneChange = (zoneId: number) => {
    dispatch({ 
      type: 'UPDATE_HR_CONFIG', 
      payload: { targetZone: zoneId } 
    });
  };

  return (
    <div className="zone-selector">
      {HR_ZONES.map((zone) => {
        const zoneData = hrZones.find(z => z.id === zone.id)!;
        const isChecked = state.hrConfig.targetZone === zone.id;
        
        return (
          <div key={zone.id} className="zone-option" data-zone={zone.id}>
            <input 
              type="radio" 
              id={`zone${zone.id}`} 
              name="targetZone" 
              value={zone.id}
              checked={isChecked}
              onChange={() => handleZoneChange(zone.id)}
            />
            <label htmlFor={`zone${zone.id}`}>
              <span className="zone-name">{zone.name}</span>
              <span className="zone-range">
                {formatZoneRange(zoneData)}
              </span>
              <span className="zone-desc">{zone.description}</span>
            </label>
          </div>
        );
      })}
    </div>
  );
};

export default ZoneSelector;