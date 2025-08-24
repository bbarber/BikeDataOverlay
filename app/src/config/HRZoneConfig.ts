/**
 * Heart Rate Zone Configuration
 */

export interface HRZone {
  id: number;
  name: string;
  description: string;
  color: string;
  percentageMin: number;
  percentageMax: number;
}

export interface HRConfig {
  age: number;
  restingHR: number;
  targetZone: number;
}

export const HR_ZONES: HRZone[] = [
  {
    id: 1,
    name: 'Zone 1 - Recovery',
    description: 'Active recovery, very light',
    color: 'zone-1',
    percentageMin: 50,
    percentageMax: 60
  },
  {
    id: 2,
    name: 'Zone 2 - Aerobic',
    description: 'Fat burning, endurance',
    color: 'zone-2',
    percentageMin: 60,
    percentageMax: 70
  },
  {
    id: 3,
    name: 'Zone 3 - Moderate',
    description: 'Aerobic fitness',
    color: 'zone-3',
    percentageMin: 70,
    percentageMax: 80
  },
  {
    id: 4,
    name: 'Zone 4 - Hard',
    description: 'Lactate threshold',
    color: 'zone-4',
    percentageMin: 80,
    percentageMax: 90
  },
  {
    id: 5,
    name: 'Zone 5 - Maximal',
    description: 'VO2 max, very hard',
    color: 'zone-5',
    percentageMin: 90,
    percentageMax: 100
  }
];

export const DEFAULT_HR_CONFIG: HRConfig = {
  age: 30,
  restingHR: 60,
  targetZone: 2
};

/**
 * Calculate heart rate zones based on age and resting heart rate
 */
export function calculateHRZones(age: number, restingHR = 60) {
  const maxHR = 220 - age;
  const hrReserve = maxHR - restingHR;
  
  return HR_ZONES.map(zone => ({
    ...zone,
    min: Math.round(restingHR + (hrReserve * zone.percentageMin / 100)),
    max: Math.round(restingHR + (hrReserve * zone.percentageMax / 100))
  }));
}

/**
 * Get zone number for a given heart rate
 */
export function getHRZone(heartRate: number, age: number, restingHR = 60): number {
  const zones = calculateHRZones(age, restingHR);
  
  for (let i = 0; i < zones.length; i++) {
    if (heartRate <= zones[i].max) {
      return i + 1;
    }
  }
  
  return 5; // Max zone if above all ranges
}

/**
 * Format HR zone range as string
 */
export function formatZoneRange(zone: { min: number; max: number }): string {
  return `${zone.min}-${zone.max} BPM`;
}

/**
 * Format time duration in MM:SS format
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}