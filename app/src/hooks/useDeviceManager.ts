import { useCallback } from 'react';
import { useAppState } from '../store/AppContext';
import { useElectronAPI } from './useElectronAPI';

export const useDeviceManager = () => {
  const { state, dispatch } = useAppState();
  const electronAPI = useElectronAPI();

  const scanForDevices = useCallback(async () => {
    try {
      dispatch({ type: 'START_SCANNING' });
      const result = await electronAPI.scanForDevices();
      
      if (result.success) {
        console.log('Scan started successfully');
      } else {
        console.error('Scan failed:', result.message);
      }
    } catch (error) {
      console.error('Error starting scan:', error);
    } finally {
      // Stop scanning indicator after a delay
      setTimeout(() => {
        dispatch({ type: 'STOP_SCANNING' });
      }, 5000); // Stop after 5 seconds
    }
  }, [dispatch, electronAPI]);

  const refreshDeviceList = useCallback(async () => {
    try {
      const result = await electronAPI.getDeviceList();
      if (result.success) {
        dispatch({ type: 'UPDATE_DEVICE_LIST', payload: result.devices });
      } else {
        console.error('Failed to get device list:', result.message);
      }
    } catch (error) {
      console.error('Error refreshing device list:', error);
    }
  }, [dispatch, electronAPI]);

  const connectToDevice = useCallback(async (deviceId: string) => {
    try {
      const result = await electronAPI.connectToDevice(deviceId);
      if (result.success) {
        console.log('Connected to device:', deviceId);
        // Refresh device list to update connection status
        await refreshDeviceList();
      } else {
        console.error('Connection failed:', result.message);
      }
    } catch (error) {
      console.error('Error connecting to device:', error);
    }
  }, [electronAPI, refreshDeviceList]);

  const disconnectFromDevice = useCallback(async () => {
    try {
      const result = await electronAPI.disconnectFromDevice();
      if (result.success) {
        console.log('Disconnected from device');
        await refreshDeviceList();
      } else {
        console.error('Disconnection failed:', result.message);
      }
    } catch (error) {
      console.error('Error disconnecting from device:', error);
    }
  }, [electronAPI, refreshDeviceList]);

  const toggleShowAllDevices = useCallback(async () => {
    try {
      const newShowAllDevices = !state.devices.showAllDevices;
      const result = await electronAPI.setShowAllDevices(newShowAllDevices);
      if (result === newShowAllDevices) {
        dispatch({ type: 'TOGGLE_SHOW_ALL_DEVICES' });
        console.log(`Show all devices ${newShowAllDevices ? 'enabled' : 'disabled'}`);
      } else {
        console.error('Failed to toggle show all devices setting');
      }
    } catch (error) {
      console.error('Error toggling show all devices:', error);
    }
  }, [dispatch, electronAPI, state.devices.showAllDevices]);

  const toggleTestMode = useCallback(async () => {
    try {
      const newTestMode = !state.devices.testMode;
      const result = await electronAPI.setTestMode(newTestMode);
      if (result === newTestMode) {
        dispatch({ type: 'TOGGLE_TEST_MODE' });
        console.log(`Test mode ${newTestMode ? 'enabled' : 'disabled'}`);
      } else {
        console.error('Failed to toggle test mode');
      }
    } catch (error) {
      console.error('Error toggling test mode:', error);
    }
  }, [dispatch, electronAPI, state.devices.testMode]);

  return {
    devices: state.devices,
    scanForDevices,
    refreshDeviceList,
    connectToDevice,
    disconnectFromDevice,
    toggleShowAllDevices,
    toggleTestMode
  };
};