class BluetoothService {
    constructor() {
        this.devices = [];
        this.connectedDevices = new Map();
        this.isScanning = false;
        this.onDataReceived = null;
        this.onDeviceConnected = null;
        this.onDeviceDisconnected = null;
        
        // Fitness device service UUIDs
        this.FITNESS_SERVICES = {
            // Cycling Power Service
            CYCLING_POWER: '00001818-0000-1000-8000-00805f9b34fb',
            // Heart Rate Service
            HEART_RATE: '0000180d-0000-1000-8000-00805f9b34fb',
            // Fitness Tracking Service
            FITNESS_TRACKING: '00001826-0000-1000-8000-00805f9b34fb',
            // Device Information Service
            DEVICE_INFO: '0000180a-0000-1000-8000-00805f9b34fb'
        };
        
        // Characteristic UUIDs
        this.CHARACTERISTICS = {
            // Cycling Power Measurement
            CYCLING_POWER_MEASUREMENT: '00002a63-0000-1000-8000-00805f9b34fb',
            // Heart Rate Measurement
            HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',
            // Heart Rate Control Point
            HEART_RATE_CONTROL_POINT: '00002a39-0000-1000-8000-00805f9b34fb'
        };
    }

    // Check if Web Bluetooth API is available
    isSupported() {
        return navigator.bluetooth && navigator.bluetooth.requestDevice;
    }

    // Request Bluetooth permissions and scan for devices
    async requestDevice() {
        if (!this.isSupported()) {
            throw new Error('Web Bluetooth API not supported in this browser');
        }

        try {
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: false,
                optionalServices: Object.values(this.FITNESS_SERVICES),
                filters: [
                    {
                        services: [this.FITNESS_SERVICES.CYCLING_POWER]
                    },
                    {
                        services: [this.FITNESS_SERVICES.HEART_RATE]
                    },
                    {
                        namePrefix: 'Tacx',
                        services: [this.FITNESS_SERVICES.CYCLING_POWER]
                    },
                    {
                        namePrefix: 'Wahoo',
                        services: [this.FITNESS_SERVICES.CYCLING_POWER]
                    },
                    {
                        namePrefix: 'Elite',
                        services: [this.FITNESS_SERVICES.CYCLING_POWER]
                    },
                    {
                        namePrefix: 'Garmin',
                        services: [this.FITNESS_SERVICES.HEART_RATE]
                    },
                    {
                        namePrefix: 'Polar',
                        services: [this.FITNESS_SERVICES.HEART_RATE]
                    }
                ]
            });

            return device;
        } catch (error) {
            if (error.name === 'NotFoundError') {
                throw new Error('No device selected - user cancelled the device selection');
            } else if (error.name === 'NotAllowedError') {
                throw new Error('Permission denied - please allow Bluetooth access');
            } else if (error.name === 'NotSupportedError') {
                throw new Error('Bluetooth not supported on this device');
            } else if (error.name === 'SecurityError') {
                throw new Error('Bluetooth access blocked by security policy');
            } else {
                throw new Error(`Bluetooth error: ${error.message}`);
            }
        }
    }

    // Scan for available Bluetooth devices
    async scanForDevices() {
        if (this.isScanning) {
            throw new Error('Scan already in progress');
        }

        this.isScanning = true;
        this.devices = [];

        try {
            // For Web Bluetooth API, we need to request device access
            // This will show the device picker to the user
            const device = await this.requestDevice();
            
            if (device) {
                // Add the selected device to our list
                const deviceInfo = {
                    id: device.id,
                    name: device.name || 'Unknown Device',
                    type: this.getDeviceType(device),
                    status: 'Available',
                    canConnect: true,
                    isConnected: false,
                    deviceInfo: {
                        manufacturer: this.getManufacturerFromName(device.name),
                        model: this.getModelFromName(device.name),
                        type: this.getDeviceType(device)
                    }
                };

                this.devices.push(deviceInfo);
                return [deviceInfo];
            }

            return [];
        } catch (error) {
            console.error('Scan error:', error);
            
            // Don't throw an error for user cancellation, just return empty array
            if (error.message.includes('user cancelled') || error.message.includes('No device selected')) {
                return [];
            }
            
            throw error;
        } finally {
            this.isScanning = false;
        }
    }

    // Get device type based on available services
    getDeviceType(device) {
        if (device.gatt) {
            // This is a more advanced check - we'd need to connect to determine services
            return 'Fitness Device';
        }
        return 'Unknown';
    }

    // Connect to a specific device
    async connectToDevice(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) {
            throw new Error('Device not found');
        }

        if (this.connectedDevices.has(deviceId)) {
            throw new Error('Device already connected');
        }

        try {
            // For Web Bluetooth, we need to request the device again
            const bluetoothDevice = await this.requestDevice();
            
            if (bluetoothDevice.id !== deviceId) {
                throw new Error('Selected device does not match requested device');
            }

            // Connect to GATT server
            const server = await bluetoothDevice.gatt.connect();
            
            // Store connection info
            this.connectedDevices.set(deviceId, {
                device: bluetoothDevice,
                server: server,
                services: new Map(),
                characteristics: new Map()
            });

            // Update device status
            device.isConnected = true;
            device.status = 'Connected';

            // Discover services and characteristics
            await this.discoverServices(deviceId);

            // Start notifications for relevant characteristics
            await this.startNotifications(deviceId);

            if (this.onDeviceConnected) {
                this.onDeviceConnected(device);
            }

            return true;
        } catch (error) {
            console.error('Connection error:', error);
            throw error;
        }
    }

    // Discover services and characteristics for a connected device
    async discoverServices(deviceId) {
        const connection = this.connectedDevices.get(deviceId);
        if (!connection) {
            throw new Error('Device not connected');
        }

        try {
            // Get cycling power service if available
            try {
                const cyclingPowerService = await connection.server.getPrimaryService(this.FITNESS_SERVICES.CYCLING_POWER);
                connection.services.set('cyclingPower', cyclingPowerService);
                
                // Get cycling power measurement characteristic
                const powerCharacteristic = await cyclingPowerService.getCharacteristic(this.CHARACTERISTICS.CYCLING_POWER_MEASUREMENT);
                connection.characteristics.set('powerMeasurement', powerCharacteristic);
            } catch (error) {
                console.log('Cycling power service not available:', error.message);
            }

            // Get heart rate service if available
            try {
                const heartRateService = await connection.server.getPrimaryService(this.FITNESS_SERVICES.HEART_RATE);
                connection.services.set('heartRate', heartRateService);
                
                // Get heart rate measurement characteristic
                const hrCharacteristic = await heartRateService.getCharacteristic(this.CHARACTERISTICS.HEART_RATE_MEASUREMENT);
                connection.characteristics.set('heartRateMeasurement', hrCharacteristic);
            } catch (error) {
                console.log('Heart rate service not available:', error.message);
            }

            // Get device information service if available
            try {
                const deviceInfoService = await connection.server.getPrimaryService(this.FITNESS_SERVICES.DEVICE_INFO);
                connection.services.set('deviceInfo', deviceInfoService);
            } catch (error) {
                console.log('Device info service not available:', error.message);
            }

        } catch (error) {
            console.error('Service discovery error:', error);
            throw error;
        }
    }

    // Start notifications for relevant characteristics
    async startNotifications(deviceId) {
        const connection = this.connectedDevices.get(deviceId);
        if (!connection) {
            throw new Error('Device not connected');
        }

        try {
            // Start power measurement notifications
            const powerCharacteristic = connection.characteristics.get('powerMeasurement');
            if (powerCharacteristic) {
                await powerCharacteristic.startNotifications();
                powerCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
                    this.handlePowerData(event.target.value, deviceId);
                });
            }

            // Start heart rate notifications
            const hrCharacteristic = connection.characteristics.get('heartRateMeasurement');
            if (hrCharacteristic) {
                await hrCharacteristic.startNotifications();
                hrCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
                    this.handleHeartRateData(event.target.value, deviceId);
                });
            }

        } catch (error) {
            console.error('Notification start error:', error);
            throw error;
        }
    }

    // Handle cycling power data
    handlePowerData(dataView, deviceId) {
        try {
            // Parse cycling power measurement data
            // Format: Flags (2 bytes) + Instantaneous Power (2 bytes) + Optional data
            const flags = dataView.getUint16(0, true);
            const power = dataView.getInt16(2, true);
            
            // Check if power is valid (not -32768 which indicates invalid)
            if (power !== -32768) {
                const powerData = {
                    type: 'power',
                    value: power,
                    unit: 'watts',
                    deviceId: deviceId,
                    timestamp: Date.now()
                };

                if (this.onDataReceived) {
                    this.onDataReceived(powerData);
                }
            }
        } catch (error) {
            console.error('Power data parsing error:', error);
        }
    }

    // Handle heart rate data
    handleHeartRateData(dataView, deviceId) {
        try {
            // Parse heart rate measurement data
            // Format: Flags (1 byte) + Heart Rate Value (2 bytes) + Optional data
            const flags = dataView.getUint8(0);
            const hrValue = dataView.getUint16(1, true);
            
            // Check if HR is valid (not 0 which indicates invalid)
            if (hrValue > 0) {
                const hrData = {
                    type: 'heartRate',
                    value: hrValue,
                    unit: 'bpm',
                    deviceId: deviceId,
                    timestamp: Date.now()
                };

                if (this.onDataReceived) {
                    this.onDataReceived(hrData);
                }
            }
        } catch (error) {
            console.error('Heart rate data parsing error:', error);
        }
    }

    // Disconnect from a device
    async disconnectDevice(deviceId) {
        const connection = this.connectedDevices.get(deviceId);
        if (!connection) {
            throw new Error('Device not connected');
        }

        try {
            // Disconnect from GATT server
            if (connection.server.connected) {
                await connection.server.disconnect();
            }

            // Remove from connected devices
            this.connectedDevices.delete(deviceId);

            // Update device status
            const device = this.devices.find(d => d.id === deviceId);
            if (device) {
                device.isConnected = false;
                device.status = 'Available';
            }

            if (this.onDeviceDisconnected) {
                this.onDeviceDisconnected(device);
            }

            return true;
        } catch (error) {
            console.error('Disconnect error:', error);
            throw error;
        }
    }

    // Get list of available devices
    getDevices() {
        return this.devices;
    }

    // Get list of connected devices
    getConnectedDevices() {
        return Array.from(this.connectedDevices.keys());
    }

    // Check if a device is connected
    isDeviceConnected(deviceId) {
        return this.connectedDevices.has(deviceId);
    }

    // Clean up all connections
    async disconnectAll() {
        const deviceIds = Array.from(this.connectedDevices.keys());
        const promises = deviceIds.map(deviceId => this.disconnectDevice(deviceId));
        
        try {
            await Promise.all(promises);
        } catch (error) {
            console.error('Error disconnecting all devices:', error);
        }
    }

    // Set callback for data received
    setDataCallback(callback) {
        this.onDataReceived = callback;
    }

    // Set callback for device connected
    setDeviceConnectedCallback(callback) {
        this.onDeviceConnected = callback;
    }

    // Set callback for device disconnected
    setDeviceDisconnectedCallback(callback) {
        this.onDeviceDisconnected = callback;
    }

    // Helper method to extract manufacturer from device name
    getManufacturerFromName(deviceName) {
        if (!deviceName) return 'Unknown';
        
        const name = deviceName.toLowerCase();
        if (name.includes('tacx')) return 'Tacx';
        if (name.includes('wahoo')) return 'Wahoo';
        if (name.includes('elite')) return 'Elite';
        if (name.includes('garmin')) return 'Garmin';
        if (name.includes('polar')) return 'Polar';
        if (name.includes('suunto')) return 'Suunto';
        if (name.includes('fitbit')) return 'Fitbit';
        
        return 'Unknown';
    }

    // Helper method to extract model from device name
    getModelFromName(deviceName) {
        if (!deviceName) return 'Unknown';
        
        // Try to extract model number or specific model name
        const name = deviceName.toLowerCase();
        if (name.includes('neo')) return 'Neo';
        if (name.includes('kickr')) return 'Kickr';
        if (name.includes('drivo')) return 'Drivo';
        if (name.includes('h10')) return 'H10';
        if (name.includes('h9')) return 'H9';
        if (name.includes('v800')) return 'V800';
        if (name.includes('v650')) return 'V650';
        
        return 'Unknown';
    }
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BluetoothService;
} else {
    // Browser/Electron context
    window.BluetoothService = BluetoothService;
}
