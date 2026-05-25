import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/companies', label: 'Companies', icon: '🏢' },
];

const companyLinks = [
  { to: '/company/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/company/drivers', label: 'Drivers', icon: '👤' },
  { to: '/company/trips', label: 'Active Trips', icon: '🗺️' },
  { to: '/company/fleet-map', label: 'Fleet Map', icon: '📍' },
];

const driverLinks = [
  { to: '/driver/dashboard', label: 'Dashboard', icon: '🚌' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links =
    user?.role === 'admin'
      ? adminLinks
      : user?.role === 'company'
      ? companyLinks
      : driverLinks;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleLabel = {
    admin: 'System Admin',
    company: user?.profile?.companyName || 'Company',
    driver: 'Driver',
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-700 rounded-xl flex items-center justify-center text-white text-xl">
            🚌
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Bus Tracker</p>
            <p className="text-xs text-gray-400">Ethiopia</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{roleLabel[user?.role]}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
