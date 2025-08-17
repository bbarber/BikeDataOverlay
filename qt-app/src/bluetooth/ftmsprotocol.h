#pragma once

#include <QObject>
#include <QByteArray>

// FTMS (Fitness Machine Service) Protocol Constants
namespace FTMS {
    // Service UUID
    const QString SERVICE_UUID = "00001826-0000-1000-8000-00805f9b34fb";
    
    // Characteristic UUIDs
    const QString INDOOR_BIKE_DATA_UUID = "00002AD2-0000-1000-8000-00805f9b34fb";
    const QString FITNESS_MACHINE_FEATURE_UUID = "00002ACC-0000-1000-8000-00805f9b34fb";
    const QString FITNESS_MACHINE_CONTROL_POINT_UUID = "00002AD9-0000-1000-8000-00805f9b34fb";
    const QString TRAINING_STATUS_UUID = "00002AD3-0000-1000-8000-00805f9b34fb";
}

// Heart Rate Service (HRS) Protocol Constants
namespace HRS {
    // Service UUID
    const QString SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb";
    
    // Characteristic UUIDs
    const QString HEART_RATE_MEASUREMENT_UUID = "00002a37-0000-1000-8000-00805f9b34fb";
    const QString BODY_SENSOR_LOCATION_UUID = "00002a38-0000-1000-8000-00805f9b34fb";
    const QString HEART_RATE_CONTROL_POINT_UUID = "00002a39-0000-1000-8000-00805f9b34fb";
    
    // Indoor Bike Data flags
    enum class IndoorBikeDataFlags : quint16 {
        MoreData = 0x0001,
        AverageSpeedPresent = 0x0002,
        InstantaneousCadencePresent = 0x0004,
        AverageCadencePresent = 0x0008,
        TotalDistancePresent = 0x0010,
        ResistanceLevelPresent = 0x0020,
        InstantaneousPowerPresent = 0x0040,
        AveragePowerPresent = 0x0080,
        ExpendedEnergyPresent = 0x0100,
        HeartRatePresent = 0x0200,
        MetabolicEquivalentPresent = 0x0400,
        ElapsedTimePresent = 0x0800,
        RemainingTimePresent = 0x1000
    };
}

class FTMSProtocol : public QObject
{
    Q_OBJECT

public:
    struct TrainerData {
        double speed = 0.0;        // km/h
        int cadence = 0;          // RPM
        int power = 0;            // Watts
        int heartRate = 0;        // BPM
        double distance = 0.0;    // meters
        int resistanceLevel = 0;
        double expendedEnergy = 0.0; // calories
        quint16 elapsedTime = 0;  // seconds
        bool isDataValid = false;
    };

    explicit FTMSProtocol(QObject *parent = nullptr);

    static TrainerData parseIndoorBikeData(const QByteArray &data);
    static TrainerData parseHeartRateData(const QByteArray &data);
    static bool isValidFTMSService(const QString &serviceUuid);
    static bool isValidHeartRateService(const QString &serviceUuid);

private:
    static quint16 readUInt16(const QByteArray &data, int offset);
    static qint16 readSInt16(const QByteArray &data, int offset);
};