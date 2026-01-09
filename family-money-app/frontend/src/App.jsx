import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import FundRequestPage from './pages/FundRequestPage';
import ParentMonitorPage from './pages/ParentMonitorPage';
import NotificationPage from './pages/NotificationPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import FundApprovalPage from './pages/FundApprovalPage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={
          <PrivateRoute><DashboardPage /></PrivateRoute>
        } />
        <Route path="/fund-request" element={
          <PrivateRoute><FundRequestPage /></PrivateRoute>
        } />
        <Route path="/monitor" element={
          <PrivateRoute><ParentMonitorPage /></PrivateRoute>
        } />
        <Route path="/fund-approval" element={
          <PrivateRoute><FundApprovalPage /></PrivateRoute>
        } />
        <Route path="/notifications" element={
          <PrivateRoute><NotificationPage /></PrivateRoute>
        } />
        <Route path="/history" element={
          <PrivateRoute><HistoryPage /></PrivateRoute>
        } />
        <Route path="/settings" element={
          <PrivateRoute><SettingsPage /></PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}