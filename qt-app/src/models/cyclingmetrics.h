#pragma once

#include <QObject>
#include <QDateTime>

class CyclingMetrics : public QObject
{
    Q_OBJECT
    Q_PROPERTY(double watts READ watts WRITE setWatts NOTIFY wattsChanged)
    Q_PROPERTY(double cadence READ cadence WRITE setCadence NOTIFY cadenceChanged)
    Q_PROPERTY(double speed READ speed WRITE setSpeed NOTIFY speedChanged)
    Q_PROPERTY(double heartRate READ heartRate WRITE setHeartRate NOTIFY heartRateChanged)
    Q_PROPERTY(QDateTime timestamp READ timestamp WRITE setTimestamp NOTIFY timestampChanged)

public:
    explicit CyclingMetrics(QObject *parent = nullptr);

    double watts() const { return m_watts; }
    double cadence() const { return m_cadence; }
    double speed() const { return m_speed; }
    double heartRate() const { return m_heartRate; }
    QDateTime timestamp() const { return m_timestamp; }

    void setWatts(double watts);
    void setCadence(double cadence);
    void setSpeed(double speed);
    void setHeartRate(double heartRate);
    void setTimestamp(const QDateTime &timestamp);

signals:
    void wattsChanged();
    void cadenceChanged();
    void speedChanged();
    void heartRateChanged();
    void timestampChanged();

private:
    double m_watts = 0.0;
    double m_cadence = 0.0;
    double m_speed = 0.0;
    double m_heartRate = 0.0;
    QDateTime m_timestamp;
};