#include "overlaywindow.h"
#include <QPainter>
#include <QMouseEvent>
#include <QApplication>
#include <QScreen>

OverlayWindow::OverlayWindow(QWidget *parent)
    : QWidget(parent)
    , m_metrics(new CyclingMetrics(this))
    , m_updateTimer(new QTimer(this))
    , m_dragging(false)
    , m_overlayMode(true)
{
    setupUI();
    setupOverlayProperties();
    
    connect(m_updateTimer, &QTimer::timeout, this, &OverlayWindow::updateDisplay);
    m_updateTimer->start(100); // Update every 100ms
}

void OverlayWindow::setupUI()
{
    m_mainLayout = new QVBoxLayout(this);
    m_mainLayout->setContentsMargins(10, 10, 10, 10);
    m_mainLayout->setSpacing(5);

    // Title
    m_titleLabel = new QLabel("Bike Data", this);
    m_titleLabel->setAlignment(Qt::AlignCenter);
    m_titleLabel->setStyleSheet(
        "QLabel { "
        "font-size: 14px; "
        "font-weight: bold; "
        "color: white; "
        "background: rgba(0, 0, 0, 0.7); "
        "border-radius: 5px; "
        "padding: 5px; "
        "}"
    );
    m_mainLayout->addWidget(m_titleLabel);

    // Metrics layout
    QVBoxLayout *metricsLayout = new QVBoxLayout();
    metricsLayout->setSpacing(3);

    // Power
    m_powerLabel = new QLabel("Power: 0 W", this);
    m_powerLabel->setStyleSheet(
        "QLabel { "
        "font-size: 18px; "
        "font-weight: bold; "
        "color: #00ff00; "
        "background: rgba(0, 0, 0, 0.8); "
        "border-radius: 3px; "
        "padding: 8px; "
        "}"
    );
    metricsLayout->addWidget(m_powerLabel);

    // Cadence
    m_cadenceLabel = new QLabel("Cadence: 0 RPM", this);
    m_cadenceLabel->setStyleSheet(
        "QLabel { "
        "font-size: 16px; "
        "color: #ffff00; "
        "background: rgba(0, 0, 0, 0.8); "
        "border-radius: 3px; "
        "padding: 6px; "
        "}"
    );
    metricsLayout->addWidget(m_cadenceLabel);

    // Speed
    m_speedLabel = new QLabel("Speed: 0.0 km/h", this);
    m_speedLabel->setStyleSheet(
        "QLabel { "
        "font-size: 16px; "
        "color: #00ffff; "
        "background: rgba(0, 0, 0, 0.8); "
        "border-radius: 3px; "
        "padding: 6px; "
        "}"
    );
    metricsLayout->addWidget(m_speedLabel);

    // Heart Rate
    m_heartRateLabel = new QLabel("HR: 0 BPM", this);
    m_heartRateLabel->setStyleSheet(
        "QLabel { "
        "font-size: 16px; "
        "color: #ff6666; "
        "background: rgba(0, 0, 0, 0.8); "
        "border-radius: 3px; "
        "padding: 6px; "
        "}"
    );
    metricsLayout->addWidget(m_heartRateLabel);

    m_mainLayout->addLayout(metricsLayout);
    
    // Set fixed size
    setFixedSize(200, 180);
}

void OverlayWindow::setupOverlayProperties()
{
    // Set window flags for overlay behavior
    setWindowFlags(Qt::FramelessWindowHint | 
                   Qt::WindowStaysOnTopHint | 
                   Qt::Tool);
    
    // Make window transparent
    setAttribute(Qt::WA_TranslucentBackground);
    
    // Position in top-right corner
    QScreen *screen = QApplication::primaryScreen();
    if (screen) {
        QRect screenGeometry = screen->geometry();
        move(screenGeometry.width() - width() - 20, 20);
    }
}

void OverlayWindow::setOverlayMode(bool enabled)
{
    m_overlayMode = enabled;
    
    if (enabled) {
        setWindowFlags(Qt::FramelessWindowHint | 
                       Qt::WindowStaysOnTopHint | 
                       Qt::Tool);
        setAttribute(Qt::WA_TranslucentBackground);
    } else {
        setWindowFlags(Qt::Window);
        setAttribute(Qt::WA_TranslucentBackground, false);
        setStyleSheet("QWidget { background-color: #2b2b2b; }");
    }
    
    show();
}

void OverlayWindow::updateMetrics(const FTMSProtocol::TrainerData &data)
{
    m_metrics->setWatts(data.power);
    m_metrics->setCadence(data.cadence);
    m_metrics->setSpeed(data.speed);
    m_metrics->setHeartRate(data.heartRate);
    m_metrics->setTimestamp(QDateTime::currentDateTime());
}

void OverlayWindow::updateDisplay()
{
    m_powerLabel->setText(formatValue(m_metrics->watts(), 0, "W"));
    m_cadenceLabel->setText(formatValue(m_metrics->cadence(), 0, "RPM"));
    m_speedLabel->setText(formatValue(m_metrics->speed(), 1, "km/h"));
    
    if (m_metrics->heartRate() > 0) {
        m_heartRateLabel->setText(formatValue(m_metrics->heartRate(), 0, "BPM"));
        m_heartRateLabel->show();
    } else {
        m_heartRateLabel->hide();
    }
}

QString OverlayWindow::formatValue(double value, int decimals, const QString &unit)
{
    QString label;
    
    if (unit == "W") {
        label = "Power: ";
    } else if (unit == "RPM") {
        label = "Cadence: ";
    } else if (unit == "km/h") {
        label = "Speed: ";
    } else if (unit == "BPM") {
        label = "HR: ";
    }
    
    return label + QString::number(value, 'f', decimals) + " " + unit;
}

void OverlayWindow::paintEvent(QPaintEvent *event)
{
    if (m_overlayMode) {
        QPainter painter(this);
        painter.setRenderHint(QPainter::Antialiasing);
        
        // Draw semi-transparent background
        painter.setBrush(QBrush(QColor(0, 0, 0, 100)));
        painter.setPen(Qt::NoPen);
        painter.drawRoundedRect(rect(), 10, 10);
    }
    
    QWidget::paintEvent(event);
}

void OverlayWindow::mousePressEvent(QMouseEvent *event)
{
    if (event->button() == Qt::LeftButton) {
        m_dragging = true;
        m_dragStartPosition = event->globalPosition().toPoint() - frameGeometry().topLeft();
        event->accept();
    }
}

void OverlayWindow::mouseMoveEvent(QMouseEvent *event)
{
    if (event->buttons() & Qt::LeftButton && m_dragging) {
        move(event->globalPosition().toPoint() - m_dragStartPosition);
        event->accept();
    }
}