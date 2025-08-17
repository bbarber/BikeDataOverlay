#include "ftmsprotocol.h"
#include <QDebug>

FTMSProtocol::FTMSProtocol(QObject *parent)
    : QObject(parent)
{
}

FTMSProtocol::TrainerData FTMSProtocol::parseIndoorBikeData(const QByteArray &data)
{
    TrainerData result;
    
    if (data.size() < 4) {
        qDebug() << "Invalid FTMS data size:" << data.size();
        return result;
    }

    int offset = 0;
    
    // Read flags (first 2 bytes)
    quint16 flags = readUInt16(data, offset);
    offset += 2;
    
    // Read instantaneous speed (always present, next 2 bytes)
    if (offset + 2 <= data.size()) {
        quint16 speedRaw = readUInt16(data, offset);
        result.speed = speedRaw / 100.0; // Resolution: 0.01 km/h
        offset += 2;
    }
    
    // Check for average speed
    if (flags & static_cast<quint16>(FTMS::IndoorBikeDataFlags::AverageSpeedPresent)) {
        if (offset + 2 <= data.size()) {
            offset += 2; // Skip average speed for now
        }
    }
    
    // Check for instantaneous cadence
    if (flags & static_cast<quint16>(FTMS::IndoorBikeDataFlags::InstantaneousCadencePresent)) {
        if (offset + 2 <= data.size()) {
            quint16 cadenceRaw = readUInt16(data, offset);
            result.cadence = cadenceRaw / 2; // Resolution: 0.5 RPM
            offset += 2;
        }
    }
    
    // Check for average cadence
    if (flags & static_cast<quint16>(FTMS::IndoorBikeDataFlags::AverageCadencePresent)) {
        if (offset + 2 <= data.size()) {
            offset += 2; // Skip average cadence for now
        }
    }
    
    // Check for total distance
    if (flags & static_cast<quint16>(FTMS::IndoorBikeDataFlags::TotalDistancePresent)) {
        if (offset + 3 <= data.size()) {
            // Total distance is 3 bytes (24-bit)
            quint32 distanceRaw = static_cast<quint8>(data[offset]) |
                                 (static_cast<quint8>(data[offset + 1]) << 8) |
                                 (static_cast<quint8>(data[offset + 2]) << 16);
            result.distance = distanceRaw; // Resolution: 1 meter
            offset += 3;
        }
    }
    
    // Check for resistance level
    if (flags & static_cast<quint16>(FTMS::IndoorBikeDataFlags::ResistanceLevelPresent)) {
        if (offset + 2 <= data.size()) {
            qint16 resistanceRaw = readSInt16(data, offset);
            result.resistanceLevel = resistanceRaw; // Resolution: 1
            offset += 2;
        }
    }
    
    // Check for instantaneous power
    if (flags & static_cast<quint16>(FTMS::IndoorBikeDataFlags::InstantaneousPowerPresent)) {
        if (offset + 2 <= data.size()) {
            qint16 powerRaw = readSInt16(data, offset);
            result.power = powerRaw; // Resolution: 1 Watt
            offset += 2;
        }
    }
    
    // Check for average power
    if (flags & static_cast<quint16>(FTMS::IndoorBikeDataFlags::AveragePowerPresent)) {
        if (offset + 2 <= data.size()) {
            offset += 2; // Skip average power for now
        }
    }
    
    // Check for expended energy
    if (flags & static_cast<quint16>(FTMS::IndoorBikeDataFlags::ExpendedEnergyPresent)) {
        if (offset + 4 <= data.size()) {
            quint16 totalEnergy = readUInt16(data, offset);
            quint16 energyPerHour = readUInt16(data, offset + 2);
            result.expendedEnergy = totalEnergy; // Using total energy in calories
            offset += 4;
        }
    }
    
    // Check for heart rate
    if (flags & static_cast<quint16>(FTMS::IndoorBikeDataFlags::HeartRatePresent)) {
        if (offset + 1 <= data.size()) {
            result.heartRate = static_cast<quint8>(data[offset]); // Resolution: 1 BPM
            offset += 1;
        }
    }
    
    // Check for metabolic equivalent
    if (flags & static_cast<quint16>(FTMS::IndoorBikeDataFlags::MetabolicEquivalentPresent)) {
        if (offset + 1 <= data.size()) {
            offset += 1; // Skip metabolic equivalent for now
        }
    }
    
    // Check for elapsed time
    if (flags & static_cast<quint16>(FTMS::IndoorBikeDataFlags::ElapsedTimePresent)) {
        if (offset + 2 <= data.size()) {
            result.elapsedTime = readUInt16(data, offset); // Resolution: 1 second
            offset += 2;
        }
    }
    
    result.isDataValid = true;
    return result;
}

FTMSProtocol::TrainerData FTMSProtocol::parseHeartRateData(const QByteArray &data)
{
    TrainerData result;
    
    if (data.size() < 2) {
        qDebug() << "Invalid heart rate data size:" << data.size();
        return result;
    }

    int offset = 0;
    
    // Read flags (first byte)
    quint8 flags = static_cast<quint8>(data[offset]);
    offset += 1;
    
    // Check if heart rate value format is 16-bit (bit 0 of flags)
    bool is16Bit = flags & 0x01;
    
    // Read heart rate value
    if (is16Bit) {
        if (offset + 2 <= data.size()) {
            result.heartRate = readUInt16(data, offset);
            offset += 2;
        }
    } else {
        if (offset + 1 <= data.size()) {
            result.heartRate = static_cast<quint8>(data[offset]);
            offset += 1;
        }
    }
    
    // TODO: Parse additional fields like RR intervals if needed
    
    result.isDataValid = true;
    return result;
}

bool FTMSProtocol::isValidFTMSService(const QString &serviceUuid)
{
    return serviceUuid.compare(FTMS::SERVICE_UUID, Qt::CaseInsensitive) == 0;
}

bool FTMSProtocol::isValidHeartRateService(const QString &serviceUuid)
{
    return serviceUuid.compare(HRS::SERVICE_UUID, Qt::CaseInsensitive) == 0;
}

quint16 FTMSProtocol::readUInt16(const QByteArray &data, int offset)
{
    if (offset + 2 > data.size()) {
        return 0;
    }
    
    return static_cast<quint8>(data[offset]) |
           (static_cast<quint8>(data[offset + 1]) << 8);
}

qint16 FTMSProtocol::readSInt16(const QByteArray &data, int offset)
{
    return static_cast<qint16>(readUInt16(data, offset));
}