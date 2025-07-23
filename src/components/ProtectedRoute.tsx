import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, token } = useAuth();

  console.log('ProtectedRoute: isLoading:', isLoading);
  console.log('ProtectedRoute: user:', user);
  console.log('ProtectedRoute: token exists:', !!token);

  if (isLoading) {
    console.log('ProtectedRoute: Showing loading screen');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mb-4"></div>
        <p className="text-gray-600">Loading...</p>
        <div className="mt-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          DEBUG: Auth is loading, please wait...
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute: User authenticated, rendering children');
  return <>{children}</>;
}
