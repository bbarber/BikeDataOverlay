import { EventEmitter } from 'events';
export declare class FTMSService extends EventEmitter {
    private readonly FTMS_SERVICE_UUID;
    private readonly CHARACTERISTICS;
    private readonly INDOOR_BIKE_DATA_FLAGS;
    /**
     * Parse Indoor Bike Data characteristic (0x2AD2)
     */
    parseIndoorBikeData(data: Buffer): {
        watts: number;
        cadence: number;
        speed: number;
        heartRate: number;
    } | null;
    /**
     * Create a control point command for setting target power
     */
    createSetTargetPowerCommand(targetWatts: number): Buffer;
    /**
     * Create a control point command for setting target resistance
     */
    createSetTargetResistanceCommand(resistanceLevel: number): Buffer;
    /**
     * Create a control point command for starting/resuming training
     */
    createStartTrainingCommand(): Buffer;
    /**
     * Create a control point command for stopping/pausing training
     */
    createStopTrainingCommand(stopType?: number): Buffer;
}
