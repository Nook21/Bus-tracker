import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const HomePage = () => {
  const { user } = useAuth();

  const getDashboardLink = () => {
    if (!user) return null;
    const map = { admin: '/admin/dashboard', company: '/company/dashboard', driver: '/driver/dashboard' };
    return map[user.role];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
            🚌
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">Bus Tracker</p>
            <p className="text-primary-200 text-xs">Ethiopia</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to={getDashboardLink()}
              className="bg-white text-primary-800 px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary-50 transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-white/80 hover:text-white px-4 py-2 text-sm font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                to="/track"
                className="bg-white text-primary-800 px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary-50 transition-colors"
              >
                Track Buses
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 px-4 py-2 rounded-full text-sm mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full live-dot" />
          Real-time GPS Tracking
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Track Your Bus
          <br />
          <span className="text-primary-200">Anywhere in Ethiopia</span>
        </h1>
        <p className="text-primary-200 text-xl max-w-2xl mx-auto mb-10">
          Real-time bus tracking platform connecting passengers, drivers, and transport companies across Ethiopia.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/track"
            className="bg-white text-primary-800 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary-50 transition-colors shadow-lg"
          >
            🗺️ Track Buses Now
          </Link>
          <Link
            to="/login"
            className="bg-white/10 text-white border border-white/20 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-colors"
          >
            Login to Dashboard
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Built for Everyone
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: '👤',
                title: 'Passengers',
                desc: 'See nearby buses in real time. No registration needed.',
                color: 'bg-blue-50 text-blue-600',
              },
              {
                icon: '🚌',
                title: 'Drivers',
                desc: 'Start trips and share your GPS location automatically.',
                color: 'bg-green-50 text-green-600',
              },
              {
                icon: '🏢',
                title: 'Companies',
                desc: 'Manage your fleet, drivers, and monitor live trips.',
                color: 'bg-purple-50 text-purple-600',
              },
              {
                icon: '⚙️',
                title: 'Admins',
                desc: 'Oversee the entire platform and manage companies.',
                color: 'bg-orange-50 text-orange-600',
              },
            ].map((f) => (
              <div key={f.title} className="card text-center hover:shadow-md transition-shadow">
                <div className={`w-14 h-14 ${f.color} rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Login portals */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Access Your Portal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { role: 'Admin', path: '/admin/login', icon: '⚙️', color: 'border-orange-200 hover:border-orange-400' },
              { role: 'Company', path: '/company/login', icon: '🏢', color: 'border-purple-200 hover:border-purple-400' },
              { role: 'Driver', path: '/driver/login', icon: '🚌', color: 'border-green-200 hover:border-green-400' },
            ].map((p) => (
              <Link
                key={p.role}
                to={p.path}
                className={`card border-2 ${p.color} transition-all hover:shadow-md text-center`}
              >
                <div className="text-4xl mb-3">{p.icon}</div>
                <p className="font-semibold text-gray-900">{p.role} Login</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-primary-900 text-primary-300 text-center py-6 text-sm">
        <p>© 2024 Bus Tracker Ethiopia. Built for better public transportation.</p>
      </footer>
    </div>
  );
};

export default HomePage;
