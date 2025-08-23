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

  // Load saved configuration from localStorage on mount
  useEffect(() => {
    // Load HR configuration
    const savedHrConfig = localStorage.getItem('bikeDataHrConfig');
    if (savedHrConfig) {
      try {
        const hrConfig = JSON.parse(savedHrConfig);
        dispatch({ type: 'UPDATE_HR_CONFIG', payload: hrConfig });
      } catch (error) {
        console.error('Error loading HR config:', error);
      }
    }

    // Load device settings
    const savedShowAllDevices = localStorage.getItem('bikeDataShowAllDevices');
    if (savedShowAllDevices === 'true') {
      dispatch({ type: 'TOGGLE_SHOW_ALL_DEVICES' });
    }

    const savedTestMode = localStorage.getItem('bikeDataTestMode');
    if (savedTestMode === 'true') {
      dispatch({ type: 'TOGGLE_TEST_MODE' });
    }
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

  // Timer update effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (state.timer.isRunning) {
      intervalId = setInterval(() => {
        dispatch({ type: 'UPDATE_TIMER_DISPLAY' });
      }, 100); // Update every 100ms for smooth display
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