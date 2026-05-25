import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import PageHeader from '../../components/common/PageHeader';
import { CardSkeleton } from '../../components/common/SkeletonLoader';
import { getAdminStats, getAllCompanies } from '../../api/admin';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentCompanies, setRecentCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, companiesRes] = await Promise.all([
          getAdminStats(),
          getAllCompanies(),
        ]);
        setStats(statsRes.data.stats);
        setRecentCompanies(companiesRes.data.companies.slice(0, 5));
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
        title="Admin Dashboard"
        subtitle="Platform overview and management"
        action={
          <Link to="/admin/companies" className="btn-primary text-sm">
            + Add Company
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Total Companies" value={stats?.totalCompanies} icon="🏢" color="blue" />
            <StatCard title="Active Companies" value={stats?.activeCompanies} icon="✅" color="green" />
            <StatCard title="Total Drivers" value={stats?.totalDrivers} icon="👤" color="purple" />
            <StatCard title="Active Trips" value={stats?.activeTrips} icon="🗺️" color="yellow" subtitle="Right now" />
          </>
        )}
      </div>

      {/* Recent Companies */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Recent Companies</h2>
          <Link to="/admin/companies" className="text-sm text-primary-600 hover:text-primary-800 font-medium">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Company</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Email</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Drivers</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentCompanies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    No companies yet
                  </td>
                </tr>
              ) : (
                recentCompanies.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-900">{c.companyName}</td>
                    <td className="py-3 px-2 text-gray-500">{c.companyEmail}</td>
                    <td className="py-3 px-2 text-gray-700">{c.totalDrivers}</td>
                    <td className="py-3 px-2">
                      <span className={c.isActive ? 'badge-active' : 'badge-inactive'}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
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

export default AdminDashboard;
