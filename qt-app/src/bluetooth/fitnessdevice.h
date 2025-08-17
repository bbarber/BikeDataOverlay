#pragma once

#include <QObject>
#include <QLowEnergyController>
#include <QLowEnergyService>
#include "ftmsprotocol.h"
#include "../models/cyclingmetrics.h"

class FitnessDevice : public QObject
{
    Q_OBJECT

public:
    enum class ConnectionState {
        Disconnected,
        Connecting,
        Connected,
        Error
    };

    explicit FitnessDevice(const QBluetoothDeviceInfo &deviceInfo, QObject *parent = nullptr);
    ~FitnessDevice();

    QString name() const;
    QString address() const;
    ConnectionState connectionState() const { return m_connectionState; }

    void connectToDevice();
    void disconnectFromDevice();

signals:
    void connectionStateChanged(ConnectionState state);
    void dataReceived(const FTMSProtocol::TrainerData &data);
    void errorOccurred(const QString &error);

private slots:
    void onDeviceConnected();
    void onDeviceDisconnected();
    void onControllerError(QLowEnergyController::Error error);
    void onServiceDiscovered(const QBluetoothUuid &serviceUuid);
    void onServiceDiscoveryFinished();
    void onServiceStateChanged(QLowEnergyService::ServiceState state);
    void onCharacteristicChanged(const QLowEnergyCharacteristic &characteristic, const QByteArray &value);

private:
    void setConnectionState(ConnectionState state);
    void setupFTMSService();
    void setupHeartRateService();

    QBluetoothDeviceInfo m_deviceInfo;
    QLowEnergyController *m_controller;
    QLowEnergyService *m_ftmsService;
    QLowEnergyService *m_heartRateService;
    ConnectionState m_connectionState;
};