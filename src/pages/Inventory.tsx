import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Minus, Search, Filter, Calendar, User, ArrowUpDown, Package } from 'lucide-react';
import StockUpdateModal from '../components/StockUpdateModal';

interface Movement {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  movement_type: 'IN' | 'OUT';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  user_name: string;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  current_stock: number;
}

export default function Inventory() {
  const { token } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProductForUpdate, setSelectedProductForUpdate] = useState<Product | null>(null);

  useEffect(() => {
    fetchMovements();
    fetchProducts();
  }, [token, selectedProduct, searchTerm]);

  const fetchMovements = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProduct) params.append('product_id', selectedProduct);
      
      const response = await fetch(`http://localhost:3001/api/inventory/movements?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMovements(data);
      }
    } catch (error) {
      console.error('Failed to fetch movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedProductForUpdate(null);
    fetchMovements();
    fetchProducts();
  };

  const filteredMovements = movements.filter(movement =>
    movement.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    movement.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    movement.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track and manage stock movements</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <ArrowUpDown className="w-4 h-4 mr-2" />
          Update Stock
        </button>
      </div>

      {/* Quick Stock Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-xl font-bold text-gray-900">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <Plus className="w-5 h-5 text-green-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Stock In (Today)</p>
              <p className="text-xl font-bold text-gray-900">
                {movements.filter(m => 
                  m.movement_type === 'IN' && 
                  new Date(m.created_at).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-red-50 rounded-lg">
              <Minus className="w-5 h-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Stock Out (Today)</p>
              <p className="text-xl font-bold text-gray-900">
                {movements.filter(m => 
                  m.movement_type === 'OUT' && 
                  new Date(m.created_at).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Movements</p>
              <p className="text-xl font-bold text-gray-900">{movements.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search movements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none"
            >
              <option value="">All Products</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-500 flex items-center">
            <ArrowUpDown className="w-4 h-4 mr-1" />
            {filteredMovements.length} movement{filteredMovements.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      {/* Movements List */}
      {filteredMovements.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <ArrowUpDown className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No movements found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedProduct
              ? 'Try adjusting your filters'
              : 'Start tracking inventory by updating stock levels'}
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Update Stock
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredMovements.map((movement) => (
              <div key={movement.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`p-2 rounded-lg ${
                        movement.movement_type === 'IN' 
                          ? 'bg-green-50' 
                          : 'bg-red-50'
                      }`}>
                        {movement.movement_type === 'IN' ? (
                          <Plus className={`w-4 h-4 text-green-500`} />
                        ) : (
                          <Minus className={`w-4 h-4 text-red-500`} />
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {movement.product_name}
                        </h4>
                        <p className="text-sm text-gray-500">{movement.sku}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Quantity:</span>
                        <span className={`ml-2 font-medium ${
                          movement.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {movement.movement_type === 'IN' ? '+' : '-'}{movement.quantity}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Stock Change:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {movement.previous_stock} → {movement.new_stock}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Reason:</span>
                        <span className="ml-2 text-gray-900">{movement.reason}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                      <div className="flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        {movement.user_name}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(movement.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      movement.movement_type === 'IN'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {movement.movement_type === 'IN' ? 'Stock In' : 'Stock Out'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      <StockUpdateModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        products={products}
        selectedProduct={selectedProductForUpdate}
      />
    </div>
  );
}