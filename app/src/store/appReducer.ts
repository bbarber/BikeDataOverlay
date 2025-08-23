import { AppState, AppAction } from '../types/AppState';
import { DEFAULT_HR_CONFIG } from '../config/HRZoneConfig';

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
  switch (action.type) {
    case 'UPDATE_METRICS':
      return {
        ...state,
        metrics: action.payload
      };

    case 'START_TIMER':
      return {
        ...state,
        timer: {
          ...state.timer,
          isRunning: true,
          startTime: Date.now() - state.timer.elapsedTime
        }
      };

    case 'STOP_TIMER':
      return {
        ...state,
        timer: {
          ...state.timer,
          isRunning: false,
          elapsedTime: state.timer.startTime 
            ? Date.now() - state.timer.startTime 
            : state.timer.elapsedTime
        }
      };

    case 'RESET_TIMER':
      return {
        ...state,
        timer: {
          startTime: null,
          elapsedTime: 0,
          isRunning: false
        },
        hrAnalytics: {
          ...state.hrAnalytics,
          zoneTrackingStartTime: null,
          zoneTimes: {
            zone1: 0,
            zone2: 0,
            zone3: 0,
            zone4: 0,
            zone5: 0
          }
        },
        hrDataPoints: []
      };

    case 'UPDATE_TIMER_DISPLAY':
      if (!state.timer.isRunning) return state;
      const newElapsedTime = state.timer.startTime 
        ? Date.now() - state.timer.startTime 
        : state.timer.elapsedTime;
      
      // Only update if the elapsed time has actually changed significantly (prevent unnecessary re-renders)
      if (Math.abs(newElapsedTime - state.timer.elapsedTime) < 50) {
        return state;
      }
      
      return {
        ...state,
        timer: {
          ...state.timer,
          elapsedTime: newElapsedTime
        }
      };

    case 'UPDATE_HR_CONFIG':
      return {
        ...state,
        hrConfig: {
          ...state.hrConfig,
          ...action.payload
        }
      };

    case 'TOGGLE_SETTINGS_PANEL':
      const newSettingsVisible = !state.ui.settingsPanelVisible;
      return {
        ...state,
        ui: {
          ...state.ui,
          settingsPanelVisible: newSettingsVisible,
          // Close analytics panel when opening settings
          analyticsVisible: newSettingsVisible ? false : state.ui.analyticsVisible
        }
      };

    case 'CLOSE_SETTINGS_PANEL':
      return {
        ...state,
        ui: {
          ...state.ui,
          settingsPanelVisible: false
        }
      };

    case 'TOGGLE_ANALYTICS_PANEL':
      const newAnalyticsVisible = !state.ui.analyticsVisible;
      return {
        ...state,
        ui: {
          ...state.ui,
          analyticsVisible: newAnalyticsVisible,
          // Close settings panel when opening analytics
          settingsPanelVisible: newAnalyticsVisible ? false : state.ui.settingsPanelVisible
        }
      };

    case 'CLOSE_ANALYTICS_PANEL':
      return {
        ...state,
        ui: {
          ...state.ui,
          analyticsVisible: false
        }
      };

    case 'SWITCH_TAB':
      return {
        ...state,
        ui: {
          ...state.ui,
          activeTab: action.payload
        }
      };

    case 'TOGGLE_SHOW_ALL_DEVICES':
      return {
        ...state,
        devices: {
          ...state.devices,
          showAllDevices: !state.devices.showAllDevices
        }
      };

    case 'TOGGLE_TEST_MODE':
      return {
        ...state,
        devices: {
          ...state.devices,
          testMode: !state.devices.testMode
        }
      };

    case 'SET_TEST_MODE':
      return {
        ...state,
        devices: {
          ...state.devices,
          testMode: action.payload
        }
      };

    case 'SET_SHOW_ALL_DEVICES':
      return {
        ...state,
        devices: {
          ...state.devices,
          showAllDevices: action.payload
        }
      };

    case 'START_SCANNING':
      return {
        ...state,
        devices: {
          ...state.devices,
          isScanning: true
        }
      };

    case 'STOP_SCANNING':
      return {
        ...state,
        devices: {
          ...state.devices,
          isScanning: false
        }
      };

    case 'UPDATE_DEVICE_LIST':
      return {
        ...state,
        devices: {
          ...state.devices,
          deviceList: action.payload
        }
      };

    case 'UPDATE_HR_ANALYTICS':
      return {
        ...state,
        hrAnalytics: {
          ...state.hrAnalytics,
          ...action.payload
        }
      };

    case 'ADD_HR_DATA_POINT':
      const newDataPoints = [...state.hrDataPoints, action.payload];
      // Keep only the last 1000 data points for performance
      if (newDataPoints.length > 1000) {
        newDataPoints.shift();
      }
      return {
        ...state,
        hrDataPoints: newDataPoints
      };

    default:
      return state;
  }
}