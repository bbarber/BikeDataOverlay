import noble from '@stoprocent/noble';
import { EventEmitter } from 'events';
import { FTMSService } from './FTMSService';
import { CyclingMetrics, BluetoothDevice } from '../types/CyclingMetrics';

interface NoblePeripheral {
  id: string;
  advertisement: {
    localName?: string;
    shortLocalName?: string;
    serviceUuids: string[];
  };
  state: string;
  connect(callback: (error?: Error) => void): void;
  disconnect(callback?: (error?: Error) => void): void;
  discoverServices(serviceUuids: string[], callback: (error?: Error, services?: any[]) => void): void;
  on(event: string, listener: (...args: any[]) => void): void;
}

interface DiscoveredDevice {
  id: string;
  name: string;
  peripheral: NoblePeripheral;
  isConnected: boolean;
  deviceInfo: any;
  services: string[];
}

export class BluetoothService extends EventEmitter {
  private isConnected = false;
  private connectedDeviceName: string | null = null;
  private connectedDevices = new Map<string, DiscoveredDevice>();
  private discoveredDevices = new Map<string, DiscoveredDevice>();
  private currentMetrics: CyclingMetrics = {
    watts: 0,
    cadence: 0,
    speed: 0,
    heartRate: 0,
    timestamp: new Date().toISOString()
  };
  
  private ftmsService: FTMSService;
  private isScanning = false;
  private scanTimeout: NodeJS.Timeout | null = null;
  private simulationInterval: NodeJS.Timeout | null = null;
  private showAllDevices = false;
  private testMode = false;
  private testDataInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    
    this.ftmsService = new FTMSService();
    this.ftmsService.on('metricsUpdate', (metrics) => {
      this.currentMetrics = {
        ...metrics,
        timestamp: new Date().toISOString()
      };
      this.emit('metricsUpdate', this.currentMetrics);
    });
    
    this.initializeNoble();
  }

  private initializeNoble(): void {
    noble.on('stateChange', (state: string) => {
      console.log('Bluetooth state changed to:', state);
      if (state === 'poweredOn') {
        console.log('Bluetooth is powered on and ready');
      } else {
        console.log('Bluetooth is not available:', state);
        if (this.isConnected) {
          this.disconnect();
        }
      }
    });

    noble.on('discover', (peripheral: NoblePeripheral) => {
      this.handleDeviceDiscovered(peripheral);
    });

    noble.on('scanStart', () => {
      console.log('Bluetooth scan started');
      this.isScanning = true;
    });

    noble.on('scanStop', () => {
      console.log('Bluetooth scan stopped');
      this.isScanning = false;
    });
  }

  private handleDeviceDiscovered(peripheral: NoblePeripheral): void {
    const deviceName = peripheral.advertisement.localName || peripheral.advertisement.shortLocalName || `Unknown Device (${peripheral.id})`;
    
    if (this.showAllDevices) {
      console.log(`Discovered BLE device: ${deviceName} (${peripheral.id})`);
      console.log(`  Services: ${peripheral.advertisement.serviceUuids.join(', ')}`);
      
      const device: DiscoveredDevice = {
        id: peripheral.id,
        name: deviceName,
        peripheral: peripheral,
        isConnected: false,
        deviceInfo: null,
        services: peripheral.advertisement.serviceUuids
      };
      
      this.discoveredDevices.set(peripheral.id, device);
    } else {
      const hasHeartRateService = peripheral.advertisement.serviceUuids.includes('180d');
      const hasCyclingPowerService = peripheral.advertisement.serviceUuids.includes('1818');
      const hasFTMSService = peripheral.advertisement.serviceUuids.includes('1826');
      const hasCyclingSpeedCadenceService = peripheral.advertisement.serviceUuids.includes('1816');
      
      // Also check for known fitness device names (some don't advertise services initially)
      const isKnownFitnessDevice = deviceName.toLowerCase().includes('coospo') || 
                                   deviceName.toLowerCase().includes('wahoo') || 
                                   deviceName.toLowerCase().includes('polar') || 
                                   deviceName.toLowerCase().includes('garmin') ||
                                   deviceName.toLowerCase().includes('heartrate') ||
                                   deviceName.toLowerCase().includes('hr');
      
      if (hasHeartRateService || hasCyclingPowerService || hasFTMSService || hasCyclingSpeedCadenceService || isKnownFitnessDevice) {
        console.log(`Discovered fitness device: ${deviceName} (${peripheral.id})`);
        console.log(`  Services: ${peripheral.advertisement.serviceUuids.join(', ')}`);
        
        const device: DiscoveredDevice = {
          id: peripheral.id,
          name: deviceName,
          peripheral: peripheral,
          isConnected: false,
          deviceInfo: null,
          services: peripheral.advertisement.serviceUuids
        };
        
        this.discoveredDevices.set(peripheral.id, device);
      }
    }
  }

  async scanForDevices(timeoutMs = 15000): Promise<BluetoothDevice[]> {
    return new Promise((resolve, reject) => {
      if ((noble as any).state !== 'poweredOn') {
        reject(new Error(`Bluetooth not ready. State: ${(noble as any).state}`));
        return;
      }

      if (this.isScanning) {
        console.log('Scan already in progress, stopping current scan...');
        noble.stopScanning();
      }

      this.discoveredDevices.clear();

      console.log(`Starting Bluetooth scan for ${timeoutMs / 1000} seconds...`);

      if (this.showAllDevices) {
        noble.startScanning([], false);
      } else {
        const serviceUuids = [
          '180d', // Heart Rate Service
          '1818', // Cycling Power Service
          '1826', // Fitness Machine Service (FTMS)
          '1816'  // Cycling Speed and Cadence Service
        ];
        noble.startScanning(serviceUuids, false);
      }

      this.scanTimeout = setTimeout(() => {
        noble.stopScanning();
        const devices = Array.from(this.discoveredDevices.values()).map(device => ({
          id: device.id,
          name: device.name,
          isConnected: device.isConnected,
          deviceInfo: device.deviceInfo,
          services: device.services
        }));
        console.log(`Scan completed. Found ${devices.length} fitness devices.`);
        resolve(devices);
      }, timeoutMs);
    });
  }

  async connectToDevice(deviceId: string): Promise<boolean> {
    try {
      const device = this.discoveredDevices.get(deviceId);
      if (!device) {
        console.log(`Device ${deviceId} not found, scanning...`);
        await this.scanForDevices(5000);
        const deviceAfterScan = this.discoveredDevices.get(deviceId);
        if (!deviceAfterScan) {
          throw new Error(`Device ${deviceId} not found`);
        }
        return this.connectToDevice(deviceId);
      }

      if (this.connectedDevices.has(deviceId)) {
        console.log(`Device ${device.name} is already connected`);
        return true;
      }

      console.log(`Connecting to device: ${device.name} (${deviceId})`);

      return new Promise((resolve, reject) => {
        const connectTimeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        device.peripheral.connect((error) => {
          clearTimeout(connectTimeout);
          
          if (error) {
            console.error(`Failed to connect to ${device.name}:`, error);
            reject(error);
            return;
          }

          console.log(`Successfully connected to ${device.name}`);
          
          device.isConnected = true;
          this.connectedDevices.set(deviceId, device);
          this.updateConnectionStatus();

          device.peripheral.on('disconnect', () => {
            console.log(`Device ${device.name} disconnected`);
            device.isConnected = false;
            this.connectedDevices.delete(deviceId);
            this.updateConnectionStatus();
          });

          this.setupDeviceServices(device).then(() => {
            resolve(true);
          }).catch((serviceError) => {
            console.error(`Failed to setup services for ${device.name}:`, serviceError);
            resolve(true);
          });
        });
      });
    } catch (error) {
      console.error(`Error connecting to device ${deviceId}:`, error);
      throw error;
    }
  }

  private async setupDeviceServices(device: DiscoveredDevice): Promise<void> {
    return new Promise((resolve, reject) => {
      device.peripheral.discoverServices([], (error: any, services?: any[]) => {
        if (error) {
          reject(error);
          return;
        }
        
        if (!services) {
          resolve();
          return;
        }

        console.log(`Discovered ${services.length} services for ${device.name}`);
        
        const ftmsService = services.find(service => 
          service.uuid === '1826' || service.uuid.toLowerCase().includes('1826')
        );

        if (ftmsService) {
          console.log(`Found FTMS service on ${device.name}`);
          this.setupFTMSService(device, ftmsService).then(resolve).catch(reject);
        } else {
          const powerService = services.find(service => service.uuid === '1818');
          const heartRateService = services.find(service => service.uuid === '180d');
          const speedCadenceService = services.find(service => service.uuid === '1816');
          
          if (heartRateService) {
            console.log(`Found Heart Rate service on ${device.name}`);
            this.setupHeartRateService(device, heartRateService).then(resolve).catch(reject);
          } else if (powerService || speedCadenceService) {
            console.log(`Found other fitness services on ${device.name}, setting up basic monitoring`);
            resolve();
          } else {
            console.log(`No recognized fitness services found on ${device.name}`);
            resolve();
          }
        }
      });
    });
  }

  private async setupFTMSService(device: DiscoveredDevice, ftmsService: any): Promise<void> {
    return new Promise((resolve, reject) => {
      ftmsService.discoverCharacteristics([], (error: any, characteristics: any[]) => {
        if (error) {
          reject(error);
          return;
        }

        console.log(`Found ${characteristics.length} FTMS characteristics for ${device.name}`);
        
        const indoorBikeDataChar = characteristics.find(char => 
          char.uuid === '2ad2' || char.uuid.toLowerCase().includes('2ad2')
        );

        if (indoorBikeDataChar && indoorBikeDataChar.properties.includes('notify')) {
          console.log(`Setting up Indoor Bike Data notifications for ${device.name}`);
          
          indoorBikeDataChar.on('data', (data: Buffer) => {
            const metrics = this.ftmsService.parseIndoorBikeData(data);
            if (metrics) {
              this.currentMetrics = {
                ...metrics,
                timestamp: new Date().toISOString()
              };
              this.emit('metricsUpdate', this.currentMetrics);
              console.log(`FTMS Data from ${device.name}:`, metrics);
            }
          });

          indoorBikeDataChar.subscribe((subscribeError: any) => {
            if (subscribeError) {
              console.error(`Failed to subscribe to FTMS notifications:`, subscribeError);
              reject(subscribeError);
            } else {
              console.log(`Successfully subscribed to FTMS notifications for ${device.name}`);
              resolve();
            }
          });
        } else {
          console.log(`Indoor Bike Data characteristic not found or not notifiable on ${device.name}`);
          resolve();
        }
      });
    });
  }

  private async setupHeartRateService(device: DiscoveredDevice, heartRateService: any): Promise<void> {
    return new Promise((resolve, reject) => {
      heartRateService.discoverCharacteristics([], (error: any, characteristics: any[]) => {
        if (error) {
          reject(error);
          return;
        }

        console.log(`Found ${characteristics.length} Heart Rate characteristics for ${device.name}`);
        
        const heartRateMeasurementChar = characteristics.find(char => 
          char.uuid === '2a37' || char.uuid.toLowerCase().includes('2a37')
        );

        if (heartRateMeasurementChar && heartRateMeasurementChar.properties.includes('notify')) {
          console.log(`Setting up Heart Rate Measurement notifications for ${device.name}`);
          
          heartRateMeasurementChar.on('data', (data: Buffer) => {
            const heartRate = this.parseHeartRateData(data);
            if (heartRate > 0) {
              this.currentMetrics = {
                ...this.currentMetrics,
                heartRate: heartRate,
                timestamp: new Date().toISOString()
              };
              this.emit('metricsUpdate', this.currentMetrics);
              console.log(`Heart Rate from ${device.name}: ${heartRate} bpm`);
            }
          });

          heartRateMeasurementChar.subscribe((subscribeError: any) => {
            if (subscribeError) {
              console.error(`Failed to subscribe to Heart Rate notifications:`, subscribeError);
              reject(subscribeError);
            } else {
              console.log(`Successfully subscribed to Heart Rate notifications for ${device.name}`);
              resolve();
            }
          });
        } else {
          console.log(`Heart Rate Measurement characteristic not found or not notifiable on ${device.name}`);
          resolve();
        }
      });
    });
  }

  private parseHeartRateData(data: Buffer): number {
    if (data.length < 2) {
      return 0;
    }

    // Heart Rate Measurement characteristic format (Bluetooth spec)
    // Byte 0: Flags
    // - Bit 0: 0 = uint8, 1 = uint16 for heart rate value
    // - Bit 1-2: Sensor Contact Status
    // - Bit 3: Energy Expended Status
    // - Bit 4: RR-Interval Status
    // - Bit 5-7: Reserved
    
    const flags = data.readUInt8(0);
    const is16Bit = (flags & 0x01) !== 0;
    
    let heartRate: number;
    if (is16Bit) {
      // 16-bit heart rate value (little-endian)
      heartRate = data.readUInt16LE(1);
    } else {
      // 8-bit heart rate value
      heartRate = data.readUInt8(1);
    }
    
    console.log(`Parsed heart rate: ${heartRate} bpm (16-bit: ${is16Bit}, flags: 0x${flags.toString(16)})`);
    return heartRate;
  }

  private updateConnectionStatus(): void {
    this.isConnected = this.connectedDevices.size > 0;
    if (this.isConnected) {
      const deviceNames = Array.from(this.connectedDevices.values()).map(d => d.name);
      this.connectedDeviceName = deviceNames.join(', ');
    } else {
      this.connectedDeviceName = null;
    }
    this.emit('connectionStatusChanged', {
      isConnected: this.isConnected,
      deviceName: this.connectedDeviceName
    });
  }

  async scanAndConnect(): Promise<boolean> {
    try {
      console.log('=== Node.js Bluetooth FTMS Trainer Connection ===');
      
      if (this.isConnected) {
        console.log('Already connected to a trainer');
        return true;
      }

      console.log('Scanning for FTMS devices...');
      const devices = await this.scanForDevices(10000);
      
      if (devices.length === 0) {
        console.log('No FTMS devices found.');
        return false;
      }

      const device = devices[0];
      console.log(`Attempting to connect to: ${device.name}`);
      
      const connected = await this.connectToDevice(device.id);
      if (connected) {
        console.log(`Successfully connected to: ${device.name}`);
        return true;
      } else {
        console.log('Failed to connect to device.');
        return false;
      }
    } catch (error: any) {
      console.error('Real connection failed:', error.message);
      return false;
    }
  }


  async disconnect(): Promise<void> {
    try {
      console.log('Disconnecting from all devices...');
      
      if (this.simulationInterval) {
        clearInterval(this.simulationInterval);
        this.simulationInterval = null;
      }

      if (this.testDataInterval) {
        clearInterval(this.testDataInterval);
        this.testDataInterval = null;
      }

      if (this.isScanning) {
        noble.stopScanning();
      }

      for (const [, device] of this.connectedDevices) {
        try {
          if (device.peripheral && device.peripheral.state === 'connected') {
            console.log(`Disconnecting from ${device.name}`);
            device.peripheral.disconnect();
          }
        } catch (error) {
          console.error(`Error disconnecting from ${device.name}:`, error);
        }
      }

      this.connectedDevices.clear();
      this.isConnected = false;
      this.connectedDeviceName = null;
      
      this.currentMetrics = {
        watts: 0,
        cadence: 0,
        speed: 0,
        heartRate: 0,
        timestamp: new Date().toISOString()
      };

      this.updateConnectionStatus();
      console.log('Disconnected from all devices');
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  getCurrentMetrics(): CyclingMetrics {
    return { ...this.currentMetrics };
  }

  getConnectionStatus(): { isConnected: boolean; deviceName: string | null; timestamp: string } {
    return {
      isConnected: this.isConnected,
      deviceName: this.connectedDeviceName,
      timestamp: new Date().toISOString()
    };
  }

  getConnectedDevicesCount(): number {
    return this.connectedDevices.size;
  }

  setShowAllDevices(showAll: boolean): void {
    this.showAllDevices = showAll;
    console.log(`Device filter mode changed: ${showAll ? 'showing all devices' : 'fitness devices only'}`);
  }

  getShowAllDevices(): boolean {
    return this.showAllDevices;
  }

  setTestMode(enabled: boolean): void {
    this.testMode = enabled;
    console.log(`Test mode ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled) {
      this.startTestDataGeneration();
    } else {
      this.stopTestDataGeneration();
    }
  }

  getTestMode(): boolean {
    return this.testMode;
  }

  private startTestDataGeneration(): void {
    if (this.testDataInterval) {
      clearInterval(this.testDataInterval);
    }

    console.log('Starting test data generation...');
    this.isConnected = true;
    this.connectedDeviceName = 'Test Trainer';
    this.updateConnectionStatus();

    // Generate realistic cycling data
    let time = 0;
    this.testDataInterval = setInterval(() => {
      time += 1;
      
      // Generate realistic cycling metrics with some variation
      const baseWatts = 150;
      const baseCadence = 85;
      const baseSpeed = 25;
      const baseHeartRate = 140;
      
      // Add some realistic variation
      const wattsVariation = Math.sin(time * 0.1) * 30 + Math.random() * 20 - 10;
      const cadenceVariation = Math.sin(time * 0.05) * 10 + Math.random() * 8 - 4;
      const speedVariation = Math.sin(time * 0.08) * 5 + Math.random() * 3 - 1.5;
      const hrVariation = Math.sin(time * 0.03) * 15 + Math.random() * 10 - 5;
      
      this.currentMetrics = {
        watts: Math.max(0, Math.round(baseWatts + wattsVariation)),
        cadence: Math.max(0, Math.round(baseCadence + cadenceVariation)),
        speed: Math.max(0, Math.round((baseSpeed + speedVariation) * 10) / 10),
        heartRate: Math.max(60, Math.round(baseHeartRate + hrVariation)),
        timestamp: new Date().toISOString()
      };
      
      this.emit('metricsUpdate', this.currentMetrics);
    }, 1000);
  }

  private stopTestDataGeneration(): void {
    if (this.testDataInterval) {
      clearInterval(this.testDataInterval);
      this.testDataInterval = null;
      console.log('Test data generation stopped');
    }

    // Reset connection status
    this.isConnected = false;
    this.connectedDeviceName = null;
    this.currentMetrics = {
      watts: 0,
      cadence: 0,
      speed: 0,
      heartRate: 0,
      timestamp: new Date().toISOString()
    };
    this.updateConnectionStatus();
  }
}