import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ProductPerformance {
  id: number;
  name: string;
  sku: string;
  current_stock: number;
  total_in: number;
  total_out: number;
  movement_count: number;
}

interface PerformanceChartProps {
  data: ProductPerformance[];
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const chartData = {
    labels: data.slice(0, 10).map(item => item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name),
    datasets: [
      {
        label: 'Stock In',
        data: data.slice(0, 10).map(item => item.total_in),
        backgroundColor: '#10b98150',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Stock Out',
        data: data.slice(0, 10).map(item => item.total_out),
        backgroundColor: '#ef444450',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 4,
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
          text: 'Products',
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
        callbacks: {
          afterLabel: function(context: any) {
            const dataIndex = context.dataIndex;
            const product = data[dataIndex];
            return [`Current Stock: ${product.current_stock}`, `Total Movements: ${product.movement_count}`];
          }
        }
      },
    },
    elements: {
      bar: {
        borderRadius: 4,
      },
    },
  };

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-xl">📊</span>
          </div>
          <p>No performance data available</p>
        </div>
      </div>
    );
  }

  return <div className="h-80"><Bar data={chartData} options={options} /></div>;
}