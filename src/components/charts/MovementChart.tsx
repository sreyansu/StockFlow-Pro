import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MovementChartProps {
  data: Array<{
    date: string;
    movement_type: string;
    total_quantity: number;
  }>;
}

export default function MovementChart({ data }: MovementChartProps) {
  // Process data to get IN and OUT movements per day
  const processedData = React.useMemo(() => {
    const dateMap = new Map<string, { IN: number; OUT: number }>();
    
    data.forEach(item => {
      const date = new Date(item.date).toLocaleDateString();
      if (!dateMap.has(date)) {
        dateMap.set(date, { IN: 0, OUT: 0 });
      }
      const entry = dateMap.get(date)!;
      entry[item.movement_type as 'IN' | 'OUT'] = item.total_quantity;
    });

    const dates = Array.from(dateMap.keys()).sort();
    const inData = dates.map(date => dateMap.get(date)?.IN || 0);
    const outData = dates.map(date => dateMap.get(date)?.OUT || 0);

    return { dates, inData, outData };
  }, [data]);

  const chartData = {
    labels: processedData.dates,
    datasets: [
      {
        label: 'Stock In',
        data: processedData.inData,
        borderColor: '#10b981',
        backgroundColor: '#10b98120',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Stock Out',
        data: processedData.outData,
        borderColor: '#ef4444',
        backgroundColor: '#ef444420',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date',
          font: {
            size: 12,
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Quantity',
          font: {
            size: 12,
          },
        },
        beginAtZero: true,
        grid: {
          color: '#f3f4f6',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
          },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
    },
  };

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-xl">📈</span>
          </div>
          <p>No movement data available</p>
        </div>
      </div>
    );
  }

  return <div className="h-64"><Line data={chartData} options={options} /></div>;
}