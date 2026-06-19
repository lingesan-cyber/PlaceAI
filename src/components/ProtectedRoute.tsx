import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const defaultDashboardMap: Record<string, string> = {
  director: '/dashboard/director',
  officer: '/dashboard/officer',
  training: '/dashboard/training',
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user, token } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user || !token) {
    // Redirect to login page, saving the location for a post-login redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user.role;
  const pathname = location.pathname;

  // Map each route to the roles allowed to access it
  const rolePermissions: Record<string, string[]> = {
    '/dashboard/overall': ['director'],
    '/dashboard/director': ['director'],
    '/dashboard/officer': ['officer'],
    '/dashboard/training': ['training'],
    '/dashboard/users': ['director'],
    '/dashboard/settings': ['director', 'officer', 'training'],
  };

  // Check if accessing base /dashboard route
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    const target = defaultDashboardMap[role] || '/dashboard/settings';
    return <Navigate to={target} replace />;
  }

  // Check route-level permissions
  const allowedRoles = rolePermissions[pathname];
  if (allowedRoles && !allowedRoles.includes(role)) {
    const target = defaultDashboardMap[role] || '/dashboard/settings';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};
