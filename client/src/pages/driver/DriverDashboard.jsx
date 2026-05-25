import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Alert from '../../components/common/Alert';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import BusMap from '../../components/map/BusMap';
import { getDriverProfile, startTrip, endTrip } from '../../api/driver';
import { useSocket } from '../../context/SocketContext';
import useGPS from '../../hooks/useGPS';

const DriverDashboard = () => {
  const { socket, connected } = useSocket();
  const [profile, setProfile] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gpsTracking, setGpsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const tripRef = useRef(null);

  // Keep tripRef in sync
  useEffect(() => { tripRef.current = activeTrip; }, [activeTrip]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await getDriverProfile();
      setProfile(res.data.driver);
      setActiveTrip(res.data.driver.activeTrip);
      // If there's an active trip, resume GPS tracking
      if (res.data.driver.activeTrip) {
        setGpsTracking(true);
      }
    } catch (err) {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // GPS location callback — sends to socket
  const handleLocation = useCallback(
    (locationData) => {
      const trip = tripRef.current;
      if (!trip || !socket || !connected) return;

      socket.emit('driver:location', {
        tripId: trip._id,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        speed: locationData.speed,
      });

      setCurrentPosition({
        lat: locationData.latitude,
        lng: locationData.longitude,
      });
    },
    [socket, connected]
  );

  const { position, error: gpsError, watching } = useGPS({
    onLocation: handleLocation,
    interval: 7000, // Send every 7 seconds
    enabled: gpsTracking,
  });

  // Update current position display from GPS hook
  useEffect(() => {
    if (position) {
      setCurrentPosition({ lat: position.latitude, lng: position.longitude });
    }
  }, [position]);

  const handleStartTrip = async () => {
    setError('');
    setSuccess('');
    setActionLoading(true);
    try {
      const res = await startTrip();
      const trip = res.data.trip;
      setActiveTrip(trip);
      setGpsTracking(true);

      // Notify via socket
      socket?.emit('driver:trip:started', { tripId: trip._id });
      setSuccess('Trip started! GPS tracking is now active.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start trip.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndTrip = async () => {
    setError('');
    setSuccess('');
    setActionLoading(true);
    try {
      const companyId = profile?.company?._id;
      await endTrip();

      // Notify via socket
      socket?.emit('driver:trip:ended', { tripId: activeTrip._id, companyId });

      setGpsTracking(false);
      setActiveTrip(null);
      setCurrentPosition(null);
      setSuccess('Trip ended successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to end trip.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Loading driver profile..." />
        </div>
      </DashboardLayout>
    );
  }

  const mapBuses = currentPosition && activeTrip
    ? [{
        tripId: activeTrip._id,
        busNumber: profile?.assignedBusNumber,
        driverName: profile?.driverName,
        latitude: currentPosition.lat,
        longitude: currentPosition.lng,
        speed: position?.speed || 0,
      }]
    : [];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {profile?.company?.companyName} — Bus {profile?.assignedBusNumber}
          </p>
        </div>

        <Alert type="error" message={error} onClose={() => setError('')} />
        <Alert type="success" message={success} onClose={() => setSuccess('')} />
        {gpsError && <Alert type="warning" message={`GPS: ${gpsError}`} />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Profile & Controls */}
          <div className="space-y-4">
            {/* Profile card */}
            <div className="card">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-3xl">
                  🚌
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{profile?.driverName}</h2>
                  <p className="text-gray-500 text-sm">{profile?.driverEmail}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Bus Number</p>
                  <p className="font-bold text-gray-900 mt-0.5">Bus {profile?.assignedBusNumber}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">License</p>
                  <p className="font-bold text-gray-900 mt-0.5">{profile?.driverLicense}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Company</p>
                  <p className="font-bold text-gray-900 mt-0.5">{profile?.company?.companyName}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Phone</p>
                  <p className="font-bold text-gray-900 mt-0.5">{profile?.driverPhone}</p>
                </div>
              </div>
            </div>

            {/* Trip status */}
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-4">Trip Control</h3>

              {activeTrip ? (
                <div className="space-y-4">
                  {/* Active trip info */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full live-dot" />
                      <span className="font-semibold text-green-800">Trip Active</span>
                    </div>
                    <div className="space-y-1 text-sm text-green-700">
                      <p>Started: {new Date(activeTrip.startTime).toLocaleTimeString()}</p>
                      {position && (
                        <>
                          <p>Speed: {position.speed} km/h</p>
                          <p>Lat: {position.latitude?.toFixed(5)}</p>
                          <p>Lng: {position.longitude?.toFixed(5)}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* GPS status */}
                  <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                    watching ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    <span>{watching ? '📡' : '⏳'}</span>
                    <span>{watching ? 'GPS tracking active — sending location...' : 'Acquiring GPS signal...'}</span>
                  </div>

                  <button
                    onClick={handleEndTrip}
                    disabled={actionLoading}
                    className="w-full btn-danger py-4 text-base font-bold flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <LoadingSpinner size="sm" /> : '🛑'}
                    {actionLoading ? 'Ending Trip...' : 'END TRIP'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-4xl mb-2">🚌</p>
                    <p className="text-gray-600 font-medium">No active trip</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Press START TRIP to begin GPS tracking
                    </p>
                  </div>

                  <button
                    onClick={handleStartTrip}
                    disabled={actionLoading || !connected}
                    className="w-full btn-success py-4 text-base font-bold flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <LoadingSpinner size="sm" /> : '▶️'}
                    {actionLoading ? 'Starting Trip...' : 'START TRIP'}
                  </button>

                  {!connected && (
                    <p className="text-xs text-center text-red-500">
                      ⚠️ Waiting for connection...
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Connection status */}
            <div className={`card flex items-center gap-3 ${connected ? 'border-green-200' : 'border-red-200'}`}>
              <span className={`w-3 h-3 rounded-full live-dot ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
              <div>
                <p className={`font-medium text-sm ${connected ? 'text-green-700' : 'text-red-600'}`}>
                  {connected ? 'Connected to server' : 'Disconnected — reconnecting...'}
                </p>
                <p className="text-xs text-gray-400">Real-time GPS sync</p>
              </div>
            </div>
          </div>

          {/* Right: Map */}
          <div className="h-[500px] lg:h-auto">
            <div className="card h-full p-0 overflow-hidden" style={{ minHeight: '400px' }}>
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Your Location</h3>
                <p className="text-xs text-gray-400">
                  {currentPosition
                    ? `${currentPosition.lat.toFixed(5)}, ${currentPosition.lng.toFixed(5)}`
                    : 'Waiting for GPS...'}
                </p>
              </div>
              <div style={{ height: 'calc(100% - 65px)' }}>
                <BusMap
                  buses={mapBuses}
                  userLocation={currentPosition}
                  center={currentPosition ? [currentPosition.lat, currentPosition.lng] : [9.0192, 38.7525]}
                  zoom={15}
                  height="100%"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DriverDashboard;
