#include "mainwindow.h"
#include <QApplication>
#include <QMessageBox>
#include <QDebug>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
    , m_bluetoothManager(new BluetoothManager(this))
    , m_overlayWindow(new OverlayWindow(this))
{
    setupUI();
    
    // Connect Bluetooth manager signals
    connect(m_bluetoothManager, &BluetoothManager::deviceDiscovered,
            this, &MainWindow::onDeviceDiscovered);
    connect(m_bluetoothManager, &BluetoothManager::discoveryFinished,
            this, &MainWindow::onDiscoveryFinished);
    connect(m_bluetoothManager, &BluetoothManager::deviceConnected,
            this, &MainWindow::onDeviceConnected);
    connect(m_bluetoothManager, &BluetoothManager::deviceDisconnected,
            this, &MainWindow::onDeviceDisconnected);
    connect(m_bluetoothManager, &BluetoothManager::dataReceived,
            this, &MainWindow::onDataReceived);
    connect(m_bluetoothManager, &BluetoothManager::errorOccurred,
            this, &MainWindow::onBluetoothError);

    updateConnectionStatus();
    
    // Show overlay window
    m_overlayWindow->show();
}

MainWindow::~MainWindow()
{
    if (m_overlayWindow) {
        m_overlayWindow->close();
    }
}

void MainWindow::setupUI()
{
    setWindowTitle("Bike Data Overlay - Control Panel");
    setMinimumSize(400, 600);
    
    m_centralWidget = new QWidget(this);
    setCentralWidget(m_centralWidget);
    
    m_mainLayout = new QVBoxLayout(m_centralWidget);
    m_mainLayout->setSpacing(15);
    m_mainLayout->setContentsMargins(15, 15, 15, 15);

    // Device scanning section
    m_scanGroupBox = new QGroupBox("Device Discovery", this);
    QVBoxLayout *scanLayout = new QVBoxLayout(m_scanGroupBox);
    
    m_scanButton = new QPushButton("Scan for Devices", this);
    connect(m_scanButton, &QPushButton::clicked, this, &MainWindow::onScanButtonClicked);
    scanLayout->addWidget(m_scanButton);
    
    m_scanStatusLabel = new QLabel("Click 'Scan for Devices' to start", this);
    m_scanStatusLabel->setStyleSheet("color: #666;");
    scanLayout->addWidget(m_scanStatusLabel);
    
    m_deviceListWidget = new QListWidget(this);
    m_deviceListWidget->setMaximumHeight(150);
    connect(m_deviceListWidget, &QListWidget::itemSelectionChanged,
            this, &MainWindow::onDeviceSelectionChanged);
    scanLayout->addWidget(m_deviceListWidget);
    
    m_mainLayout->addWidget(m_scanGroupBox);

    // Connection section
    m_connectionGroupBox = new QGroupBox("Device Connection", this);
    QVBoxLayout *connectionLayout = new QVBoxLayout(m_connectionGroupBox);
    
    QHBoxLayout *buttonLayout = new QHBoxLayout();
    m_connectButton = new QPushButton("Connect", this);
    m_connectButton->setEnabled(false);
    connect(m_connectButton, &QPushButton::clicked, this, &MainWindow::onConnectButtonClicked);
    buttonLayout->addWidget(m_connectButton);
    
    m_disconnectButton = new QPushButton("Disconnect", this);
    m_disconnectButton->setEnabled(false);
    connect(m_disconnectButton, &QPushButton::clicked, this, &MainWindow::onDisconnectButtonClicked);
    buttonLayout->addWidget(m_disconnectButton);
    
    connectionLayout->addLayout(buttonLayout);
    
    m_connectionStatusLabel = new QLabel("Not connected", this);
    m_connectionStatusLabel->setStyleSheet("color: #666;");
    connectionLayout->addWidget(m_connectionStatusLabel);
    
    m_mainLayout->addWidget(m_connectionGroupBox);

    // Data display section
    m_dataGroupBox = new QGroupBox("Live Data", this);
    QVBoxLayout *dataLayout = new QVBoxLayout(m_dataGroupBox);
    
    m_powerValueLabel = new QLabel("Power: 0 W", this);
    m_powerValueLabel->setStyleSheet("font-size: 16px; font-weight: bold; color: #00aa00;");
    dataLayout->addWidget(m_powerValueLabel);
    
    m_cadenceValueLabel = new QLabel("Cadence: 0 RPM", this);
    m_cadenceValueLabel->setStyleSheet("font-size: 14px; color: #aa6600;");
    dataLayout->addWidget(m_cadenceValueLabel);
    
    m_speedValueLabel = new QLabel("Speed: 0.0 km/h", this);
    m_speedValueLabel->setStyleSheet("font-size: 14px; color: #0066aa;");
    dataLayout->addWidget(m_speedValueLabel);
    
    m_heartRateValueLabel = new QLabel("Heart Rate: 0 BPM", this);
    m_heartRateValueLabel->setStyleSheet("font-size: 14px; color: #aa0066;");
    dataLayout->addWidget(m_heartRateValueLabel);
    
    m_mainLayout->addWidget(m_dataGroupBox);

    // Settings section
    m_settingsGroupBox = new QGroupBox("Settings", this);
    QVBoxLayout *settingsLayout = new QVBoxLayout(m_settingsGroupBox);
    
    m_overlayModeCheckBox = new QCheckBox("Overlay Mode", this);
    m_overlayModeCheckBox->setChecked(true);
    connect(m_overlayModeCheckBox, &QCheckBox::toggled,
            this, &MainWindow::onOverlayModeToggled);
    settingsLayout->addWidget(m_overlayModeCheckBox);
    
    m_mainLayout->addWidget(m_settingsGroupBox);
    
    // Add stretch to push everything to the top
    m_mainLayout->addStretch();
}

void MainWindow::onScanButtonClicked()
{
    if (m_bluetoothManager->isDiscovering()) {
        m_bluetoothManager->stopDeviceDiscovery();
        m_scanButton->setText("Scan for Devices");
        m_scanStatusLabel->setText("Scan stopped");
    } else {
        m_deviceListWidget->clear();
        m_bluetoothManager->startDeviceDiscovery();
        m_scanButton->setText("Stop Scan");
        m_scanStatusLabel->setText("Scanning for devices...");
    }
}

void MainWindow::onConnectButtonClicked()
{
    QListWidgetItem *selectedItem = m_deviceListWidget->currentItem();
    if (!selectedItem) {
        return;
    }

    // Find the device info for the selected item
    QVariant deviceData = selectedItem->data(Qt::UserRole);
    if (deviceData.canConvert<QBluetoothDeviceInfo>()) {
        QBluetoothDeviceInfo deviceInfo = deviceData.value<QBluetoothDeviceInfo>();
        m_bluetoothManager->connectToDevice(deviceInfo);
        m_connectionStatusLabel->setText("Connecting...");
        m_connectButton->setEnabled(false);
    }
}

void MainWindow::onDisconnectButtonClicked()
{
    m_bluetoothManager->disconnectCurrentDevice();
}

void MainWindow::onDeviceDiscovered(const QBluetoothDeviceInfo &device)
{
    QString deviceText = device.name();
    if (deviceText.isEmpty()) {
        deviceText = device.address().toString();
    } else {
        deviceText += QString(" (%1)").arg(device.address().toString());
    }

    QListWidgetItem *item = new QListWidgetItem(deviceText, m_deviceListWidget);
    item->setData(Qt::UserRole, QVariant::fromValue(device));
    
    qDebug() << "Added device to list:" << deviceText;
}

void MainWindow::onDiscoveryFinished()
{
    m_scanButton->setText("Scan for Devices");
    m_scanStatusLabel->setText(QString("Found %1 device(s)").arg(m_deviceListWidget->count()));
}

void MainWindow::onDeviceConnected(FitnessDevice *device)
{
    Q_UNUSED(device)
    updateConnectionStatus();
}

void MainWindow::onDeviceDisconnected()
{
    updateConnectionStatus();
}

void MainWindow::onDataReceived(const FTMSProtocol::TrainerData &data)
{
    // Update main window display
    m_powerValueLabel->setText(QString("Power: %1 W").arg(data.power));
    m_cadenceValueLabel->setText(QString("Cadence: %1 RPM").arg(data.cadence));
    m_speedValueLabel->setText(QString("Speed: %1 km/h").arg(data.speed, 0, 'f', 1));
    
    if (data.heartRate > 0) {
        m_heartRateValueLabel->setText(QString("Heart Rate: %1 BPM").arg(data.heartRate));
    }

    // Update overlay window
    m_overlayWindow->updateMetrics(data);
}

void MainWindow::onBluetoothError(const QString &error)
{
    QMessageBox::warning(this, "Bluetooth Error", error);
    m_scanStatusLabel->setText("Error: " + error);
    updateConnectionStatus();
}

void MainWindow::onDeviceSelectionChanged()
{
    bool hasSelection = m_deviceListWidget->currentItem() != nullptr;
    bool isConnected = m_bluetoothManager->connectedDevice() != nullptr;
    
    m_connectButton->setEnabled(hasSelection && !isConnected);
}

void MainWindow::onOverlayModeToggled(bool enabled)
{
    m_overlayWindow->setOverlayMode(enabled);
}

void MainWindow::updateConnectionStatus()
{
    FitnessDevice *device = m_bluetoothManager->connectedDevice();
    bool isConnected = (device != nullptr);
    
    if (isConnected) {
        m_connectionStatusLabel->setText("Connected to " + device->name());
        m_connectionStatusLabel->setStyleSheet("color: #00aa00; font-weight: bold;");
        m_disconnectButton->setEnabled(true);
        m_connectButton->setEnabled(false);
    } else {
        m_connectionStatusLabel->setText("Not connected");
        m_connectionStatusLabel->setStyleSheet("color: #666;");
        m_disconnectButton->setEnabled(false);
        onDeviceSelectionChanged(); // Update connect button state
    }
}