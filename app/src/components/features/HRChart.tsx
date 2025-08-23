import React, { useRef, useEffect } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { useAppState } from '../../store/AppContext';

// Register Chart.js components
Chart.register(...registerables);

const HRChart: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const { state } = useAppState();

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Create new chart
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Prepare chart data
    const chartData = state.hrDataPoints.slice(-100).map(point => ({
      x: new Date(point.timestamp),
      y: point.heartRate
    }));

    // Calculate dynamic y-axis range based on data
    const heartRates = chartData.map(point => point.y).filter(hr => hr > 0);
    const minHR = heartRates.length > 0 ? Math.min(...heartRates) : 60;
    const maxHR = heartRates.length > 0 ? Math.max(...heartRates) : 200;
    
    // Add some padding to the range
    const padding = Math.max(10, (maxHR - minHR) * 0.1);
    const yMin = Math.max(30, minHR - padding);
    const yMax = Math.min(250, maxHR + padding);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        datasets: [{
          label: 'Heart Rate',
          data: chartData,
          borderColor: '#00ff88',
          backgroundColor: 'rgba(0, 255, 136, 0.1)',
          borderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 4,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0 // Disable animations for real-time updates
        },
        scales: {
          x: {
            type: 'time',
            display: false, // Hide time axis as requested
            time: {
              displayFormats: {
                second: 'HH:mm:ss'
              }
            }
          },
          y: {
            beginAtZero: false,
            min: yMin,
            max: yMax,
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
              font: {
                size: 10
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        },
        elements: {
          line: {
            borderColor: '#00ff88'
          },
          point: {
            backgroundColor: '#00ff88'
          }
        }
      }
    };

    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [state.hrDataPoints]);

  return (
    <div className="hr-chart-section">
      <div className="chart-container">
        <canvas 
          ref={canvasRef} 
          width="450" 
          height="150"
        />
      </div>
    </div>
  );
};

export default HRChart;