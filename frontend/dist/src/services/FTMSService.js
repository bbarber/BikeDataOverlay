"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FTMSService = void 0;
const events_1 = require("events");
class FTMSService extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.FTMS_SERVICE_UUID = '1826';
        this.CHARACTERISTICS = {
            FITNESS_MACHINE_FEATURE: '2acc',
            INDOOR_BIKE_DATA: '2ad2',
            TRAINING_STATUS: '2ad3',
            SUPPORTED_SPEED_RANGE: '2ad4',
            SUPPORTED_INCLINATION_RANGE: '2ad5',
            SUPPORTED_RESISTANCE_LEVEL_RANGE: '2ad6',
            SUPPORTED_HEART_RATE_RANGE: '2ad7',
            SUPPORTED_POWER_RANGE: '2ad8',
            FITNESS_MACHINE_CONTROL_POINT: '2ad9',
            FITNESS_MACHINE_STATUS: '2ada'
        };
        this.INDOOR_BIKE_DATA_FLAGS = {
            INSTANTANEOUS_SPEED: 0x001,
            AVERAGE_SPEED: 0x002,
            INSTANTANEOUS_CADENCE: 0x004,
            AVERAGE_CADENCE: 0x008,
            TOTAL_DISTANCE: 0x010,
            RESISTANCE_LEVEL: 0x020,
            INSTANTANEOUS_POWER: 0x040,
            AVERAGE_POWER: 0x080,
            EXPENDED_ENERGY: 0x100,
            HEART_RATE: 0x200,
            METABOLIC_EQUIVALENT: 0x400,
            ELAPSED_TIME: 0x800,
            REMAINING_TIME: 0x1000
        };
    }
    parseIndoorBikeData(data) {
        try {
            if (!data || data.length < 2) {
                console.warn('Invalid Indoor Bike Data: insufficient data length');
                return null;
            }
            const flags = data.readUInt16LE(0);
            let offset = 2;
            const metrics = {
                watts: 0,
                cadence: 0,
                speed: 0,
                heartRate: 0
            };
            if (flags & this.INDOOR_BIKE_DATA_FLAGS.INSTANTANEOUS_SPEED) {
                if (offset + 2 <= data.length) {
                    const speedRaw = data.readUInt16LE(offset);
                    metrics.speed = speedRaw / 100.0;
                    offset += 2;
                }
            }
            if (flags & this.INDOOR_BIKE_DATA_FLAGS.AVERAGE_SPEED) {
                offset += 2;
            }
            if (flags & this.INDOOR_BIKE_DATA_FLAGS.INSTANTANEOUS_CADENCE) {
                if (offset + 2 <= data.length) {
                    const cadenceRaw = data.readUInt16LE(offset);
                    metrics.cadence = cadenceRaw / 2.0;
                    offset += 2;
                }
            }
            if (flags & this.INDOOR_BIKE_DATA_FLAGS.AVERAGE_CADENCE) {
                offset += 2;
            }
            if (flags & this.INDOOR_BIKE_DATA_FLAGS.TOTAL_DISTANCE) {
                offset += 3;
            }
            if (flags & this.INDOOR_BIKE_DATA_FLAGS.RESISTANCE_LEVEL) {
                offset += 2;
            }
            if (flags & this.INDOOR_BIKE_DATA_FLAGS.INSTANTANEOUS_POWER) {
                if (offset + 2 <= data.length) {
                    metrics.watts = data.readInt16LE(offset);
                    offset += 2;
                }
            }
            if (flags & this.INDOOR_BIKE_DATA_FLAGS.AVERAGE_POWER) {
                offset += 2;
            }
            if (flags & this.INDOOR_BIKE_DATA_FLAGS.EXPENDED_ENERGY) {
                offset += 4;
            }
            if (flags & this.INDOOR_BIKE_DATA_FLAGS.HEART_RATE) {
                if (offset + 1 <= data.length) {
                    metrics.heartRate = data.readUInt8(offset);
                    offset += 1;
                }
            }
            this.emit('metricsUpdate', metrics);
            return metrics;
        }
        catch (error) {
            console.error('Error parsing Indoor Bike Data:', error);
            return null;
        }
    }
    createSetTargetPowerCommand(targetWatts) {
        const buffer = Buffer.alloc(3);
        buffer.writeUInt8(0x05, 0);
        buffer.writeInt16LE(targetWatts, 1);
        return buffer;
    }
    createSetTargetResistanceCommand(resistanceLevel) {
        const buffer = Buffer.alloc(2);
        buffer.writeUInt8(0x04, 0);
        buffer.writeUInt8(Math.round(resistanceLevel * 10), 1);
        return buffer;
    }
    createStartTrainingCommand() {
        const buffer = Buffer.alloc(1);
        buffer.writeUInt8(0x07, 0);
        return buffer;
    }
    createStopTrainingCommand(stopType = 1) {
        const buffer = Buffer.alloc(2);
        buffer.writeUInt8(0x08, 0);
        buffer.writeUInt8(stopType, 1);
        return buffer;
    }
}
exports.FTMSService = FTMSService;
