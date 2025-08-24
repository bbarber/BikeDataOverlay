import { calculateHRZones, HR_ZONES, formatTime, formatZoneRange } from '../config/HRZoneConfig';

describe('Histogram Calculations', () => {
  describe('Percentage Calculations', () => {
    it('should calculate correct percentages when all zones have equal time', () => {
      const zoneTimes = {
        zone1: 60000, // 1 minute each
        zone2: 60000,
        zone3: 60000,
        zone4: 60000,
        zone5: 60000
      };

      const totalTime = Object.values(zoneTimes).reduce((sum, time) => sum + time, 0);
      expect(totalTime).toBe(300000); // 5 minutes total

      // Each zone should be 20%
      HR_ZONES.forEach((zone) => {
        const zoneTime = zoneTimes[`zone${zone.id}` as keyof typeof zoneTimes];
        const percentage = totalTime > 0 ? (zoneTime / totalTime) * 100 : 0;
        expect(percentage).toBe(20);
      });
    });

    it('should calculate correct percentages with varied zone times', () => {
      const zoneTimes = {
        zone1: 120000, // 2 minutes (40%)
        zone2: 90000,  // 1.5 minutes (30%)
        zone3: 60000,  // 1 minute (20%)
        zone4: 30000,  // 0.5 minutes (10%)
        zone5: 0       // 0 minutes (0%)
      };

      const totalTime = Object.values(zoneTimes).reduce((sum, time) => sum + time, 0);
      expect(totalTime).toBe(300000); // 5 minutes total

      const expectedPercentages = [40, 30, 20, 10, 0];
      
      HR_ZONES.forEach((zone, index) => {
        const zoneTime = zoneTimes[`zone${zone.id}` as keyof typeof zoneTimes];
        const percentage = totalTime > 0 ? (zoneTime / totalTime) * 100 : 0;
        expect(percentage).toBe(expectedPercentages[index]);
      });
    });

    it('should handle zero total time', () => {
      const zoneTimes = {
        zone1: 0,
        zone2: 0,
        zone3: 0,
        zone4: 0,
        zone5: 0
      };

      const totalTime = Object.values(zoneTimes).reduce((sum, time) => sum + time, 0);
      expect(totalTime).toBe(0);

      HR_ZONES.forEach((zone) => {
        const zoneTime = zoneTimes[`zone${zone.id}` as keyof typeof zoneTimes];
        const percentage = totalTime > 0 ? (zoneTime / totalTime) * 100 : 0;
        expect(percentage).toBe(0);
      });
    });

    it('should handle single zone with all time', () => {
      const zoneTimes = {
        zone1: 0,
        zone2: 300000, // 5 minutes (100%)
        zone3: 0,
        zone4: 0,
        zone5: 0
      };

      const totalTime = Object.values(zoneTimes).reduce((sum, time) => sum + time, 0);
      expect(totalTime).toBe(300000);

      const expectedPercentages = [0, 100, 0, 0, 0];
      
      HR_ZONES.forEach((zone, index) => {
        const zoneTime = zoneTimes[`zone${zone.id}` as keyof typeof zoneTimes];
        const percentage = totalTime > 0 ? (zoneTime / totalTime) * 100 : 0;
        expect(percentage).toBe(expectedPercentages[index]);
      });
    });

    it('should sum to 100% for valid data', () => {
      const zoneTimes = {
        zone1: 45000,  // 45 seconds
        zone2: 75000,  // 75 seconds  
        zone3: 120000, // 120 seconds
        zone4: 30000,  // 30 seconds
        zone5: 30000   // 30 seconds
      };

      const totalTime = Object.values(zoneTimes).reduce((sum, time) => sum + time, 0);
      let totalPercentage = 0;

      HR_ZONES.forEach((zone) => {
        const zoneTime = zoneTimes[`zone${zone.id}` as keyof typeof zoneTimes];
        const percentage = totalTime > 0 ? (zoneTime / totalTime) * 100 : 0;
        totalPercentage += percentage;
      });

      expect(totalPercentage).toBe(100);
    });
  });

  describe('Display Logic', () => {
    it('should apply minimum display percentage for very small values', () => {
      const zoneTimes = {
        zone1: 100,     // 0.1 seconds (very small)
        zone2: 999900,  // 999.9 seconds (most time)
        zone3: 0,
        zone4: 0,
        zone5: 0
      };

      const totalTime = Object.values(zoneTimes).reduce((sum, time) => sum + time, 0);
      
      const zone1Time = zoneTimes.zone1;
      const percentage = (zone1Time / totalTime) * 100;
      expect(percentage).toBeLessThan(0.1);

      // Logic from HRZoneHistogram component
      const displayPercentage = percentage > 0 && percentage < 0.1 ? 0.1 : Math.round(percentage * 10) / 10;
      expect(displayPercentage).toBe(0.1);
    });

    it('should apply minimum bar height for visibility', () => {
      const zoneTimes = {
        zone1: 1000,    // 1 second (very small)
        zone2: 999000,  // 999 seconds (most time)
        zone3: 0,
        zone4: 0,
        zone5: 0
      };

      const totalTime = Object.values(zoneTimes).reduce((sum, time) => sum + time, 0);
      
      const zone1Time = zoneTimes.zone1;
      const percentage = (zone1Time / totalTime) * 100;
      
      // Logic from HRZoneHistogram component
      const barHeight = percentage > 0 ? Math.max(3, percentage) : 0;
      expect(barHeight).toBe(3); // Minimum 3% for visibility
    });

    it('should not apply minimum bar height for zero time', () => {
      const zoneTimes = {
        zone1: 0,       // No time
        zone2: 1000000, // All time
        zone3: 0,
        zone4: 0,
        zone5: 0
      };

      const totalTime = Object.values(zoneTimes).reduce((sum, time) => sum + time, 0);
      
      const zone1Time = zoneTimes.zone1;
      const percentage = (zone1Time / totalTime) * 100;
      expect(percentage).toBe(0);
      
      // Logic from HRZoneHistogram component
      const barHeight = percentage > 0 ? Math.max(3, percentage) : 0;
      expect(barHeight).toBe(0); // No minimum for zero time
    });
  });

  describe('HR Zone Configuration', () => {
    it('should calculate zones correctly for default values', () => {
      const age = 30;
      const restingHR = 60;
      const zones = calculateHRZones(age, restingHR);

      expect(zones).toHaveLength(5);
      
      // Zone 1: 50-60% = 60 + (130 * 0.5) to 60 + (130 * 0.6) = 125 to 138
      expect(zones[0].min).toBe(125);
      expect(zones[0].max).toBe(138);
      
      // Zone 2: 60-70% = 60 + (130 * 0.6) to 60 + (130 * 0.7) = 138 to 151
      expect(zones[1].min).toBe(138);
      expect(zones[1].max).toBe(151);
      
      // Zone 5: 90-100% = 60 + (130 * 0.9) to 60 + (130 * 1.0) = 177 to 190
      expect(zones[4].min).toBe(177);
      expect(zones[4].max).toBe(190);
    });

    it('should handle different ages and resting heart rates', () => {
      const youngAge = 20;
      const oldAge = 50;
      const lowRestingHR = 50;
      const highRestingHR = 80;

      const youngZones = calculateHRZones(youngAge, lowRestingHR);
      const oldZones = calculateHRZones(oldAge, highRestingHR);

      // Younger person should have higher max HR
      expect(youngZones[4].max).toBeGreaterThan(oldZones[4].max);
      
      // Person with higher resting HR should have higher zone ranges
      const sameAgeHighResting = calculateHRZones(youngAge, highRestingHR);
      expect(sameAgeHighResting[0].min).toBeGreaterThan(youngZones[0].min);
    });
  });

  describe('Utility Functions', () => {
    it('should format time correctly', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(30)).toBe('00:30');
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(90)).toBe('01:30');
      expect(formatTime(3661)).toBe('61:01'); // Over 1 hour
    });

    it('should format zone range correctly', () => {
      const zone = { min: 125, max: 138 };
      expect(formatZoneRange(zone)).toBe('125-138 BPM');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle realistic workout data', () => {
      // Simulating a 1-hour endurance workout
      const zoneTimes = {
        zone1: 300000,  // 5 minutes warmup (8.33%)
        zone2: 2400000, // 40 minutes main (66.67%)
        zone3: 900000,  // 15 minutes intervals (25%)
        zone4: 0,       // 0 minutes (0%)
        zone5: 0        // 0 minutes (0%)
      };

      const totalTime = Object.values(zoneTimes).reduce((sum, time) => sum + time, 0);
      expect(totalTime).toBe(3600000); // 1 hour in milliseconds

      const zone2Percentage = (zoneTimes.zone2 / totalTime) * 100;
      expect(Math.round(zone2Percentage * 10) / 10).toBe(66.7); // 66.7%
    });

    it('should handle high-intensity interval training', () => {
      // Simulating HIIT session
      const zoneTimes = {
        zone1: 600000,  // 10 minutes warmup/cooldown (33.33%)
        zone2: 300000,  // 5 minutes easy (16.67%)
        zone3: 300000,  // 5 minutes moderate (16.67%)
        zone4: 600000,  // 10 minutes hard (33.33%)
        zone5: 0        // 0 minutes maximal (0%)
      };

      const totalTime = Object.values(zoneTimes).reduce((sum, time) => sum + time, 0);
      let totalPercentage = 0;

      HR_ZONES.forEach((zone) => {
        const zoneTime = zoneTimes[`zone${zone.id}` as keyof typeof zoneTimes];
        const percentage = totalTime > 0 ? (zoneTime / totalTime) * 100 : 0;
        totalPercentage += percentage;
      });

      expect(Math.round(totalPercentage)).toBe(100);
    });
  });
});