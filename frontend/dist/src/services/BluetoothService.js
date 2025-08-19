"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BluetoothService = void 0;
const noble_1 = __importDefault(require("@stoprocent/noble"));
const events_1 = require("events");
const FTMSService_1 = require("./FTMSService");
class BluetoothService extends events_1.EventEmitter {
    constructor() {
        super();
        this.isConnected = false;
        this.connectedDeviceName = null;
        this.connectedDevices = new Map();
        this.discoveredDevices = new Map();
        this.currentMetrics = {
            watts: 0,
            cadence: 0,
            speed: 0,
            heartRate: 0,
            timestamp: new Date().toISOString()
        };
        this.isScanning = false;
        this.scanTimeout = null;
        this.simulationInterval = null;
        this.ftmsService = new FTMSService_1.FTMSService();
        this.ftmsService.on('metricsUpdate', (metrics) => {
            this.currentMetrics = {
                ...metrics,
                timestamp: new Date().toISOString()
            };
            this.emit('metricsUpdate', this.currentMetrics);
        });
        this.initializeNoble();
    }
    initializeNoble() {
        noble_1.default.on('stateChange', (state) => {
            console.log('Bluetooth state changed to:', state);
            if (state === 'poweredOn') {
                console.log('Bluetooth is powered on and ready');
            }
            else {
                console.log('Bluetooth is not available:', state);
                if (this.isConnected) {
                    this.disconnect();
                }
            }
        });
        noble_1.default.on('discover', (peripheral) => {
            this.handleDeviceDiscovered(peripheral);
        });
        noble_1.default.on('scanStart', () => {
            console.log('Bluetooth scan started');
            this.isScanning = true;
        });
        noble_1.default.on('scanStop', () => {
            console.log('Bluetooth scan stopped');
            this.isScanning = false;
        });
    }
    handleDeviceDiscovered(peripheral) {
        const hasHeartRateService = peripheral.advertisement.serviceUuids.includes('180d');
        const hasCyclingPowerService = peripheral.advertisement.serviceUuids.includes('1818');
        const hasFTMSService = peripheral.advertisement.serviceUuids.includes('1826');
        const hasCyclingSpeedCadenceService = peripheral.advertisement.serviceUuids.includes('1816');
        if (hasHeartRateService || hasCyclingPowerService || hasFTMSService || hasCyclingSpeedCadenceService) {
            const deviceName = peripheral.advertisement.localName || peripheral.advertisement.shortLocalName || `Unknown Device (${peripheral.id})`;
            console.log(`Discovered fitness device: ${deviceName} (${peripheral.id})`);
            console.log(`  Services: ${peripheral.advertisement.serviceUuids.join(', ')}`);
            const device = {
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
    async scanForDevices(timeoutMs = 15000) {
        return new Promise((resolve, reject) => {
            if (noble_1.default.state !== 'poweredOn') {
                reject(new Error(`Bluetooth not ready. State: ${noble_1.default.state}`));
                return;
            }
            if (this.isScanning) {
                console.log('Scan already in progress, stopping current scan...');
                noble_1.default.stopScanning();
            }
            this.discoveredDevices.clear();
            console.log(`Starting Bluetooth scan for ${timeoutMs / 1000} seconds...`);
            const serviceUuids = [
                '180d',
                '1818',
                '1826',
                '1816'
            ];
            noble_1.default.startScanning(serviceUuids, false);
            this.scanTimeout = setTimeout(() => {
                noble_1.default.stopScanning();
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
    async connectToDevice(deviceId) {
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
        }
        catch (error) {
            console.error(`Error connecting to device ${deviceId}:`, error);
            throw error;
        }
    }
    async setupDeviceServices(device) {
        return new Promise((resolve, reject) => {
            device.peripheral.discoverServices([], (error, services) => {
                if (error) {
                    reject(error);
                    return;
                }
                if (!services) {
                    resolve();
                    return;
                }
                console.log(`Discovered ${services.length} services for ${device.name}`);
                const ftmsService = services.find(service => service.uuid === '1826' || service.uuid.toLowerCase().includes('1826'));
                if (ftmsService) {
                    console.log(`Found FTMS service on ${device.name}`);
                    this.setupFTMSService(device, ftmsService).then(resolve).catch(reject);
                }
                else {
                    const powerService = services.find(service => service.uuid === '1818');
                    const heartRateService = services.find(service => service.uuid === '180d');
                    const speedCadenceService = services.find(service => service.uuid === '1816');
                    if (powerService || heartRateService || speedCadenceService) {
                        console.log(`Found fitness services on ${device.name}, setting up basic monitoring`);
                        resolve();
                    }
                    else {
                        console.log(`No recognized fitness services found on ${device.name}`);
                        resolve();
                    }
                }
            });
        });
    }
    async setupFTMSService(device, ftmsService) {
        return new Promise((resolve, reject) => {
            ftmsService.discoverCharacteristics([], (error, characteristics) => {
                if (error) {
                    reject(error);
                    return;
                }
                console.log(`Found ${characteristics.length} FTMS characteristics for ${device.name}`);
                const indoorBikeDataChar = characteristics.find(char => char.uuid === '2ad2' || char.uuid.toLowerCase().includes('2ad2'));
                if (indoorBikeDataChar && indoorBikeDataChar.properties.includes('notify')) {
                    console.log(`Setting up Indoor Bike Data notifications for ${device.name}`);
                    indoorBikeDataChar.on('data', (data) => {
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
                    indoorBikeDataChar.subscribe((subscribeError) => {
                        if (subscribeError) {
                            console.error(`Failed to subscribe to FTMS notifications:`, subscribeError);
                            reject(subscribeError);
                        }
                        else {
                            console.log(`Successfully subscribed to FTMS notifications for ${device.name}`);
                            resolve();
                        }
                    });
                }
                else {
                    console.log(`Indoor Bike Data characteristic not found or not notifiable on ${device.name}`);
                    resolve();
                }
            });
        });
    }
    updateConnectionStatus() {
        this.isConnected = this.connectedDevices.size > 0;
        if (this.isConnected) {
            const deviceNames = Array.from(this.connectedDevices.values()).map(d => d.name);
            this.connectedDeviceName = deviceNames.join(', ');
        }
        else {
            this.connectedDeviceName = null;
        }
        this.emit('connectionStatusChanged', {
            isConnected: this.isConnected,
            deviceName: this.connectedDeviceName
        });
    }
    async scanAndConnect() {
        try {
            console.log('=== Node.js Bluetooth FTMS Trainer Connection ===');
            if (this.isConnected) {
                console.log('Already connected to a trainer');
                return true;
            }
            console.log('Scanning for FTMS devices...');
            const devices = await this.scanForDevices(10000);
            if (devices.length === 0) {
                console.log('No FTMS devices found. Starting simulation mode.');
                return this.startSimulationMode();
            }
            const device = devices[0];
            console.log(`Attempting to connect to: ${device.name}`);
            const connected = await this.connectToDevice(device.id);
            if (connected) {
                console.log(`Successfully connected to: ${device.name}`);
                return true;
            }
            else {
                console.log('Failed to connect to device. Starting simulation mode.');
                return this.startSimulationMode();
            }
        }
        catch (error) {
            console.error('Real connection failed:', error.message);
            console.log('Starting simulation mode.');
            return this.startSimulationMode();
        }
    }
    startSimulationMode() {
        console.log('Starting FTMS simulation mode...');
        this.connectedDeviceName = 'Simulated KICKR CORE';
        this.isConnected = true;
        this.updateConnectionStatus();
        this.simulationInterval = setInterval(() => {
            const now = Date.now();
            const elapsedSeconds = Math.floor(now / 1000) % 3600;
            const workoutIntensity = 0.7 + 0.3 * Math.sin(elapsedSeconds / 30.0);
            const basePower = 180 + Math.floor(50 * workoutIntensity);
            const baseCadence = 85 + Math.floor(15 * workoutIntensity);
            const baseSpeed = 28.0 + (8.0 * workoutIntensity);
            const powerVariation = Math.floor(Math.sin(elapsedSeconds / 10.0) * 15);
            const cadenceVariation = Math.floor(Math.cos(elapsedSeconds / 12.0) * 8);
            const speedVariation = Math.sin(elapsedSeconds / 15.0) * 3.0;
            this.currentMetrics = {
                watts: Math.max(0, basePower + powerVariation + Math.floor(Math.random() * 16 - 8)),
                cadence: Math.max(0, baseCadence + cadenceVariation + Math.floor(Math.random() * 6 - 3)),
                speed: Math.max(0, baseSpeed + speedVariation + (Math.random() * 2 - 1)),
                heartRate: 135 + Math.floor(25 * workoutIntensity) + Math.floor(Math.random() * 13 - 5),
                timestamp: new Date().toISOString()
            };
            this.emit('metricsUpdate', this.currentMetrics);
            if (elapsedSeconds % 10 === 0) {
                console.log(`Simulation Data - Power: ${this.currentMetrics.watts}W, ` +
                    `Cadence: ${this.currentMetrics.cadence}RPM, ` +
                    `Speed: ${this.currentMetrics.speed.toFixed(1)}km/h, ` +
                    `HR: ${this.currentMetrics.heartRate}BPM`);
            }
        }, 1000);
        console.log('Successfully started simulation mode');
        return true;
    }
    async disconnect() {
        try {
            console.log('Disconnecting from all devices...');
            if (this.simulationInterval) {
                clearInterval(this.simulationInterval);
                this.simulationInterval = null;
            }
            if (this.isScanning) {
                noble_1.default.stopScanning();
            }
            for (const [deviceId, device] of this.connectedDevices) {
                try {
                    if (device.peripheral && device.peripheral.state === 'connected') {
                        console.log(`Disconnecting from ${device.name}`);
                        device.peripheral.disconnect();
                    }
                }
                catch (error) {
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
        }
        catch (error) {
            console.error('Error during disconnect:', error);
        }
    }
    getCurrentMetrics() {
        return { ...this.currentMetrics };
    }
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            deviceName: this.connectedDeviceName,
            timestamp: new Date().toISOString()
        };
    }
    getConnectedDevicesCount() {
        return this.connectedDevices.size;
    }
}
exports.BluetoothService = BluetoothService;
