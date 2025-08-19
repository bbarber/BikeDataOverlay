import { EventEmitter } from 'events';
import noble from '@abandonware/noble';
import {
  DeviceInfo,
  BluetoothData,
  NoblePeripheral,
  NobleCharacteristic
} from './types';

const HEART_RATE_SERVICE = '180d';
const CYCLING_POWER_SERVICE = '1818';
const BATTERY_SERVICE = '180f';
const HEART_RATE_MEASUREMENT = '2a37';

class BleService extends EventEmitter {
  private devices: Map<string, DeviceInfo & { peripheral: NoblePeripheral }>;
  private isScanning: boolean;
  private connected: boolean;
  private connectedDevice: (DeviceInfo & { peripheral: NoblePeripheral }) | null;
  private heartRateCharacteristic: NobleCharacteristic | null;

  constructor() {
    super();
    this.devices = new Map();
    this.isScanning = false;
    this.connected = false;
    this.connectedDevice = null;
    this.heartRateCharacteristic = null;
    this._onDiscover = this._onDiscover.bind(this);
  }

  async init(): Promise<boolean> {
    if (noble._state === 'poweredOn') return true;
    
    return new Promise<boolean>((resolve) => {
      noble.once('stateChange', (state: string) => {
        resolve(state === 'poweredOn');
      });
    });
  }

  async startScan(): Promise<void> {
    if (this.isScanning) return;
    
    this.isScanning = true;
    this.devices.clear();
    noble.on('discover', this._onDiscover);
    
    try {
      await noble.startScanning([HEART_RATE_SERVICE, CYCLING_POWER_SERVICE, BATTERY_SERVICE], true);
      this.emit('scan-started');
    } catch (error) {
      this.isScanning = false;
      noble.removeListener('discover', this._onDiscover);
      throw error;
    }
  }

  async stopScan(): Promise<void> {
    if (!this.isScanning) return;
    
    this.isScanning = false;
    try {
      await noble.stopScanning();
    } catch (error) {
      console.warn('Error stopping scan:', error);
    }
    
    noble.removeListener('discover', this._onDiscover);
    this.emit('scan-stopped', this.getDevices());
  }

  private _onDiscover(peripheral: NoblePeripheral): void {
    const id = peripheral.id;
    if (this.devices.has(id)) return;

    const services = peripheral.advertisement.serviceUuids || [];
    const isHr = services.includes(HEART_RATE_SERVICE);
    const isCp = services.includes(CYCLING_POWER_SERVICE);

    const deviceInfo: DeviceInfo & { peripheral: NoblePeripheral } = {
      id,
      name: peripheral.advertisement.localName || 'Unknown Device',
      type: isHr ? 'Heart Rate Monitor' : (isCp ? 'Cycling Power Meter' : 'Other Device'),
      status: 'Available',
      canConnect: peripheral.connectable,
      isConnected: false,
      deviceInfo: {
        manufacturer: this._getManufacturerFromName(peripheral.advertisement.localName),
        model: this._getModelFromName(peripheral.advertisement.localName),
        type: isHr ? 'Heart Rate Monitor' : (isCp ? 'Cycling Power Meter' : 'Other Device')
      },
      rssi: peripheral.rssi,
      services,
      peripheral
    };

    this.devices.set(id, deviceInfo);
    this.emit('device', this._publicDevice(deviceInfo));
  }

  private _publicDevice(device: DeviceInfo & { peripheral: NoblePeripheral }): DeviceInfo {
    const { peripheral, ...rest } = device;
    return rest;
  }

  getDevices(): DeviceInfo[] {
    return Array.from(this.devices.values()).map(d => this._publicDevice(d));
  }

  async connectToDevice(id: string): Promise<void> {
    const device = this.devices.get(id);
    if (!device) {
      throw new Error('Device not found');
    }
    
    if (this.connected) {
      await this.disconnectDevice();
    }

    try {
      await device.peripheral.connectAsync();
      this.connected = true;
      this.connectedDevice = device;
      device.isConnected = true;
      device.status = 'Connected';
      this.emit('connected', this._publicDevice(device));

      const { characteristics } = await device.peripheral.discoverAllServicesAndCharacteristicsAsync();
      const hrChar = characteristics.find(c => c.uuid.toLowerCase() === HEART_RATE_MEASUREMENT);
      
      if (hrChar) {
        this.heartRateCharacteristic = hrChar;
        await hrChar.subscribeAsync();
        hrChar.on('data', (data: Buffer) => {
          this._handleHeartRateData(data);
        });
      }
    } catch (error) {
      device.status = 'Error';
      this.connected = false;
      this.connectedDevice = null;
      throw error;
    }
  }

  async disconnectDevice(): Promise<void> {
    if (!this.connected || !this.connectedDevice) return;

    try {
      if (this.heartRateCharacteristic) {
        this.heartRateCharacteristic.off('data', this._handleHeartRateData.bind(this));
        this.heartRateCharacteristic = null;
      }

      // Note: noble doesn't have disconnectAsync, we just remove listeners
      // The peripheral will disconnect automatically when out of scope
      this.connectedDevice.isConnected = false;
      this.connectedDevice.status = 'Disconnected';
      this.emit('disconnected', this._publicDevice(this.connectedDevice));
    } catch (error) {
      console.warn('Error disconnecting device:', error);
    } finally {
      this.connected = false;
      this.connectedDevice = null;
    }
  }

  private _handleHeartRateData(data: Buffer): void {
    try {
      // Parse heart rate data according to BLE specification
      const flags = data.readUInt8(0);
      const isUint16 = (flags & 0x01) !== 0;
      const heartRate = isUint16 ? data.readUInt16LE(1) : data.readUInt8(1);
      
      const payload: BluetoothData = {
        type: 'heartRate',
        value: heartRate,
        timestamp: Date.now(),
        deviceId: this.connectedDevice?.id || 'unknown'
      };
      
      this.emit('data', payload);
    } catch (error) {
      console.error('Error parsing heart rate data:', error);
    }
  }

  private _getManufacturerFromName(name?: string): string {
    if (!name) return 'Unknown';
    
    // Simple manufacturer detection based on common names
    const lowerName = name.toLowerCase();
    if (lowerName.includes('coospo')) return 'COOSPO';
    if (lowerName.includes('wahoo')) return 'Wahoo';
    if (lowerName.includes('garmin')) return 'Garmin';
    if (lowerName.includes('polar')) return 'Polar';
    if (lowerName.includes('suunto')) return 'Suunto';
    
    return 'Unknown';
  }

  private _getModelFromName(name?: string): string {
    if (!name) return 'Unknown';
    
    // Extract model from name
    const parts = name.split(/\s+/);
    if (parts.length > 1) {
      return parts[parts.length - 1];
    }
    
    return name;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectedDevice(): DeviceInfo | null {
    return this.connectedDevice ? this._publicDevice(this.connectedDevice) : null;
  }
}

export default BleService;
