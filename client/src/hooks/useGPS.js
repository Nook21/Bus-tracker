import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Driver GPS hook — continuously watches position with high accuracy.
 *
 * Key settings (mirrors usePassengerLocation):
 *  - enableHighAccuracy: true  → GPS chip, not cell/wifi
 *  - maximumAge: 0             → never serve a cached position
 *  - timeout: 15000            → 15 s to get first fix
 *
 * Throttling: `onLocation` is called at most once per `interval` ms so we
 * don't flood the Socket.IO server, but `position` state updates on every fix
 * so the map marker stays smooth.
 */

const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge:         0,       // never use a cached position
  timeout:            15000,
};

const useGPS = ({ onLocation, interval = 7000, enabled = false }) => {
  const [position, setPosition]   = useState(null);  // latest fix { latitude, longitude, accuracy, speed }
  const [status, setStatus]       = useState('idle'); // idle | detecting | active | error | denied | unavailable
  const [error, setError]         = useState('');
  const watchIdRef                = useRef(null);
  const lastSentRef               = useRef(0);
  const onLocationRef             = useRef(onLocation); // keep ref current without re-creating callbacks

  // Keep the callback ref up to date
  useEffect(() => { onLocationRef.current = onLocation; }, [onLocation]);

  // ── Success handler ──────────────────────────────────────────────────
  const onSuccess = useCallback((pos) => {
    const { latitude, longitude, accuracy, speed } = pos.coords;

    // Validate
    const la = Number(latitude);
    const lo = Number(longitude);
    if (!isFinite(la) || !isFinite(lo) || la < -90 || la > 90 || lo < -180 || lo > 180) {
      console.warn('[DriverGPS] Invalid coordinates — ignoring:', { latitude, longitude });
      return;
    }

    const locationData = {
      latitude,
      longitude,
      accuracy:  Math.round(accuracy),
      speed:     speed != null ? parseFloat((speed * 3.6).toFixed(1)) : 0, // m/s → km/h
      timestamp: new Date().toISOString(),
    };

    console.log('[DriverGPS] Fix:', {
      lat:      latitude.toFixed(6),
      lng:      longitude.toFixed(6),
      accuracy: `${locationData.accuracy} m`,
      speed:    `${locationData.speed} km/h`,
    });

    setPosition(locationData);
    setStatus('active');
    setError('');

    // Throttle socket emissions
    const now = Date.now();
    if (now - lastSentRef.current >= interval) {
      lastSentRef.current = now;
      onLocationRef.current?.(locationData);
    }
  }, [interval]);

  // ── Error handler ────────────────────────────────────────────────────
  const onError = useCallback((err) => {
    console.error('[DriverGPS] Error:', err.code, err.message);
    switch (err.code) {
      case 1:
        setStatus('denied');
        setError('Location permission denied. Please allow location access in your browser settings.');
        break;
      case 2:
        setStatus('unavailable');
        setError('Location unavailable. Move to an open area with better GPS signal.');
        break;
      case 3:
        setStatus('error');
        setError('GPS timed out. Check your signal and try again.');
        break;
      default:
        setStatus('error');
        setError('An unknown GPS error occurred.');
    }
  }, []);

  // ── Start watching ───────────────────────────────────────────────────
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      setError('Geolocation is not supported by your browser.');
      return;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    setStatus('detecting');
    setError('');
    lastSentRef.current = 0; // reset throttle so first fix is sent immediately

    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, GEO_OPTIONS);
    console.log('[DriverGPS] watchPosition started, id:', watchIdRef.current);
  }, [onSuccess, onError]);

  // ── Stop watching ────────────────────────────────────────────────────
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      console.log('[DriverGPS] watchPosition cleared, id:', watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus('idle');
    setPosition(null);
  }, []);

  // ── Respond to enabled flag ──────────────────────────────────────────
  useEffect(() => {
    if (enabled) {
      startWatching();
    } else {
      stopWatching();
    }
    return () => {
      // Cleanup on unmount — clear watch but don't reset state
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    position,       // { latitude, longitude, accuracy, speed, timestamp } | null
    status,         // 'idle' | 'detecting' | 'active' | 'error' | 'denied' | 'unavailable'
    error,          // human-readable string
    watching: status === 'active' || status === 'detecting',
    retry: startWatching,
    stopWatching,
  };
};

export default useGPS;
