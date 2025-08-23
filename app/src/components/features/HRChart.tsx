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
            min: 60,
            max: 200,
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