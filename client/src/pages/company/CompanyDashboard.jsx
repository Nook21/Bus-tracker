import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import PageHeader from '../../components/common/PageHeader';
import { CardSkeleton } from '../../components/common/SkeletonLoader';
import { getCompanyStats, getActiveTrips } from '../../api/company';
import { useAuth } from '../../context/AuthContext';

const CompanyDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, tripsRes] = await Promise.all([
          getCompanyStats(),
          getActiveTrips(),
        ]);
        setStats(statsRes.data.stats);
        setTrips(tripsRes.data.trips.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome, ${stats?.companyName || user?.name}`}
        subtitle="Company fleet overview"
        action={
          <Link to="/company/fleet-map" className="btn-primary text-sm">
            🗺️ View Fleet Map
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Total Drivers" value={stats?.totalDrivers} icon="👤" color="blue" />
            <StatCard title="Active Buses" value={stats?.activeBuses} icon="🚌" color="green" subtitle="On trip now" />
            <StatCard title="Active Trips" value={stats?.activeTrips} icon="🗺️" color="yellow" subtitle="Right now" />
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { to: '/company/drivers', icon: '👤', label: 'Manage Drivers', desc: 'Add and manage your drivers', color: 'border-blue-200 hover:border-blue-400' },
          { to: '/company/trips', icon: '🗺️', label: 'Active Trips', desc: 'Monitor ongoing trips', color: 'border-green-200 hover:border-green-400' },
          { to: '/company/fleet-map', icon: '📍', label: 'Fleet Map', desc: 'Live bus locations', color: 'border-purple-200 hover:border-purple-400' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className={`card border-2 ${item.color} transition-all hover:shadow-md`}>
            <div className="text-3xl mb-2">{item.icon}</div>
            <p className="font-semibold text-gray-900">{item.label}</p>
            <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Active trips table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Active Trips</h2>
          <Link to="/company/trips" className="text-sm text-primary-600 hover:text-primary-800 font-medium">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Driver</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Bus</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Started</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {trips.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    No active trips right now
                  </td>
                </tr>
              ) : (
                trips.map((t) => (
                  <tr key={t._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-900">{t.driver?.driverName || t.driverName}</td>
                    <td className="py-3 px-2 text-gray-700">Bus {t.busNumber}</td>
                    <td className="py-3 px-2 text-gray-500">
                      {new Date(t.startTime).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-2">
                      <span className="badge-active">Active</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CompanyDashboard;
