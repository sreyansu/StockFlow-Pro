import pool from '../config/database.js';

export function handleInventoryUpdates(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join inventory updates room
    socket.join('inventory_updates');
    
    // Send initial data
    socket.emit('connected', { message: 'Connected to StockFlow Pro real-time updates' });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Function to broadcast stock updates
  const broadcastStockUpdate = (productData) => {
    io.to('inventory_updates').emit('stock_updated', productData);
  };

  // Function to broadcast new alerts
  const broadcastAlert = (alertData) => {
    io.to('inventory_updates').emit('new_alert', alertData);
  };

  return { broadcastStockUpdate, broadcastAlert };
}