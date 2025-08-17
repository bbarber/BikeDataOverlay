#include "fitnessdevice.h"
#include <QDebug>

FitnessDevice::FitnessDevice(const QBluetoothDeviceInfo &deviceInfo, QObject *parent)
    : QObject(parent)
    , m_deviceInfo(deviceInfo)
    , m_controller(nullptr)
    , m_ftmsService(nullptr)
    , m_connectionState(ConnectionState::Disconnected)
{
}

FitnessDevice::~FitnessDevice()
{
    if (m_controller) {
        m_controller->disconnectFromDevice();
        m_controller->deleteLater();
    }
}

QString FitnessDevice::name() const
{
    return m_deviceInfo.name();
}

QString FitnessDevice::address() const
{
    return m_deviceInfo.address().toString();
}

void FitnessDevice::connectToDevice()
{
    if (m_connectionState != ConnectionState::Disconnected) {
        return;
    }

    setConnectionState(ConnectionState::Connecting);

    if (m_controller) {
        m_controller->deleteLater();
    }

    m_controller = QLowEnergyController::createCentral(m_deviceInfo, this);
    
    connect(m_controller, &QLowEnergyController::connected,
            this, &FitnessDevice::onDeviceConnected);
    connect(m_controller, &QLowEnergyController::disconnected,
            this, &FitnessDevice::onDeviceDisconnected);
    connect(m_controller, QOverload<QLowEnergyController::Error>::of(&QLowEnergyController::errorOccurred),
            this, &FitnessDevice::onControllerError);
    connect(m_controller, &QLowEnergyController::serviceDiscovered,
            this, &FitnessDevice::onServiceDiscovered);
    connect(m_controller, &QLowEnergyController::discoveryFinished,
            this, &FitnessDevice::onServiceDiscoveryFinished);

    qDebug() << "Connecting to device:" << name();
    m_controller->connectToDevice();
}

void FitnessDevice::disconnectFromDevice()
{
    if (m_controller && m_connectionState != ConnectionState::Disconnected) {
        m_controller->disconnectFromDevice();
    }
}

void FitnessDevice::setConnectionState(ConnectionState state)
{
    if (m_connectionState == state) {
        return;
    }
    
    m_connectionState = state;
    emit connectionStateChanged(state);
}

void FitnessDevice::onDeviceConnected()
{
    qDebug() << "Device connected, starting service discovery";
    m_controller->discoverServices();
}

void FitnessDevice::onDeviceDisconnected()
{
    qDebug() << "Device disconnected";
    setConnectionState(ConnectionState::Disconnected);
    
    if (m_ftmsService) {
        m_ftmsService->deleteLater();
        m_ftmsService = nullptr;
    }
}

void FitnessDevice::onControllerError(QLowEnergyController::Error error)
{
    QString errorString;
    switch (error) {
        case QLowEnergyController::NoError:
            return;
        case QLowEnergyController::UnknownRemoteDeviceError:
            errorString = "Unknown remote device error";
            break;
        case QLowEnergyController::InvalidBluetoothAdapterError:
            errorString = "Invalid Bluetooth adapter";
            break;
        case QLowEnergyController::NetworkError:
            errorString = "Network error";
            break;
        case QLowEnergyController::RemoteHostClosedError:
            errorString = "Remote host closed connection";
            break;
        case QLowEnergyController::ConnectionError:
            errorString = "Connection error";
            break;
        default:
            errorString = "Unknown error";
            break;
    }
    
    qDebug() << "Controller error:" << errorString;
    setConnectionState(ConnectionState::Error);
    emit errorOccurred(errorString);
}

void FitnessDevice::onServiceDiscovered(const QBluetoothUuid &serviceUuid)
{
    qDebug() << "Service discovered:" << serviceUuid.toString();
    
    if (FTMSProtocol::isValidFTMSService(serviceUuid.toString())) {
        qDebug() << "Found FTMS service";
    }
}

void FitnessDevice::onServiceDiscoveryFinished()
{
    qDebug() << "Service discovery finished";
    
    // Look for FTMS service
    const QBluetoothUuid ftmsUuid(FTMS::SERVICE_UUID);
    if (m_controller->services().contains(ftmsUuid)) {
        setupFTMSService();
    } else {
        qDebug() << "FTMS service not found";
        emit errorOccurred("FTMS service not found on device");
        setConnectionState(ConnectionState::Error);
    }
}

void FitnessDevice::setupFTMSService()
{
    const QBluetoothUuid ftmsUuid(FTMS::SERVICE_UUID);
    m_ftmsService = m_controller->createServiceObject(ftmsUuid, this);
    
    if (!m_ftmsService) {
        qDebug() << "Failed to create FTMS service object";
        emit errorOccurred("Failed to create FTMS service");
        setConnectionState(ConnectionState::Error);
        return;
    }

    connect(m_ftmsService, &QLowEnergyService::stateChanged,
            this, &FitnessDevice::onServiceStateChanged);
    connect(m_ftmsService, &QLowEnergyService::characteristicChanged,
            this, &FitnessDevice::onCharacteristicChanged);

    qDebug() << "Discovering FTMS service details";
    m_ftmsService->discoverDetails();
}

void FitnessDevice::onServiceStateChanged(QLowEnergyService::ServiceState state)
{
    switch (state) {
        case QLowEnergyService::RemoteServiceDiscovering:
            qDebug() << "Discovering service details...";
            break;
        case QLowEnergyService::RemoteServiceDiscovered:
        {
            qDebug() << "FTMS service details discovered";
            
            // Subscribe to Indoor Bike Data characteristic
            const QBluetoothUuid indoorBikeDataUuid(FTMS::INDOOR_BIKE_DATA_UUID);
            const QLowEnergyCharacteristic characteristic = 
                m_ftmsService->characteristic(indoorBikeDataUuid);
            
            if (characteristic.isValid()) {
                if (characteristic.properties() & QLowEnergyCharacteristic::Notify) {
                    const QLowEnergyDescriptor descriptor = 
                        characteristic.clientCharacteristicConfiguration();
                    if (descriptor.isValid()) {
                        qDebug() << "Enabling notifications for indoor bike data";
                        m_ftmsService->writeDescriptor(descriptor, 
                            QLowEnergyCharacteristic::CCCDEnableNotification);
                        setConnectionState(ConnectionState::Connected);
                    }
                } else {
                    qDebug() << "Indoor bike data characteristic does not support notifications";
                }
            } else {
                qDebug() << "Indoor bike data characteristic not found";
            }
            break;
        }
        case QLowEnergyService::InvalidService:
            qDebug() << "Invalid FTMS service";
            emit errorOccurred("Invalid FTMS service");
            setConnectionState(ConnectionState::Error);
            break;
        default:
            break;
    }
}

void FitnessDevice::onCharacteristicChanged(const QLowEnergyCharacteristic &characteristic, const QByteArray &value)
{
    const QBluetoothUuid indoorBikeDataUuid(FTMS::INDOOR_BIKE_DATA_UUID);
    
    if (characteristic.uuid() == indoorBikeDataUuid) {
        FTMSProtocol::TrainerData data = FTMSProtocol::parseIndoorBikeData(value);
        if (data.isDataValid) {
            emit dataReceived(data);
        }
    }
}