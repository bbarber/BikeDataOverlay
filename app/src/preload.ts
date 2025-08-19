// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import { CyclingMetrics, ScanResult, ConnectionResult, ConnectionStatus } from './types/CyclingMetrics';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Bluetooth API methods
  getCurrentMetrics: (): Promise<CyclingMetrics> => ipcRenderer.invoke('get-current-metrics'),
  getConnectionStatus: (): Promise<ConnectionStatus> => ipcRenderer.invoke('get-connection-status'),
  scanAndConnect: (): Promise<ConnectionResult> => ipcRenderer.invoke('scan-and-connect'),
  connectToDevice: (deviceId: string): Promise<ConnectionResult> => ipcRenderer.invoke('connect-to-device', deviceId),
  disconnect: (): Promise<ConnectionResult> => ipcRenderer.invoke('disconnect'),
  scanForDevices: (timeoutSeconds?: number): Promise<ScanResult> => ipcRenderer.invoke('scan-for-devices', timeoutSeconds),
  listDevices: (): Promise<ScanResult> => ipcRenderer.invoke('list-devices'),

  // Event listeners
  onMetricsUpdate: (callback: (metrics: CyclingMetrics) => void) => {
    const subscription = (event: any, metrics: CyclingMetrics) => callback(metrics);
    ipcRenderer.on('metrics-update', subscription);
    return () => ipcRenderer.removeListener('metrics-update', subscription);
  },
  
  onConnectionStatusChanged: (callback: (status: { isConnected: boolean; deviceName: string | null }) => void) => {
    const subscription = (event: any, status: { isConnected: boolean; deviceName: string | null }) => callback(status);
    ipcRenderer.on('connection-status-changed', subscription);
    return () => ipcRenderer.removeListener('connection-status-changed', subscription);
  }
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getCurrentMetrics(): Promise<CyclingMetrics>;
      getConnectionStatus(): Promise<ConnectionStatus>;
      scanAndConnect(): Promise<ConnectionResult>;
      connectToDevice(deviceId: string): Promise<ConnectionResult>;
      disconnect(): Promise<ConnectionResult>;
      scanForDevices(timeoutSeconds?: number): Promise<ScanResult>;
      listDevices(): Promise<ScanResult>;
      onMetricsUpdate(callback: (metrics: CyclingMetrics) => void): () => void;
      onConnectionStatusChanged(callback: (status: { isConnected: boolean; deviceName: string | null }) => void): () => void;
    };
  }
}