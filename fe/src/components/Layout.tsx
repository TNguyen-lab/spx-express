import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Warehouse,
  Package,
  Truck,
  ClipboardList,
  FileText,
  LogOut,
  ArrowLeftRight,
  BarChart3,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/orders', label: 'Đặt hàng', icon: ShoppingCart },
  { path: '/inbounds', label: 'Nhập kho', icon: Warehouse },
  { path: '/outbounds', label: 'Xuất kho', icon: Package },
  { path: '/packings', label: 'Đóng gói', icon: ClipboardList },
  { path: '/sortings', label: 'Phân loại', icon: FileText },
  { path: '/shipments', label: 'Vận chuyển', icon: Truck },
  { path: '/inventory-checks', label: 'Kiểm kê', icon: ClipboardList },
  { path: '/transfers', label: 'Chuyển kho', icon: ArrowLeftRight },
  { path: '/reports', label: 'Báo cáo', icon: BarChart3 },
];

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold">SPX Express</h1>
          <p className="text-xs text-slate-400">Warehouse Management</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {menuItems.find(item => {
                const isRoot = item.path === '/';
                const isActive = location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                return isRoot && location.pathname === '/' ? true : isActive;
              })?.label || 'SPX Express'}
            </h2>
          </div>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
