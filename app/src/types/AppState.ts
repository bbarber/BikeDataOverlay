import { CyclingMetrics } from './CyclingMetrics';

// Timer State
export interface TimerState {
  startTime: number | null;
  elapsedTime: number;
  isRunning: boolean;
}

// HR Zone Configuration
export interface HRConfig {
  age: number;
  restingHR: number;
  targetZone: number;
}

// HR Zone Analytics
export interface HRZoneAnalytics {
  currentZone: number;
  hasValidHeartRate: boolean;
  zoneTrackingStartTime: number | null;
  zoneTimes: {
    zone1: number;
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
  };
}

// HR Chart Data Point
export interface HRDataPoint {
  timestamp: number;
  heartRate: number;
  zone: number;
}

// Device State
export interface DeviceState {
  isScanning: boolean;
  showAllDevices: boolean;
  testMode: boolean;
  deviceList: any[];
  connectedDevice: string | null;
}

// UI State
export interface UIState {
  settingsPanelVisible: boolean;
  analyticsVisible: boolean;
  activeTab: string;
}

// Main App State
export interface AppState {
  metrics: CyclingMetrics;
  timer: TimerState;
  hrConfig: HRConfig;
  hrAnalytics: HRZoneAnalytics;
  hrDataPoints: HRDataPoint[];
  devices: DeviceState;
  ui: UIState;
}

// Action Types
export type AppAction =
  | { type: 'UPDATE_METRICS'; payload: CyclingMetrics }
  | { type: 'START_TIMER' }
  | { type: 'STOP_TIMER' }
  | { type: 'RESET_TIMER' }
  | { type: 'UPDATE_TIMER_DISPLAY' }
  | { type: 'UPDATE_HR_CONFIG'; payload: Partial<HRConfig> }
  | { type: 'TOGGLE_SETTINGS_PANEL' }
  | { type: 'CLOSE_SETTINGS_PANEL' }
  | { type: 'TOGGLE_ANALYTICS_PANEL' }
  | { type: 'CLOSE_ANALYTICS_PANEL' }
  | { type: 'SWITCH_TAB'; payload: string }
  | { type: 'TOGGLE_SHOW_ALL_DEVICES' }
  | { type: 'SET_SHOW_ALL_DEVICES'; payload: boolean }
  | { type: 'TOGGLE_TEST_MODE' }
  | { type: 'SET_TEST_MODE'; payload: boolean }
  | { type: 'START_SCANNING' }
  | { type: 'STOP_SCANNING' }
  | { type: 'UPDATE_DEVICE_LIST'; payload: any[] }
  | { type: 'UPDATE_HR_ANALYTICS'; payload: Partial<HRZoneAnalytics> }
  | { type: 'ADD_HR_DATA_POINT'; payload: HRDataPoint };