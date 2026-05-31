import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, token } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user || !token) {
    // Redirect to login page, saving the location for a post-login redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are required, verify access.
  // 'overall' (Global Admin) is granted superuser rights to access all tabs for easy verification.
  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'overall') {
    return <Navigate to="/dashboard/overall" replace />;
  }

  return <>{children}</>;
};
