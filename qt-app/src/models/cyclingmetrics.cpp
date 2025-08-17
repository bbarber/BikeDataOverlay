#include "cyclingmetrics.h"

CyclingMetrics::CyclingMetrics(QObject *parent)
    : QObject(parent)
    , m_timestamp(QDateTime::currentDateTime())
{
}

void CyclingMetrics::setWatts(double watts)
{
    if (qFuzzyCompare(m_watts, watts))
        return;
    
    m_watts = watts;
    emit wattsChanged();
}

void CyclingMetrics::setCadence(double cadence)
{
    if (qFuzzyCompare(m_cadence, cadence))
        return;
    
    m_cadence = cadence;
    emit cadenceChanged();
}

void CyclingMetrics::setSpeed(double speed)
{
    if (qFuzzyCompare(m_speed, speed))
        return;
    
    m_speed = speed;
    emit speedChanged();
}

void CyclingMetrics::setHeartRate(double heartRate)
{
    if (qFuzzyCompare(m_heartRate, heartRate))
        return;
    
    m_heartRate = heartRate;
    emit heartRateChanged();
}

void CyclingMetrics::setTimestamp(const QDateTime &timestamp)
{
    if (m_timestamp == timestamp)
        return;
    
    m_timestamp = timestamp;
    emit timestampChanged();
}