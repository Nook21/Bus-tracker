import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Continuously watches the passenger's real GPS position using
 * watchPosition (not getCurrentPosition) so the marker stays live.
 *
 * Key decisions:
 *  - enableHighAccuracy: true  → requests GPS chip, not cell/wifi
 *  - maximumAge: 0             → never serve a cached position
 *  - timeout: 15000            → give the GPS chip 15 s to lock
 *  - watchPosition             → fires every time the device moves
 */

const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge:         0,
  timeout:            30000,   // give GPS chip more time to lock
};

// Accept fix only if accuracy is within this threshold (meters).
// Keeps watching and waiting if the fix is too coarse.
const ACCURACY_THRESHOLD = 100;

const usePassengerLocation = () => {
  const [location, setLocation]       = useState(null);   // { lat, lng, accuracy }
  const [status, setStatus]           = useState('idle'); // idle | detecting | granted | denied | unavailable | error
  const [error, setError]             = useState('');
  const watchIdRef                    = useRef(null);

  // ── Coordinate sanity check ──────────────────────────────────────────
  const isValid = (lat, lng) => {
    const la = Number(lat);
    const lo = Number(lng);
    return isFinite(la) && isFinite(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
  };

  // ── Success handler ──────────────────────────────────────────────────
  const onSuccess = useCallback((pos) => {
    const { latitude, longitude, accuracy } = pos.coords;
    const roundedAccuracy = Math.round(accuracy);

    console.log('[PassengerGPS] Fix received:', {
      latitude:  latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      accuracy:  `${roundedAccuracy} m`,
    });

    if (!isValid(latitude, longitude)) {
      console.warn('[PassengerGPS] Invalid coordinates received — ignoring.');
      return;
    }

    // Always update location so the user sees the best available fix,
    // but reflect accuracy in status so the UI can warn them.
    setLocation({ lat: latitude, lng: longitude, accuracy: roundedAccuracy });
    setStatus(roundedAccuracy <= ACCURACY_THRESHOLD ? 'granted' : 'low_accuracy');
    setError('');
  }, []);

  // ── Error handler ────────────────────────────────────────────────────
  const onError = useCallback((err) => {
    console.error('[PassengerGPS] Error:', err.code, err.message);

    switch (err.code) {
      case 1: // PERMISSION_DENIED
        setStatus('denied');
        setError('Location permission denied. Please allow location access in your browser settings.');
        break;
      case 2: // POSITION_UNAVAILABLE
        setStatus('unavailable');
        setError('Location unavailable. Your device could not determine your position.');
        break;
      case 3: // TIMEOUT
        setStatus('error');
        setError('Location request timed out. Please check your GPS signal and try again.');
        break;
      default:
        setStatus('error');
        setError('An unknown location error occurred.');
    }
  }, []);

  // ── Start watching ───────────────────────────────────────────────────
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      setError('Geolocation is not supported by your browser.');
      return;
    }

    // Clear any existing watch first
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setStatus('detecting');
    setError('');

    watchIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      GEO_OPTIONS,
    );

    console.log('[PassengerGPS] watchPosition started, id:', watchIdRef.current);
  }, [onSuccess, onError]);

  // ── Stop watching ────────────────────────────────────────────────────
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      console.log('[PassengerGPS] watchPosition cleared, id:', watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // ── Auto-start on mount, cleanup on unmount ──────────────────────────
  useEffect(() => {
    startWatching();
    return () => stopWatching();
  }, []); // intentionally empty — start once, clean up on unmount

  return {
    location,          // { lat, lng, accuracy } | null
    status,            // 'idle' | 'detecting' | 'granted' | 'denied' | 'unavailable' | 'error'
    error,             // human-readable error string
    retry: startWatching,   // call to re-request permission / restart watch
  };
};

export default usePassengerLocation;
