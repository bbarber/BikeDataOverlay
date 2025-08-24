import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, AppAction } from '../types/AppState';
import { appReducer, initialState } from './appReducer';

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load saved configuration from localStorage and sync with Electron backend on mount
  useEffect(() => {
    const initializeApp = async () => {
      // Load HR configuration from localStorage
      const savedHrConfig = localStorage.getItem('bikeDataHrConfig');
      if (savedHrConfig) {
        try {
          const hrConfig = JSON.parse(savedHrConfig);
          dispatch({ type: 'UPDATE_HR_CONFIG', payload: hrConfig });
        } catch (error) {
          console.error('Error loading HR config:', error);
        }
      }

      // Sync device settings with Electron backend
      if (window.electronAPI) {
        try {
          // Get current backend state for test mode and show all devices
          const [testMode, showAllDevices] = await Promise.all([
            window.electronAPI.getTestMode(),
            window.electronAPI.getShowAllDevices()
          ]);

          // Update local state to match backend (use initial values instead of state)
          if (testMode) {
            dispatch({ type: 'SET_TEST_MODE', payload: testMode });
          }
          if (showAllDevices) {
            dispatch({ type: 'SET_SHOW_ALL_DEVICES', payload: showAllDevices });
          }
        } catch (error) {
          console.error('Error syncing with Electron backend:', error);
          // Fallback to localStorage if backend sync fails
          const savedShowAllDevices = localStorage.getItem('bikeDataShowAllDevices');
          if (savedShowAllDevices === 'true') {
            dispatch({ type: 'TOGGLE_SHOW_ALL_DEVICES' });
          }

          const savedTestMode = localStorage.getItem('bikeDataTestMode');
          if (savedTestMode === 'true') {
            dispatch({ type: 'TOGGLE_TEST_MODE' });
          }
        }
      }
    };

    initializeApp();
  }, []);

  // Save configuration to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('bikeDataHrConfig', JSON.stringify(state.hrConfig));
  }, [state.hrConfig]);

  useEffect(() => {
    localStorage.setItem('bikeDataShowAllDevices', state.devices.showAllDevices.toString());
  }, [state.devices.showAllDevices]);

  useEffect(() => {
    localStorage.setItem('bikeDataTestMode', state.devices.testMode.toString());
  }, [state.devices.testMode]);

  // Timer update effect - reduced frequency to prevent UI blocking
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (state.timer.isRunning) {
      intervalId = setInterval(() => {
        dispatch({ type: 'UPDATE_TIMER_DISPLAY' });
      }, 1000); // Update every 1 second to prevent blocking UI interactions
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [state.timer.isRunning]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppState = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
};