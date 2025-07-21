import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus, Minus } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sku: string;
  current_stock: number;
}

interface StockUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  selectedProduct?: Product | null;
}

export default function StockUpdateModal({ isOpen, onClose, products, selectedProduct }: StockUpdateModalProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    movement_type: 'IN' as 'IN' | 'OUT',
    quantity: 0,
    reason: ''
  });

  useEffect(() => {
    if (selectedProduct) {
      setFormData({
        product_id: selectedProduct.id.toString(),
        movement_type: 'IN',
        quantity: 0,
        reason: ''
      });
    } else if (isOpen) {
      setFormData({
        product_id: '',
        movement_type: 'IN',
        quantity: 0,
        reason: ''
      });
    }
  }, [selectedProduct, isOpen]);

  const selectedProductData = products.find(p => p.id.toString() === formData.product_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/inventory/update-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: parseInt(formData.product_id),
          movement_type: formData.movement_type,
          quantity: formData.quantity,
          reason: formData.reason || `Stock ${formData.movement_type.toLowerCase()}`
        })
      });

      if (response.ok) {
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update stock');
      }
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Update Stock</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Product *
            </label>
            <select
              required
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Choose a product...</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku}) - Current: {product.current_stock}
                </option>
              ))}
            </select>
          </div>

          {selectedProductData && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Current Stock:</span> {selectedProductData.current_stock} units
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Movement Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, movement_type: 'IN' })}
                className={`flex items-center justify-center px-4 py-3 border rounded-lg transition-colors ${
                  formData.movement_type === 'IN'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Stock In
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, movement_type: 'OUT' })}
                className={`flex items-center justify-center px-4 py-3 border rounded-lg transition-colors ${
                  formData.movement_type === 'OUT'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Minus className="w-4 h-4 mr-2" />
                Stock Out
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Enter quantity"
            />
          </div>

          {selectedProductData && formData.movement_type === 'OUT' && formData.quantity > selectedProductData.current_stock && (
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm text-red-600">
                ⚠️ Warning: Not enough stock available. Current stock: {selectedProductData.current_stock}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder={`Reason for stock ${formData.movement_type.toLowerCase()}`}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (selectedProductData && formData.movement_type === 'OUT' && formData.quantity > selectedProductData.current_stock)}
              className={`px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 ${
                loading || (selectedProductData && formData.movement_type === 'OUT' && formData.quantity > selectedProductData.current_stock)
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''
              }`}
            >
              {loading ? 'Updating...' : `Update Stock`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}