import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrdersPage from './pages/orders/OrdersPage';
import OrderDetailPage from './pages/orders/OrderDetailPage';
import InboundsPage from './pages/inbounds/InboundsPage';
import InboundDetailPage from './pages/inbounds/InboundDetailPage';
import OutboundsPage from './pages/outbounds/OutboundsPage';
import OutboundDetailPage from './pages/outbounds/OutboundDetailPage';
import PackingsPage from './pages/packings/PackingsPage';
import PackingDetailPage from './pages/packings/PackingDetailPage';
import SortingsPage from './pages/sortings/SortingsPage';
import SortingDetailPage from './pages/sortings/SortingDetailPage';
import ShipmentsPage from './pages/shipments/ShipmentsPage';
import ShipmentDetailPage from './pages/shipments/ShipmentDetailPage';
import InventoryChecksPage from './pages/inventory-checks/InventoryChecksPage';
import InventoryCheckDetailPage from './pages/inventory-checks/InventoryCheckDetailPage';
import TransfersPage from './pages/transfers/TransfersPage';
import TransferDetailPage from './pages/transfers/TransferDetailPage';
import ReportsPage from './pages/reports/ReportsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <Layout>
              <OrdersPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <OrderDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inbounds"
        element={
          <ProtectedRoute>
            <Layout>
              <InboundsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inbounds/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <InboundDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/outbounds"
        element={
          <ProtectedRoute>
            <Layout>
              <OutboundsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/outbounds/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <OutboundDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/packings" element={<ProtectedRoute><Layout><PackingsPage /></Layout></ProtectedRoute>} />
      <Route path="/packings/:id" element={<ProtectedRoute><Layout><PackingDetailPage /></Layout></ProtectedRoute>} />
      <Route path="/sortings" element={<ProtectedRoute><Layout><SortingsPage /></Layout></ProtectedRoute>} />
      <Route path="/sortings/:id" element={<ProtectedRoute><Layout><SortingDetailPage /></Layout></ProtectedRoute>} />
      <Route path="/shipments" element={<ProtectedRoute><Layout><ShipmentsPage /></Layout></ProtectedRoute>} />
      <Route path="/shipments/:id" element={<ProtectedRoute><Layout><ShipmentDetailPage /></Layout></ProtectedRoute>} />
      <Route path="/inventory-checks" element={<ProtectedRoute><Layout><InventoryChecksPage /></Layout></ProtectedRoute>} />
      <Route path="/inventory-checks/:id" element={<ProtectedRoute><Layout><InventoryCheckDetailPage /></Layout></ProtectedRoute>} />
      <Route path="/transfers" element={<ProtectedRoute><Layout><TransfersPage /></Layout></ProtectedRoute>} />
      <Route path="/transfers/:id" element={<ProtectedRoute><Layout><TransferDetailPage /></Layout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Layout><ReportsPage /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
