import { EventEmitter } from 'events';
import { CyclingMetrics, BluetoothDevice } from '../types/CyclingMetrics';
export declare class BluetoothService extends EventEmitter {
    private isConnected;
    private connectedDeviceName;
    private connectedDevices;
    private discoveredDevices;
    private currentMetrics;
    private ftmsService;
    private isScanning;
    private scanTimeout;
    private simulationInterval;
    constructor();
    private initializeNoble;
    private handleDeviceDiscovered;
    scanForDevices(timeoutMs?: number): Promise<BluetoothDevice[]>;
    connectToDevice(deviceId: string): Promise<boolean>;
    private setupDeviceServices;
    private setupFTMSService;
    private updateConnectionStatus;
    scanAndConnect(): Promise<boolean>;
    private startSimulationMode;
    disconnect(): Promise<void>;
    getCurrentMetrics(): CyclingMetrics;
    getConnectionStatus(): {
        isConnected: boolean;
        deviceName: string | null;
        timestamp: string;
    };
    getConnectedDevicesCount(): number;
}
