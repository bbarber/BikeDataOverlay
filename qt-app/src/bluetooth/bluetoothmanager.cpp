#include "bluetoothmanager.h"
#include <QDebug>

BluetoothManager::BluetoothManager(QObject *parent)
    : QObject(parent)
    , m_discoveryAgent(new QBluetoothDeviceDiscoveryAgent(this))
    , m_connectedDevice(nullptr)
{
    connect(m_discoveryAgent, &QBluetoothDeviceDiscoveryAgent::deviceDiscovered,
            this, &BluetoothManager::onDeviceDiscovered);
    connect(m_discoveryAgent, &QBluetoothDeviceDiscoveryAgent::finished,
            this, &BluetoothManager::onDiscoveryFinished);
    connect(m_discoveryAgent, QOverload<QBluetoothDeviceDiscoveryAgent::Error>::of(&QBluetoothDeviceDiscoveryAgent::errorOccurred),
            this, &BluetoothManager::onDiscoveryError);
}

BluetoothManager::~BluetoothManager()
{
    if (m_connectedDevice) {
        m_connectedDevice->deleteLater();
    }
}

void BluetoothManager::startDeviceDiscovery()
{
    qDebug() << "Starting Bluetooth device discovery";
    m_discoveredDevices.clear();
    m_discoveryAgent->start(QBluetoothDeviceDiscoveryAgent::LowEnergyMethod);
}

void BluetoothManager::stopDeviceDiscovery()
{
    if (m_discoveryAgent->isActive()) {
        m_discoveryAgent->stop();
    }
}

bool BluetoothManager::isDiscovering() const
{
    return m_discoveryAgent->isActive();
}

void BluetoothManager::connectToDevice(const QBluetoothDeviceInfo &deviceInfo)
{
    if (m_connectedDevice) {
        disconnectCurrentDevice();
    }

    qDebug() << "Creating connection to device:" << deviceInfo.name();
    m_connectedDevice = new FitnessDevice(deviceInfo, this);
    
    connect(m_connectedDevice, &FitnessDevice::connectionStateChanged,
            this, &BluetoothManager::onDeviceConnectionStateChanged);
    connect(m_connectedDevice, &FitnessDevice::dataReceived,
            this, &BluetoothManager::onDeviceDataReceived);
    connect(m_connectedDevice, &FitnessDevice::errorOccurred,
            this, &BluetoothManager::onDeviceError);

    m_connectedDevice->connectToDevice();
}

void BluetoothManager::disconnectCurrentDevice()
{
    if (m_connectedDevice) {
        m_connectedDevice->disconnectFromDevice();
        m_connectedDevice->deleteLater();
        m_connectedDevice = nullptr;
        emit deviceDisconnected();
    }
}

void BluetoothManager::onDeviceDiscovered(const QBluetoothDeviceInfo &device)
{
    if (isFitnessDevice(device)) {
        qDebug() << "Fitness device discovered:" << device.name() << device.address().toString();
        m_discoveredDevices.append(device);
        emit deviceDiscovered(device);
    }
}

void BluetoothManager::onDiscoveryFinished()
{
    qDebug() << "Device discovery finished. Found" << m_discoveredDevices.size() << "fitness devices";
    emit discoveryFinished();
}

void BluetoothManager::onDiscoveryError(QBluetoothDeviceDiscoveryAgent::Error error)
{
    QString errorString;
    switch (error) {
        case QBluetoothDeviceDiscoveryAgent::NoError:
            return;
        case QBluetoothDeviceDiscoveryAgent::PoweredOffError:
            errorString = "Bluetooth adapter is powered off";
            break;
        case QBluetoothDeviceDiscoveryAgent::InputOutputError:
            errorString = "Input/Output error during discovery";
            break;
        case QBluetoothDeviceDiscoveryAgent::InvalidBluetoothAdapterError:
            errorString = "Invalid Bluetooth adapter";
            break;
        case QBluetoothDeviceDiscoveryAgent::UnsupportedPlatformError:
            errorString = "Platform does not support Bluetooth";
            break;
        case QBluetoothDeviceDiscoveryAgent::UnsupportedDiscoveryMethod:
            errorString = "Unsupported discovery method";
            break;
        case QBluetoothDeviceDiscoveryAgent::LocationServiceTurnedOffError:
            errorString = "Location services are turned off";
            break;
        default:
            errorString = "Unknown discovery error";
            break;
    }
    
    qDebug() << "Discovery error:" << errorString;
    emit errorOccurred(errorString);
}

void BluetoothManager::onDeviceConnectionStateChanged(FitnessDevice::ConnectionState state)
{
    switch (state) {
        case FitnessDevice::ConnectionState::Connected:
            qDebug() << "Device connected successfully";
            emit deviceConnected(m_connectedDevice);
            break;
        case FitnessDevice::ConnectionState::Disconnected:
            qDebug() << "Device disconnected";
            emit deviceDisconnected();
            break;
        case FitnessDevice::ConnectionState::Error:
            qDebug() << "Device connection error";
            break;
        default:
            break;
    }
}

void BluetoothManager::onDeviceDataReceived(const FTMSProtocol::TrainerData &data)
{
    emit dataReceived(data);
}

void BluetoothManager::onDeviceError(const QString &error)
{
    emit errorOccurred(error);
}

bool BluetoothManager::isFitnessDevice(const QBluetoothDeviceInfo &device) const
{
    // Check if device supports Low Energy
    if (!(device.coreConfigurations() & QBluetoothDeviceInfo::LowEnergyCoreConfiguration)) {
        return false;
    }

    // Check service UUIDs for FTMS or Heart Rate Service
    const QList<QBluetoothUuid> serviceUuids = device.serviceUuids();
    for (const QBluetoothUuid &uuid : serviceUuids) {
        if (FTMSProtocol::isValidFTMSService(uuid.toString()) ||
            FTMSProtocol::isValidHeartRateService(uuid.toString())) {
            return true;
        }
    }

    // Also check device name for common fitness device keywords
    const QString deviceName = device.name().toLower();
    const QStringList fitnessKeywords = {
        "trainer", "bike", "zwift", "wahoo", "tacx", "elite", 
        "kickr", "neo", "flux", "direto", "cycleops", "kinetic",
        "heart", "hr", "polar", "garmin", "chest", "rhythm"
    };
    
    for (const QString &keyword : fitnessKeywords) {
        if (deviceName.contains(keyword)) {
            return true;
        }
    }

    return false;
}