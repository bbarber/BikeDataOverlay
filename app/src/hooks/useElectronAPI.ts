import { useEffect } from 'react';
import { useAppState } from '../store/AppContext';
import { CyclingMetrics } from '../types/CyclingMetrics';

export const useElectronAPI = () => {
  const { dispatch } = useAppState();

  useEffect(() => {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return;
    }

    // Listen for metrics updates from main process
    const metricsUnsubscribe = window.electronAPI.onMetricsUpdate((metrics: CyclingMetrics) => {
      dispatch({ type: 'UPDATE_METRICS', payload: metrics });
    });

    // Listen for connection status changes from main process  
    const connectionUnsubscribe = window.electronAPI.onConnectionStatusChanged((status: { isConnected: boolean; deviceName: string | null }) => {
      console.log('Connection status changed:', status);
      // You can dispatch connection status updates here if needed
    });

    // Cleanup listeners on unmount
    return () => {
      if (metricsUnsubscribe) metricsUnsubscribe();
      if (connectionUnsubscribe) connectionUnsubscribe();
    };
  }, [dispatch]);

  return {
    // Electron API methods
    getCurrentMetrics: async (): Promise<CyclingMetrics> => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.getCurrentMetrics();
    },
    
    scanForDevices: async () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.scanForDevices();
    },
    
    connectToDevice: async (deviceId: string) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.connectToDevice(deviceId);
    },
    
    disconnectFromDevice: async () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.disconnect();
    },
    
    getDeviceList: async () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.listDevices();
    },
    
    setTestMode: async (enabled: boolean) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.setTestMode(enabled);
    },
    
    getTestMode: async () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.getTestMode();
    },
    
    setShowAllDevices: async (showAll: boolean) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.setShowAllDevices(showAll);
    },
    
    getShowAllDevices: async () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.getShowAllDevices();
    }
  };
};