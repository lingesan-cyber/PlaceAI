import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { OverallDashboard } from '../pages/dashboard/OverallDashboard';
import { DirectorDashboard } from '../pages/dashboard/DirectorDashboard';
import { PlacementOfficerDashboard } from '../pages/dashboard/PlacementOfficerDashboard';
import { TrainingStaffDashboard } from '../pages/dashboard/TrainingStaffDashboard';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { UsersPage } from '../pages/users/UsersPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Access */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Dashboards Nested in Layout */}
      <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="overall" element={<OverallDashboard />} />
        <Route path="director" element={<DirectorDashboard />} />
        <Route path="officer" element={<PlacementOfficerDashboard />} />
        <Route path="training" element={<TrainingStaffDashboard />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="users" element={<UsersPage />} />

        <Route index element={<Navigate to="overall" replace />} />
      </Route>

      {/* Fallback Redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
