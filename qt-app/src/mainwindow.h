#pragma once

#include <QMainWindow>
#include <QPushButton>
#include <QListWidget>
#include <QLabel>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QGroupBox>
#include <QCheckBox>
#include "bluetooth/bluetoothmanager.h"
#include "overlay/overlaywindow.h"

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

private slots:
    void onScanButtonClicked();
    void onConnectButtonClicked();
    void onDisconnectButtonClicked();
    void onDeviceDiscovered(const QBluetoothDeviceInfo &device);
    void onDiscoveryFinished();
    void onDeviceConnected(FitnessDevice *device);
    void onDeviceDisconnected();
    void onDataReceived(const FTMSProtocol::TrainerData &data);
    void onBluetoothError(const QString &error);
    void onDeviceSelectionChanged();
    void onOverlayModeToggled(bool enabled);

private:
    void setupUI();
    void updateConnectionStatus();
    void updateDeviceList();

    // UI Elements
    QWidget *m_centralWidget;
    QVBoxLayout *m_mainLayout;
    
    // Device scanning section
    QGroupBox *m_scanGroupBox;
    QPushButton *m_scanButton;
    QListWidget *m_deviceListWidget;
    QLabel *m_scanStatusLabel;
    
    // Connection section
    QGroupBox *m_connectionGroupBox;
    QPushButton *m_connectButton;
    QPushButton *m_disconnectButton;
    QLabel *m_connectionStatusLabel;
    
    // Data display section
    QGroupBox *m_dataGroupBox;
    QLabel *m_powerValueLabel;
    QLabel *m_cadenceValueLabel;
    QLabel *m_speedValueLabel;
    QLabel *m_heartRateValueLabel;
    
    // Settings section
    QGroupBox *m_settingsGroupBox;
    QCheckBox *m_overlayModeCheckBox;

    // Core components
    BluetoothManager *m_bluetoothManager;
    OverlayWindow *m_overlayWindow;
};