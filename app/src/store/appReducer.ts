import { AppState, AppAction } from '../types/AppState';
import { DEFAULT_HR_CONFIG } from '../config/HRZoneConfig';
import { produce } from 'immer';

export const initialState: AppState = {
  metrics: {
    watts: 0,
    heartRate: 0,
    cadence: 0,
    speed: 0,
    distance: 0,
    timestamp: Date.now()
  },
  timer: {
    startTime: null,
    elapsedTime: 0,
    isRunning: false
  },
  hrConfig: DEFAULT_HR_CONFIG,
  hrAnalytics: {
    currentZone: 1,
    hasValidHeartRate: false,
    zoneTrackingStartTime: null,
    zoneTimes: {
      zone1: 0,
      zone2: 0,
      zone3: 0,
      zone4: 0,
      zone5: 0
    }
  },
  hrDataPoints: [],
  devices: {
    isScanning: false,
    showAllDevices: false,
    testMode: false,
    deviceList: [],
    connectedDevice: null
  },
  ui: {
    settingsPanelVisible: false,
    analyticsVisible: false,
    activeTab: 'devices'
  }
};

export function appReducer(state: AppState, action: AppAction): AppState {
  return produce(state, (draft) => {
    switch (action.type) {
      case 'UPDATE_METRICS':
        draft.metrics = action.payload;
        break;

      case 'START_TIMER':
        draft.timer.isRunning = true;
        draft.timer.startTime = Date.now() - draft.timer.elapsedTime;
        break;

      case 'STOP_TIMER':
        draft.timer.isRunning = false;
        draft.timer.elapsedTime = draft.timer.startTime 
          ? Date.now() - draft.timer.startTime 
          : draft.timer.elapsedTime;
        break;

      case 'RESET_TIMER':
        draft.timer.startTime = null;
        draft.timer.elapsedTime = 0;
        draft.timer.isRunning = false;
        draft.hrAnalytics.zoneTrackingStartTime = null;
        draft.hrAnalytics.zoneTimes = {
          zone1: 0,
          zone2: 0,
          zone3: 0,
          zone4: 0,
          zone5: 0
        };
        draft.hrDataPoints = [];
        break;

      case 'UPDATE_TIMER_DISPLAY':
        if (!draft.timer.isRunning) break;
        const newElapsedTime = draft.timer.startTime 
          ? Date.now() - draft.timer.startTime 
          : draft.timer.elapsedTime;
        
        // Only update if the elapsed time has actually changed significantly (prevent unnecessary re-renders)
        if (Math.abs(newElapsedTime - draft.timer.elapsedTime) < 50) {
          break;
        }
        
        draft.timer.elapsedTime = newElapsedTime;
        break;

      case 'UPDATE_HR_CONFIG':
        Object.assign(draft.hrConfig, action.payload);
        break;

      case 'TOGGLE_SETTINGS_PANEL':
        const newSettingsVisible = !draft.ui.settingsPanelVisible;
        draft.ui.settingsPanelVisible = newSettingsVisible;
        // Close analytics panel when opening settings
        if (newSettingsVisible) {
          draft.ui.analyticsVisible = false;
        }
        break;

      case 'CLOSE_SETTINGS_PANEL':
        draft.ui.settingsPanelVisible = false;
        break;

      case 'TOGGLE_ANALYTICS_PANEL':
        const newAnalyticsVisible = !draft.ui.analyticsVisible;
        draft.ui.analyticsVisible = newAnalyticsVisible;
        // Close settings panel when opening analytics
        if (newAnalyticsVisible) {
          draft.ui.settingsPanelVisible = false;
        }
        break;

      case 'CLOSE_ANALYTICS_PANEL':
        draft.ui.analyticsVisible = false;
        break;

      case 'SWITCH_TAB':
        draft.ui.activeTab = action.payload;
        break;

      case 'TOGGLE_SHOW_ALL_DEVICES':
        draft.devices.showAllDevices = !draft.devices.showAllDevices;
        break;

      case 'TOGGLE_TEST_MODE':
        draft.devices.testMode = !draft.devices.testMode;
        break;

      case 'SET_TEST_MODE':
        draft.devices.testMode = action.payload;
        break;

      case 'SET_SHOW_ALL_DEVICES':
        draft.devices.showAllDevices = action.payload;
        break;

      case 'START_SCANNING':
        draft.devices.isScanning = true;
        break;

      case 'STOP_SCANNING':
        draft.devices.isScanning = false;
        break;

      case 'UPDATE_DEVICE_LIST':
        draft.devices.deviceList = action.payload;
        break;

      case 'UPDATE_HR_ANALYTICS':
        Object.assign(draft.hrAnalytics, action.payload);
        break;

      case 'ADD_HR_DATA_POINT':
        draft.hrDataPoints.push(action.payload);
        // Keep only the last 1000 data points for performance
        if (draft.hrDataPoints.length > 1000) {
          draft.hrDataPoints.shift();
        }
        break;
    }
  });
}