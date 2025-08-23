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
        console.error('Scan failed:', result.error);
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
      const devices = await electronAPI.getDeviceList();
      dispatch({ type: 'UPDATE_DEVICE_LIST', payload: devices });
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
        console.error('Connection failed:', result.error);
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
        console.error('Disconnection failed:', result.error);
      }
    } catch (error) {
      console.error('Error disconnecting from device:', error);
    }
  }, [electronAPI, refreshDeviceList]);

  const toggleShowAllDevices = useCallback(() => {
    dispatch({ type: 'TOGGLE_SHOW_ALL_DEVICES' });
  }, [dispatch]);

  const toggleTestMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_TEST_MODE' });
  }, [dispatch]);

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