import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Package, AlertTriangle, TrendingUp, Activity, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import StockChart from '../components/charts/StockChart';
import MovementChart from '../components/charts/MovementChart';

interface DashboardStats {
  total_products: number;
  low_stock_products: number;
  total_categories: number;
  recent_movements: number;
  stock_by_category: Array<{
    category: string;
    total_stock: number;
    product_count: number;
  }>;
  movement_trends: Array<{
    date: string;
    movement_type: string;
    total_quantity: number;
  }>;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  current_stock: number;
  min_stock_level: number;
  stock_status: 'low' | 'normal' | 'high';
  category_name: string;
}

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const [statsRes, productsRes, movementsRes] = await Promise.all([
        fetch('http://localhost:3001/api/analytics/dashboard', { headers }),
        fetch('http://localhost:3001/api/products?low_stock=true', { headers }),
        fetch('http://localhost:3001/api/inventory/movements?limit=5', { headers })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (productsRes.ok) setLowStockProducts(await productsRes.json());
      if (movementsRes.ok) setRecentMovements(await movementsRes.json());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, trend, trendValue, color = "orange" }: {
    icon: any;
    label: string;
    value: string | number;
    trend?: 'up' | 'down';
    trendValue?: string;
    color?: string;
  }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && trendValue && (
            <div className={`flex items-center mt-2 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
              <span className="text-sm font-medium ml-1">{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 bg-${color}-50 rounded-lg`}>
          <Icon className={`w-6 h-6 text-${color}-500`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time inventory overview</p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Package}
          label="Total Products"
          value={stats?.total_products || 0}
          color="blue"
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock Alerts"
          value={stats?.low_stock_products || 0}
          color="red"
        />
        <StatCard
          icon={TrendingUp}
          label="Categories"
          value={stats?.total_categories || 0}
          color="green"
        />
        <StatCard
          icon={Activity}
          label="Recent Movements"
          value={stats?.recent_movements || 0}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Distribution</h3>
          <StockChart data={stats?.stock_by_category || []} />
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Movement Trends</h3>
          <MovementChart data={stats?.movement_trends || []} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Low Stock Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Low Stock Products</h3>
              <Link
                to="/app/products?low_stock=true"
                className="text-orange-600 hover:text-orange-700 text-sm font-medium"
              >
                View All
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No low stock products</p>
              </div>
            ) : (
              lowStockProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.sku} • {product.category_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {product.current_stock} left
                      </span>
                      <p className="text-xs text-gray-500 mt-1">Min: {product.min_stock_level}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Movements</h3>
              <Link
                to="/app/inventory"
                className="text-orange-600 hover:text-orange-700 text-sm font-medium"
              >
                View All
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {recentMovements.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No recent movements</p>
              </div>
            ) : (
              recentMovements.map((movement) => (
                <div key={movement.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{movement.product_name}</p>
                      <p className="text-sm text-gray-500">{movement.reason}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        movement.movement_type === 'IN' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {movement.movement_type === 'IN' ? '+' : '-'}{movement.quantity}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(movement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}