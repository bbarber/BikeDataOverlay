const EventEmitter = require('events');
const noble = require('@abandonware/noble');

const HEART_RATE_SERVICE = '180d';
const CYCLING_POWER_SERVICE = '1818';
const BATTERY_SERVICE = '180f';

const HEART_RATE_MEASUREMENT = '2a37';

class BleService extends EventEmitter {
	constructor() {
		super();
		this.devices = new Map();
		this.isScanning = false;
		this.connected = false;
		this.connectedDevice = null;
		this.heartRateCharacteristic = null;
		this._onDiscover = this._onDiscover.bind(this);
	}

	async init() {
		if (noble.state === 'poweredOn') return true;
		return new Promise((resolve) => {
			noble.once('stateChange', (state) => {
				resolve(state === 'poweredOn');
			});
		});
	}

	async startScan() {
		if (this.isScanning) return;
		this.isScanning = true;
		this.devices.clear();
		noble.on('discover', this._onDiscover);
		await noble.startScanning([HEART_RATE_SERVICE, CYCLING_POWER_SERVICE, BATTERY_SERVICE], true);
		this.emit('scan-started');
	}

	async stopScan() {
		if (!this.isScanning) return;
		this.isScanning = false;
		try { await noble.stopScanning(); } catch {}
		noble.off('discover', this._onDiscover);
		this.emit('scan-stopped', this.getDevices());
	}

	_onDiscover(peripheral) {
		const id = peripheral.id;
		if (this.devices.has(id)) return;

		const services = peripheral.advertisement.serviceUuids || [];
		const isHr = services.includes(HEART_RATE_SERVICE);
		const isCp = services.includes(CYCLING_POWER_SERVICE);

		const deviceInfo = {
			id,
			name: peripheral.advertisement.localName || 'Unknown Device',
			type: isHr ? 'Heart Rate Monitor' : (isCp ? 'Cycling Power Meter' : 'Other Device'),
			status: 'Available',
			canConnect: peripheral.connectable,
			isConnected: false,
			deviceInfo: {
				manufacturer: this._getManufacturerFromName(peripheral.advertisement.localName),
				model: this._getModelFromName(peripheral.advertisement.localName),
				type: isHr ? 'Heart Rate Monitor' : (isCp ? 'Cycling Power Meter' : 'Other')
			},
			rssi: peripheral.rssi,
			services,
			peripheral
		};

		this.devices.set(id, deviceInfo);
		this.emit('device', this._publicDevice(deviceInfo));
	}

	_publicDevice(device) {
		const { peripheral, ...rest } = device;
		return rest;
	}

	getDevices() {
		return Array.from(this.devices.values()).map(d => this._publicDevice(d));
	}

	async connectToDevice(id) {
		const device = this.devices.get(id);
		if (!device) throw new Error('Device not found');
		if (this.connected) await this.disconnectDevice();

		await device.peripheral.connectAsync();
		this.connected = true;
		this.connectedDevice = device;
		device.isConnected = true;
		device.status = 'Connected';
		this.emit('connected', this._publicDevice(device));

		const { services, characteristics } = await device.peripheral.discoverAllServicesAndCharacteristicsAsync();
		const hrChar = characteristics.find(c => c.uuid.toLowerCase() === HEART_RATE_MEASUREMENT);
		if (hrChar) {
			this.heartRateCharacteristic = hrChar;
			await hrChar.subscribeAsync();
			hrChar.on('data', (data) => this._handleHrData(data));
		}
	}

	async disconnectDevice() {
		if (!this.connected || !this.connectedDevice) return;
		try {
			if (this.heartRateCharacteristic) {
				try { await this.heartRateCharacteristic.unsubscribeAsync(); } catch {}
				this.heartRateCharacteristic.removeAllListeners('data');
				this.heartRateCharacteristic = null;
			}
			await this.connectedDevice.peripheral.disconnectAsync();
		} finally {
			this.connectedDevice.isConnected = false;
			this.connectedDevice.status = 'Available';
			this.emit('disconnected', this._publicDevice(this.connectedDevice));
			this.connected = false;
			this.connectedDevice = null;
		}
	}

	cleanup() {
		this.removeAllListeners();
		if (this.isScanning) { try { noble.stopScanning(); } catch {} }
		if (this.connected) { this.disconnectDevice().catch(() => {}); }
	}

	_handleHrData(data) {
		try {
			const flags = data.readUInt8(0);
			let offset = 1;
			const isUint16 = (flags & 0x01) !== 0;
			let bpm = isUint16 ? data.readUInt16LE(offset) : data.readUInt8(offset);
			offset += isUint16 ? 2 : 1;

			let rr = [];
			if ((flags & 0x10) !== 0) {
				while (offset + 1 < data.length) {
					const v = data.readUInt16LE(offset);
					offset += 2;
					rr.push(v / 1024);
				}
			}

			this.emit('data', { type: 'heartRate', value: bpm, unit: 'bpm', rr });
		} catch (e) {
			// ignore malformed packets
		}
	}

	_getManufacturerFromName(name) {
		if (!name) return 'Unknown';
		const n = name.toLowerCase();
		if (n.includes('garmin')) return 'Garmin';
		if (n.includes('polar')) return 'Polar';
		if (n.includes('wahoo')) return 'Wahoo';
		if (n.includes('coospo')) return 'COOSPO';
		return 'Unknown';
	}

	_getModelFromName(name) {
		if (!name) return 'Unknown';
		const n = name.toLowerCase();
		if (n.includes('h6')) return 'H6';
		if (n.includes('h10')) return 'H10';
		return 'Unknown';
	}
}

module.exports = BleService;
