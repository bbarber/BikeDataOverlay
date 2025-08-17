#pragma once

#include <QObject>
#include <QBluetoothDeviceDiscoveryAgent>
#include <QBluetoothDeviceInfo>
#include <QList>
#include "fitnessdevice.h"

class BluetoothManager : public QObject
{
    Q_OBJECT

public:
    explicit BluetoothManager(QObject *parent = nullptr);
    ~BluetoothManager();

    void startDeviceDiscovery();
    void stopDeviceDiscovery();
    bool isDiscovering() const;

    QList<QBluetoothDeviceInfo> discoveredDevices() const { return m_discoveredDevices; }
    FitnessDevice* connectedDevice() const { return m_connectedDevice; }

    void connectToDevice(const QBluetoothDeviceInfo &deviceInfo);
    void disconnectCurrentDevice();

signals:
    void deviceDiscovered(const QBluetoothDeviceInfo &device);
    void discoveryFinished();
    void deviceConnected(FitnessDevice *device);
    void deviceDisconnected();
    void dataReceived(const FTMSProtocol::TrainerData &data);
    void errorOccurred(const QString &error);

private slots:
    void onDeviceDiscovered(const QBluetoothDeviceInfo &device);
    void onDiscoveryFinished();
    void onDiscoveryError(QBluetoothDeviceDiscoveryAgent::Error error);
    void onDeviceConnectionStateChanged(FitnessDevice::ConnectionState state);
    void onDeviceDataReceived(const FTMSProtocol::TrainerData &data);
    void onDeviceError(const QString &error);

private:
    bool isFitnessDevice(const QBluetoothDeviceInfo &device) const;

    QBluetoothDeviceDiscoveryAgent *m_discoveryAgent;
    QList<QBluetoothDeviceInfo> m_discoveredDevices;
    FitnessDevice *m_connectedDevice;
};