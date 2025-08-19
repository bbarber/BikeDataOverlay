// Core types for the BikeDataOverlay application

export interface DeviceInfo {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  canConnect: boolean;
  isConnected: boolean;
  deviceInfo: {
    manufacturer: string;
    model: string;
    type: DeviceType;
  };
  rssi: number;
  services: string[];
}

export type DeviceType = 'Heart Rate Monitor' | 'Cycling Power Meter' | 'Other Device';
export type DeviceStatus = 'Available' | 'Connected' | 'Disconnected' | 'Error';

export interface BluetoothData {
  type: 'power' | 'heartRate' | 'cadence' | 'speed';
  value: number;
  timestamp: number;
  deviceId: string;
}

export interface HeartRateData extends BluetoothData {
  type: 'heartRate';
  value: number; // BPM
}

export interface PowerData extends BluetoothData {
  type: 'power';
  value: number; // Watts
}

export interface CadenceData extends BluetoothData {
  type: 'cadence';
  value: number; // RPM
}

export interface SpeedData extends BluetoothData {
  type: 'speed';
  value: number; // km/h or mph
}

export interface CurrentMetrics {
  watts: number;
  heartRate: number;
  cadence: number;
  speed: number;
}

export interface HeartRateZone {
  zone: number;
  name: string;
  minHR: number;
  maxHR: number;
  description: string;
  color: string;
}

export interface HeartRateConfig {
  age: number;
  restingHR: number;
  targetZone: number;
}

export interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsedTime: number;
  totalTime: number;
}

export interface DevicePanelState {
  visible: boolean;
  isScanning: boolean;
  devices: DeviceInfo[];
}

export interface HRZonePanelState {
  visible: boolean;
  config: HeartRateConfig;
  zones: HeartRateZone[];
}

// BLE Service Events
export interface BLEServiceEvents {
  'device': (device: DeviceInfo) => void;
  'scan-started': () => void;
  'scan-stopped': (devices: DeviceInfo[]) => void;
  'connected': (device: DeviceInfo) => void;
  'disconnected': (device: DeviceInfo) => void;
  'data': (payload: BluetoothData) => void;
  'error': (error: Error) => void;
}

// IPC Message types
export interface IPCMessage {
  type: string;
  payload?: unknown;
}

export interface MouseEventMessage {
  type: 'set-ignore-mouse-events';
  ignore: boolean;
}

// Noble peripheral types
export interface NoblePeripheral {
  id: string;
  advertisement: {
    localName?: string;
    serviceUuids?: string[];
  };
  connectable: boolean;
  rssi: number;
  connectAsync(): Promise<void>;
  discoverAllServicesAndCharacteristicsAsync(): Promise<{
    services: NobleService[];
    characteristics: NobleCharacteristic[];
  }>;
}

export interface NobleService {
  uuid: string;
  characteristics: NobleCharacteristic[];
}

export interface NobleCharacteristic {
  uuid: string;
  properties: string[];
  subscribeAsync(): Promise<void>;
  on(event: 'data', listener: (data: Buffer) => void): void;
  off(event: 'data', listener: (data: Buffer) => void): void;
}

// UI Element types
export interface UIElement {
  id: string;
  element: HTMLElement;
  visible: boolean;
}

// Event handler types
export type EventHandler<T = Event> = (event: T) => void;
export type DeviceCallback = (device: DeviceInfo) => void;
export type DataCallback = (data: BluetoothData) => void;
export type ErrorCallback = (error: Error) => void;

// Configuration types
export interface AppConfig {
  overlayPosition: {
    x: number;
    y: number;
  };
  overlaySize: {
    width: number;
    height: number;
  };
  alwaysOnTop: boolean;
  transparent: boolean;
  skipTaskbar: boolean;
}

// Test types
export interface TestResult {
  passed: boolean;
  message: string;
  duration: number;
  error?: Error;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  totalDuration: number;
  passedCount: number;
  failedCount: number;
}
