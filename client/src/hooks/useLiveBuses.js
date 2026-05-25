import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { getLiveBuses } from '../api/locations';

/**
 * Returns true only when both values are finite numbers (not NaN, not null, not undefined).
 */
const isValidCoord = (lat, lng) =>
  typeof lat === 'number' && typeof lng === 'number' &&
  isFinite(lat) && isFinite(lng);

/**
 * Normalize a bus object coming from either the REST API or a Socket.IO event
 * into a consistent shape with flat latitude / longitude fields.
 *
 * REST response (after backend normalizeLocation):
 *   { tripId, busNumber, driverName, companyName, latitude, longitude, speed, timestamp }
 *
 * Socket event (driver:location → bus:location:update):
 *   { tripId, busNumber, driverName, latitude, longitude, speed, timestamp }
 */
const normalizeBus = (raw) => {
  if (!raw) return null;

  // Prefer flat fields; fall back to nested location.coordinates (GeoJSON)
  let latitude  = raw.latitude  ?? raw.lat  ?? null;
  let longitude = raw.longitude ?? raw.lng  ?? null;

  // Some paths may still carry the raw MongoDB shape
  if ((latitude === null || longitude === null) && Array.isArray(raw.location?.coordinates)) {
    longitude = raw.location.coordinates[0];
    latitude  = raw.location.coordinates[1];
  }

  // Convert strings to numbers if needed
  if (typeof latitude  === 'string') latitude  = parseFloat(latitude);
  if (typeof longitude === 'string') longitude = parseFloat(longitude);

  if (!isValidCoord(latitude, longitude)) return null;

  return {
    tripId:      raw.tripId      || raw.trip?.toString() || raw._id?.toString() || '',
    busNumber:   raw.busNumber   || '',
    driverName:  raw.driverName  || raw.driver?.driverName || '',
    companyName: raw.companyName || raw.company?.companyName || '',
    latitude,
    longitude,
    speed:       typeof raw.speed === 'number' ? raw.speed : 0,
    timestamp:   raw.timestamp   || new Date().toISOString(),
    distance:    raw.distance    ?? undefined,
  };
};

const useLiveBuses = () => {
  const { socket } = useSocket();
  const [buses, setBuses] = useState({});   // keyed by tripId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Initial fetch ──────────────────────────────────────────────────────
  const fetchInitial = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getLiveBuses();
      const busMap = {};

      (res.data.buses || []).forEach((raw) => {
        const bus = normalizeBus(raw);
        if (bus && bus.tripId) {
          busMap[bus.tripId] = bus;
        }
      });

      setBuses(busMap);
    } catch (err) {
      console.error('[useLiveBuses] fetch error:', err);
      setError('Failed to load bus locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  // ── Socket.IO real-time updates ────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdate = (data) => {
      const bus = normalizeBus(data);
      if (!bus || !bus.tripId) {
        console.warn('[useLiveBuses] Dropped invalid location update:', data);
        return;
      }
      setBuses((prev) => ({ ...prev, [bus.tripId]: bus }));
    };

    const handleTripEnded = ({ tripId }) => {
      if (!tripId) return;
      setBuses((prev) => {
        const next = { ...prev };
        delete next[tripId];
        return next;
      });
    };

    const handleTripStarted = () => fetchInitial();

    socket.on('bus:location:update', handleLocationUpdate);
    socket.on('trip:ended',          handleTripEnded);
    socket.on('trip:started',        handleTripStarted);

    return () => {
      socket.off('bus:location:update', handleLocationUpdate);
      socket.off('trip:ended',          handleTripEnded);
      socket.off('trip:started',        handleTripStarted);
    };
  }, [socket, fetchInitial]);

  return {
    buses: Object.values(buses),
    loading,
    error,
    refresh: fetchInitial,
  };
};

export default useLiveBuses;
