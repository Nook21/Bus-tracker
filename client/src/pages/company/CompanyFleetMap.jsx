import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/common/PageHeader';
import BusMap from '../../components/map/BusMap';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getCompanyLiveLocations } from '../../api/company';
import { useSocket } from '../../context/SocketContext';

const CompanyFleetMap = () => {
  const { socket, connected } = useSocket();
  const [buses, setBuses] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await getCompanyLiveLocations();
      const busMap = {};
      res.data.locations.forEach((loc) => {
        busMap[loc.trip] = {
          tripId: loc.trip,
          busNumber: loc.busNumber,
          driverName: loc.driverName,
          latitude: loc.location.coordinates[1],
          longitude: loc.location.coordinates[0],
          speed: loc.speed,
        };
      });
      setBuses(busMap);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      setBuses((prev) => ({
        ...prev,
        [data.tripId]: {
          tripId: data.tripId,
          busNumber: data.busNumber,
          driverName: data.driverName,
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed,
        },
      }));
    };

    const handleTripEnded = ({ tripId }) => {
      setBuses((prev) => {
        const updated = { ...prev };
        delete updated[tripId];
        return updated;
      });
    };

    socket.on('bus:location:update', handleUpdate);
    socket.on('trip:ended', handleTripEnded);
    socket.on('trip:started', fetchLocations);

    return () => {
      socket.off('bus:location:update', handleUpdate);
      socket.off('trip:ended', handleTripEnded);
      socket.off('trip:started', fetchLocations);
    };
  }, [socket, fetchLocations]);

  const busList = Object.values(buses);

  return (
    <DashboardLayout>
      <PageHeader
        title="Fleet Map"
        subtitle="Live locations of all active buses"
        action={
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full live-dot ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
            <span className={connected ? 'text-green-600' : 'text-red-500'}>
              {busList.length} buses live
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-220px)]">
        {/* Map */}
        <div className="lg:col-span-3 h-full">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-gray-100 rounded-xl">
              <LoadingSpinner size="lg" text="Loading fleet map..." />
            </div>
          ) : (
            <BusMap buses={busList} height="100%" />
          )}
        </div>

        {/* Bus list */}
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Active Buses</h3>
            <p className="text-xs text-gray-400 mt-0.5">{busList.length} on trip</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {busList.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-2xl mb-2">🚌</p>
                <p className="text-sm">No active buses</p>
              </div>
            ) : (
              busList.map((bus) => (
                <div key={bus.tripId} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900 text-sm">Bus {bus.busNumber}</p>
                    <span className="w-2 h-2 bg-green-500 rounded-full live-dot" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">👤 {bus.driverName}</p>
                  <p className="text-xs text-gray-400">⚡ {bus.speed || 0} km/h</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CompanyFleetMap;
