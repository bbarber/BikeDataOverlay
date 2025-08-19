export interface CyclingMetrics {
  watts: number;
  cadence: number;
  speed: number;
  heartRate: number;
  timestamp: string;
}

export interface DeviceInfo {
  manufacturerName?: string;
  modelNumber?: string;
  serialNumber?: string;
  firmwareRevision?: string;
  machineType?: string;
}

export interface BluetoothDevice {
  id: string;
  name: string;
  isConnected: boolean;
  deviceInfo?: DeviceInfo;
  services?: string[];
}

export interface ScanResult {
  success: boolean;
  deviceCount: number;
  devices: BluetoothDevice[];
  message: string;
  scanTimeout?: number;
  scanTimestamp?: string;
}

export interface ConnectionResult {
  success: boolean;
  isConnected: boolean;
  deviceName?: string;
  connectedDevices?: number;
  message: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  deviceName?: string | null;
  timestamp: string;
}