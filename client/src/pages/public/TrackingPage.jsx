import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import BusMap from '../../components/map/BusMap';
import useLiveBuses from '../../hooks/useLiveBuses';
import usePassengerLocation from '../../hooks/usePassengerLocation';
import { getNearestBuses } from '../../api/locations';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// ── Coordinate guard ──────────────────────────────────────────────────────
const isValidLatLng = (lat, lng) => {
  const la = Number(lat);
  const lo = Number(lng);
  return isFinite(la) && isFinite(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
};

const normalizeBus = (raw) => {
  if (!raw) return null;
  const lat = Number(raw.latitude ?? raw.lat ?? null);
  const lng = Number(raw.longitude ?? raw.lng ?? null);
  if (!isValidLatLng(lat, lng)) return null;
  return { ...raw, latitude: lat, longitude: lng };
};

// ── Status badge config ───────────────────────────────────────────────────
const STATUS_UI = {
  idle:         { color: '#6b7280', dot: '#9ca3af', label: 'Location not started' },
  detecting:    { color: '#d97706', dot: '#f59e0b', label: 'Detecting your location...' },
  granted:      { color: '#16a34a', dot: '#22c55e', label: 'Location active' },
  low_accuracy: { color: '#d97706', dot: '#f59e0b', label: 'Low accuracy — move outdoors for GPS' },
  denied:       { color: '#dc2626', dot: '#ef4444', label: 'Location denied' },
  unavailable:  { color: '#dc2626', dot: '#ef4444', label: 'Location unavailable' },
  error:        { color: '#dc2626', dot: '#ef4444', label: 'Location error' },
};

// ─────────────────────────────────────────────────────────────────────────
const TrackingPage = () => {
  const { buses: liveBuses, loading: busesLoading, error: busesError } = useLiveBuses();

  // Real GPS — uses watchPosition with maximumAge:0 and enableHighAccuracy:true
  const { location, status, error: gpsError, retry } = usePassengerLocation();

  const [nearestBuses, setNearestBuses]     = useState([]);
  const [nearestLoading, setNearestLoading] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0); // increment to fly map

  // Track whether we've done the initial fly-to
  const hasFlownRef = useRef(false);

  // ── Fetch nearest buses whenever location updates ──────────────────
  const fetchNearest = useCallback(async (lat, lng) => {
    if (!isValidLatLng(lat, lng)) return;
    try {
      setNearestLoading(true);
      const res = await getNearestBuses(lat, lng, 10);
      const valid = (res.data.buses || []).map(normalizeBus).filter(Boolean);
      setNearestBuses(valid);
    } catch {
      // silent — fall back to all live buses
    } finally {
      setNearestLoading(false);
    }
  }, []);

  // When location first resolves, fly to it and fetch nearest
  useEffect(() => {
    if (!location) return;
    fetchNearest(location.lat, location.lng);

    // Auto-fly on first fix only
    if (!hasFlownRef.current) {
      hasFlownRef.current = true;
      setRecenterTrigger((n) => n + 1);
    }
  }, [location, fetchNearest]);

  // Refresh nearest every 20 s while location is known
  useEffect(() => {
    if (!location) return;
    const id = setInterval(() => fetchNearest(location.lat, location.lng), 20000);
    return () => clearInterval(id);
  }, [location, fetchNearest]);

  // ── Recenter button handler ────────────────────────────────────────
  const handleRecenter = () => {
    if (location) {
      setRecenterTrigger((n) => n + 1);
    } else {
      retry();
    }
  };

  // ── Decide what to show ────────────────────────────────────────────
  const displayBuses = nearestBuses.length > 0 ? nearestBuses : liveBuses;

  // Map center: only use real GPS — never fall back to a hardcoded city
  // The map renders at a neutral zoom over Ethiopia until GPS resolves
  const mapCenter = location
    ? [location.lat, location.lng]
    : [9.0192, 38.7525]; // Ethiopia center — only used before GPS resolves

  const mapZoom = location ? 14 : 7; // zoomed out until we know where the user is

  const statusUi = STATUS_UI[status] || STATUS_UI.idle;
  const locationGranted = status === 'granted' || status === 'low_accuracy';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-primary-800 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-white/70 hover:text-white text-sm transition-colors">
            ← Home
          </Link>
          <span className="text-white/30">|</span>
          <div className="flex items-center gap-2">
            <span className="text-xl">🚌</span>
            <span className="font-bold">Live Bus Tracking</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 bg-green-400 rounded-full live-dot" />
          <span className="text-green-300">
            {liveBuses.length} bus{liveBuses.length !== 1 ? 'es' : ''} active
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* ── Map panel ── */}
        <div className="flex-1 relative min-h-[300px]">
          {busesLoading ? (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <LoadingSpinner size="lg" text="Loading map..." />
            </div>
          ) : busesError ? (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <div className="text-center text-gray-500 p-6">
                <p className="text-4xl mb-2">⚠️</p>
                <p className="font-medium">Could not load bus data</p>
                <p className="text-sm mt-1 text-gray-400">Check your connection and try again</p>
              </div>
            </div>
          ) : (
            <BusMap
              buses={displayBuses}
              userLocation={location}          // null until GPS resolves — no fake marker
              center={mapCenter}
              zoom={mapZoom}
              height="100%"
              flyToUser={true}
              recenterTrigger={recenterTrigger}
            />
          )}

          {/* ── Detecting overlay — shown over the map while GPS is pending ── */}
          {status === 'detecting' && (
            <div style={{
              position:       'absolute',
              top:            12,
              left:           '50%',
              transform:      'translateX(-50%)',
              zIndex:         1000,
              background:     'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(8px)',
              borderRadius:   10,
              padding:        '8px 16px',
              display:        'flex',
              alignItems:     'center',
              gap:            8,
              boxShadow:      '0 2px 12px rgba(0,0,0,0.12)',
              fontFamily:     'system-ui,sans-serif',
              fontSize:       13,
              color:          '#374151',
              whiteSpace:     'nowrap',
            }}>
              <span style={{
                width: 10, height: 10,
                borderRadius: '50%',
                border: '2px solid #f59e0b',
                borderTopColor: 'transparent',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite',
              }} />
              Detecting your current location...
            </div>
          )}

          {/* ── Recenter button ── */}
          <button
            onClick={handleRecenter}
            title={location ? 'Re-center map to your location' : 'Retry location detection'}
            style={{
              position:       'absolute',
              bottom:         56,           // above zoom controls
              left:           10,
              zIndex:         1000,
              background:     locationGranted ? '#7c3aed' : 'rgba(255,255,255,0.95)',
              color:          locationGranted ? '#fff' : '#374151',
              border:         'none',
              borderRadius:   10,
              padding:        '8px 14px',
              cursor:         'pointer',
              fontSize:       13,
              fontWeight:     600,
              fontFamily:     'system-ui,sans-serif',
              boxShadow:      '0 2px 12px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(8px)',
              display:        'flex',
              alignItems:     'center',
              gap:            6,
              transition:     'all 0.15s',
            }}
          >
            📍 {location ? 'My Location' : 'Retry GPS'}
          </button>
        </div>

        {/* ── Sidebar ── */}
        <div className="w-full lg:w-80 bg-white border-l border-gray-100 flex flex-col overflow-hidden">

          {/* Sidebar header */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            <h2 className="font-bold text-gray-900 text-lg">Nearby Buses</h2>

            {/* GPS status pill */}
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
              style={{ background: `${statusUi.dot}18` }}
            >
              <span
                className={status === 'detecting' ? '' : 'live-dot'}
                style={{
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: statusUi.dot,
                  flexShrink: 0,
                  display: 'inline-block',
                  ...(status === 'detecting' ? {
                    border: `2px solid ${statusUi.dot}`,
                    borderTopColor: 'transparent',
                    animation: 'spin 0.8s linear infinite',
                  } : {}),
                }}
              />
              <span style={{ color: statusUi.color, fontWeight: 500 }}>
                {statusUi.label}
              </span>
            </div>

            {/* Accuracy display */}
            {location?.accuracy && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>🎯</span>
                <span>
                  Accuracy: <span className={`font-semibold ${
                    location.accuracy <= 20  ? 'text-green-600' :
                    location.accuracy <= 100 ? 'text-yellow-600' : 'text-red-500'
                  }`}>~{location.accuracy} m</span>
                  {location.accuracy <= 20  && ' (Excellent)'}
                  {location.accuracy > 20  && location.accuracy <= 100 && ' (Good)'}
                  {location.accuracy > 100 && ' (Low — move outdoors)'}
                </span>
              </div>
            )}

            {/* Coordinates display */}
            {location && (
              <div className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-2">
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </div>
            )}

            {/* Error message */}
            {gpsError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">
                <span className="flex-shrink-0 mt-0.5">❌</span>
                <div>
                  <p className="font-medium mb-1">{gpsError}</p>
                  {status === 'denied' && (
                    <p className="text-red-500">
                      Open browser settings → Site permissions → Location → Allow
                    </p>
                  )}
                  <button
                    onClick={retry}
                    className="mt-2 text-red-600 font-semibold hover:underline"
                  >
                    Try again →
                  </button>
                </div>
              </div>
            )}

            {/* Permission prompt */}
            {status === 'idle' && (
              <button
                onClick={retry}
                className="w-full btn-primary text-sm py-2.5"
              >
                📍 Allow Location Access
              </button>
            )}
          </div>

          {/* Bus list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {nearestLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner text="Finding nearest buses..." />
              </div>
            ) : displayBuses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-5xl mb-3">🚌</p>
                <p className="text-gray-600 font-semibold">No active buses</p>
                <p className="text-gray-400 text-sm mt-1">
                  No buses are currently on a trip.
                </p>
              </div>
            ) : (
              displayBuses.map((bus, idx) => (
                <BusCard key={bus.tripId || bus._id || idx} bus={bus} rank={idx + 1} />
              ))
            )}
          </div>

          <div className="p-3 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">GPS updates every 5–10 seconds</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Bus card ──────────────────────────────────────────────────────────────
const BusCard = ({ bus, rank }) => (
  <div className="border border-gray-100 rounded-xl p-4 hover:border-primary-200 hover:bg-primary-50/30 transition-all">
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg">🚌</span>
          <span className="font-bold text-gray-900">Bus {bus.busNumber || '—'}</span>
          {bus.distance !== undefined && (
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
              #{rank}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1 truncate">👤 {bus.driverName || 'Unknown'}</p>
        {bus.companyName && (
          <p className="text-xs text-gray-400 truncate">🏢 {bus.companyName}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        {bus.distance !== undefined && (
          <p className="text-primary-700 font-bold text-sm">{bus.distance} km</p>
        )}
        <p className="text-xs text-gray-400">{bus.speed || 0} km/h</p>
      </div>
    </div>
    <div className="mt-2 flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full live-dot" />
      <span className="text-xs text-green-600 font-medium">Live</span>
    </div>
  </div>
);

export default TrackingPage;
