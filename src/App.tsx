import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CustomerMenu from './pages/CustomerMenu';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminOverview from './pages/admin/AdminOverview';
import AdminPOS from './pages/admin/AdminPOS';
import AdminQR from './pages/admin/AdminQR';
import AdminMenu from './pages/admin/AdminMenu';
import AdminSettings from './pages/admin/AdminSettings';
import AdminReports from './pages/admin/AdminReports';
import AdminKitchen from './pages/admin/AdminKitchen';
import AdminCompletedOrders from './pages/admin/AdminCompletedOrders';
import AttendanceTracker from './pages/admin/AttendanceTracker';
import PayrollManager from './pages/admin/PayrollManager';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SuperAdminOverview from './pages/superadmin/SuperAdminOverview';
import RestaurantManager from './pages/superadmin/RestaurantManager';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Customer Menu */}
          <Route path="/r/:slug" element={<CustomerMenu />} />
          <Route path="/" element={<CustomerMenu />} /> 

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin', 'owner', 'waiter', 'kitchen', 'superadmin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }>
            <Route index element={<AdminOverview />} />
            <Route path="pos" element={<AdminPOS />} />
            <Route path="menu" element={<AdminMenu />} />
            <Route path="qr" element={<AdminQR />} />
            <Route path="attendance" element={<AttendanceTracker />} />
            <Route path="payroll" element={<PayrollManager />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="kitchen" element={<AdminKitchen />} />
            <Route path="completed" element={<AdminCompletedOrders />} />
          </Route>

          {/* Super Admin Routes (Ironplate Father App) */}
          <Route path="/ironplate" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<SuperAdminOverview />} />
            <Route path="partners" element={<RestaurantManager />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
