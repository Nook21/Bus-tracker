import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Public pages
import HomePage from './pages/public/HomePage';
import TrackingPage from './pages/public/TrackingPage';

// Auth pages
import LoginPage from './pages/auth/LoginPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCompanies from './pages/admin/AdminCompanies';

// Company pages
import CompanyDashboard from './pages/company/CompanyDashboard';
import CompanyDrivers from './pages/company/CompanyDrivers';
import CompanyTrips from './pages/company/CompanyTrips';
import CompanyFleetMap from './pages/company/CompanyFleetMap';

// Driver pages
import DriverDashboard from './pages/driver/DriverDashboard';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/track" element={<TrackingPage />} />

            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/login" element={<LoginPage role="admin" />} />
            <Route path="/company/login" element={<LoginPage role="company" />} />
            <Route path="/driver/login" element={<LoginPage role="driver" />} />

            {/* Admin */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/companies"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminCompanies />
                </ProtectedRoute>
              }
            />

            {/* Company */}
            <Route
              path="/company/dashboard"
              element={
                <ProtectedRoute allowedRoles={['company']}>
                  <CompanyDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/drivers"
              element={
                <ProtectedRoute allowedRoles={['company']}>
                  <CompanyDrivers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/trips"
              element={
                <ProtectedRoute allowedRoles={['company']}>
                  <CompanyTrips />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/fleet-map"
              element={
                <ProtectedRoute allowedRoles={['company']}>
                  <CompanyFleetMap />
                </ProtectedRoute>
              }
            />

            {/* Driver */}
            <Route
              path="/driver/dashboard"
              element={
                <ProtectedRoute allowedRoles={['driver']}>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
