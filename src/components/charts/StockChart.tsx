import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface StockChartProps {
  data: Array<{
    category: string;
    total_stock: number;
    product_count: number;
  }>;
}

export default function StockChart({ data }: StockChartProps) {
  const colors = [
    '#f97316', // orange-500
    '#14b8a6', // teal-500
    '#8b5cf6', // violet-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#6366f1', // indigo-500
    '#ec4899', // pink-500
  ];

  const chartData = {
    labels: data.map(item => item.category || 'Uncategorized'),
    datasets: [
      {
        data: data.map(item => item.total_stock),
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length).map(color => color + '20'),
        borderWidth: 2,
        hoverBackgroundColor: colors.slice(0, data.length).map(color => color + 'dd'),
        hoverBorderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: {
            size: 12,
          },
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const dataset = data[context.dataIndex];
            return `${label}: ${value} units (${dataset?.product_count || 0} products)`;
          }
        }
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
    },
  };

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-xl">📊</span>
          </div>
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return <div className="h-64"><Doughnut data={chartData} options={options} /></div>;
}