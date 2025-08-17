#pragma once

#include <QWidget>
#include <QLabel>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QTimer>
#include "../models/cyclingmetrics.h"
#include "../bluetooth/ftmsprotocol.h"

class OverlayWindow : public QWidget
{
    Q_OBJECT

public:
    explicit OverlayWindow(QWidget *parent = nullptr);

    void updateMetrics(const FTMSProtocol::TrainerData &data);
    void setOverlayMode(bool enabled);

protected:
    void paintEvent(QPaintEvent *event) override;
    void mousePressEvent(QMouseEvent *event) override;
    void mouseMoveEvent(QMouseEvent *event) override;

private slots:
    void updateDisplay();

private:
    void setupUI();
    void setupOverlayProperties();
    QString formatValue(double value, int decimals = 0, const QString &unit = "");

    // UI Elements
    QVBoxLayout *m_mainLayout;
    QLabel *m_powerLabel;
    QLabel *m_cadenceLabel;
    QLabel *m_speedLabel;
    QLabel *m_heartRateLabel;
    QLabel *m_titleLabel;

    // Data
    CyclingMetrics *m_metrics;
    QTimer *m_updateTimer;

    // Window dragging
    QPoint m_dragStartPosition;
    bool m_dragging;

    // Display options
    bool m_overlayMode;
};