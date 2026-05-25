import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/common/PageHeader';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { getActiveTrips } from '../../api/company';
import { useSocket } from '../../context/SocketContext';

const CompanyTrips = () => {
  const { socket } = useSocket();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    try {
      const res = await getActiveTrips();
      setTrips(res.data.trips);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  // Refresh on socket events
  useEffect(() => {
    if (!socket) return;
    socket.on('trip:started', fetchTrips);
    socket.on('trip:ended', fetchTrips);
    return () => {
      socket.off('trip:started', fetchTrips);
      socket.off('trip:ended', fetchTrips);
    };
  }, [socket, fetchTrips]);

  const getDuration = (startTime) => {
    const diff = Date.now() - new Date(startTime).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Active Trips"
        subtitle={`${trips.length} trips currently running`}
        action={
          <button onClick={fetchTrips} className="btn-secondary text-sm">
            🔄 Refresh
          </button>
        }
      />

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Driver</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Bus</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Started At</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Duration</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-4">
                    <SkeletonLoader rows={4} cols={5} />
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <p className="text-3xl mb-2">🗺️</p>
                    <p>No active trips right now</p>
                  </td>
                </tr>
              ) : (
                trips.map((t) => (
                  <tr key={t._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <p className="font-semibold text-gray-900">{t.driver?.driverName || t.driverName}</p>
                      <p className="text-xs text-gray-400">{t.driver?.driverPhone}</p>
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-900">Bus {t.busNumber}</td>
                    <td className="py-3 px-3 text-gray-500">
                      {new Date(t.startTime).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-gray-700 font-medium">
                      {getDuration(t.startTime)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-green-500 rounded-full live-dot" />
                        <span className="badge-active">Live</span>
                      </div>
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

export default CompanyTrips;
