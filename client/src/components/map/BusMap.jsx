import { useEffect, useState, Component } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// ── Fix Leaflet default icon paths broken by Vite bundling ────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Tile layer definitions ────────────────────────────────────────────────
const TILE_LAYERS = {
  street: {
    url:         'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom:     19,
  },
  satellite: {
    url:         'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom:     19,
  },
};

// ── Coordinate guard ──────────────────────────────────────────────────────
const isValidLatLng = (lat, lng) => {
  const la = Number(lat);
  const lo = Number(lng);
  return (
    isFinite(la) && isFinite(lo) &&
    la >= -90 && la <= 90 &&
    lo >= -180 && lo <= 180
  );
};

// ── Bus icon factory ──────────────────────────────────────────────────────
// Two variants: moving (green) and idle (blue). Uses an SVG-based pin shape
// for crisp rendering at all zoom levels.
const createBusIcon = (isMoving = false, isSatellite = false) => {
  const bg      = isMoving ? '#16a34a' : '#2563eb';
  const shadow  = isMoving ? 'rgba(22,163,74,0.4)' : 'rgba(37,99,235,0.4)';
  // On satellite we add a white outline ring so the marker pops against dark imagery
  const ring    = isSatellite ? 'box-shadow:0 0 0 3px rgba(255,255,255,0.6),0 4px 12px ' + shadow : 'box-shadow:0 4px 12px ' + shadow;

  return L.divIcon({
    className: '',   // clear default leaflet class so our styles aren't overridden
    html: `
      <div style="position:relative;width:44px;height:52px;">
        <!-- Pin body -->
        <div style="
          position:absolute;top:0;left:0;
          width:44px;height:44px;
          background:${bg};
          border:3px solid #fff;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          ${ring};
        "></div>
        <!-- Bus emoji centred inside pin -->
        <div style="
          position:absolute;top:4px;left:4px;
          width:36px;height:36px;
          display:flex;align-items:center;justify-content:center;
          font-size:18px;
          line-height:1;
        ">🚌</div>
        <!-- Speed badge -->
        ${isMoving ? `
        <div style="
          position:absolute;bottom:0;left:50%;transform:translateX(-50%);
          background:#16a34a;color:#fff;
          font-size:9px;font-weight:700;font-family:sans-serif;
          padding:1px 5px;border-radius:99px;
          white-space:nowrap;
          border:1.5px solid #fff;
        ">LIVE</div>` : ''}
      </div>`,
    iconSize:    [44, 52],
    iconAnchor:  [22, 52],
    popupAnchor: [0, -54],
  });
};

// ── Passenger / user location icon ───────────────────────────────────────
const createUserIcon = (isSatellite = false) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        width:22px;height:22px;
        background:#7c3aed;
        border:3px solid #fff;
        border-radius:50%;
        box-shadow:0 0 0 4px rgba(124,58,237,0.25),0 2px 8px rgba(0,0,0,0.3);
      "></div>
      <div style="
        position:absolute;top:-2px;left:-2px;
        width:26px;height:26px;
        border-radius:50%;
        border:2px solid rgba(124,58,237,0.4);
        animation:pulse-ring 2s ease-out infinite;
      "></div>`,
    iconSize:   [22, 22],
    iconAnchor: [11, 11],
  });

// ── Layer switcher (rendered inside the MapContainer) ────────────────────
const LayerSwitcher = ({ layer, onToggle }) => {
  const map = useMap();

  // Keep map tile layer in sync when prop changes
  useEffect(() => {
    // nothing — TileLayer re-renders handle this
  }, [layer]);

  return (
    <div
      style={{
        position:  'absolute',
        top:       '10px',
        right:     '10px',
        zIndex:    1000,
        display:   'flex',
        gap:       '4px',
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '10px',
        padding:   '4px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <button
        onClick={() => onToggle('street')}
        title="Street map"
        style={{
          padding:      '6px 12px',
          borderRadius: '7px',
          border:       'none',
          cursor:       'pointer',
          fontSize:     '12px',
          fontWeight:   '600',
          fontFamily:   'system-ui,sans-serif',
          transition:   'all 0.15s',
          background:   layer === 'street' ? '#2563eb' : 'transparent',
          color:        layer === 'street' ? '#fff' : '#374151',
        }}
      >
        🗺 Street
      </button>
      <button
        onClick={() => onToggle('satellite')}
        title="Satellite imagery"
        style={{
          padding:      '6px 12px',
          borderRadius: '7px',
          border:       'none',
          cursor:       'pointer',
          fontSize:     '12px',
          fontWeight:   '600',
          fontFamily:   'system-ui,sans-serif',
          transition:   'all 0.15s',
          background:   layer === 'satellite' ? '#16a34a' : 'transparent',
          color:        layer === 'satellite' ? '#fff' : '#374151',
        }}
      >
        🛰 Satellite
      </button>
    </div>
  );
};

// ── FlyToUser — fires whenever `trigger` increments ──────────────────────
// Using a numeric trigger (instead of a boolean) means the parent can call
// recenter multiple times and the map will always respond.
const FlyToUser = ({ position, trigger }) => {
  const map = useMap();
  useEffect(() => {
    if (trigger > 0 && position && isValidLatLng(position.lat, position.lng)) {
      map.flyTo([position.lat, position.lng], 15, { duration: 1.2 });
    }
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

// ── Error boundary ────────────────────────────────────────────────────────
class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error('[BusMap] render error:', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-100 rounded-xl">
          <div className="text-center text-gray-500 p-6">
            <p className="text-4xl mb-3">🗺️</p>
            <p className="font-semibold">Map temporarily unavailable</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Safe bus marker ───────────────────────────────────────────────────────
const BusMarker = ({ bus, isSatellite }) => {
  const lat = Number(bus.latitude  ?? bus.lat);
  const lng = Number(bus.longitude ?? bus.lng);

  if (!isValidLatLng(lat, lng)) {
    console.warn('[BusMap] Skipping marker — invalid coords:', bus);
    return null;
  }

  const isMoving = Number(bus.speed) > 0;

  return (
    <Marker
      position={[lat, lng]}
      icon={createBusIcon(isMoving, isSatellite)}
    >
      <Popup
        className="bus-popup"
        maxWidth={220}
      >
        <div style={{ minWidth: 180, fontFamily: 'system-ui,sans-serif' }}>
          {/* Header */}
          <div style={{
            background: isMoving ? '#16a34a' : '#2563eb',
            margin: '-13px -19px 10px',
            padding: '10px 14px',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 20 }}>🚌</span>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, margin: 0, fontSize: 14 }}>
                Bus {bus.busNumber || '—'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.75)', margin: 0, fontSize: 11 }}>
                {isMoving ? '● Moving' : '● Idle'}
              </p>
            </div>
          </div>

          {/* Details */}
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
            <p style={{ margin: 0 }}>👤 {bus.driverName || 'Unknown driver'}</p>
            {bus.companyName && <p style={{ margin: 0 }}>🏢 {bus.companyName}</p>}
            <p style={{ margin: 0 }}>⚡ {bus.speed || 0} km/h</p>
            {bus.distance !== undefined && (
              <p style={{ margin: 0, color: '#2563eb', fontWeight: 600 }}>
                📏 {bus.distance} km away
              </p>
            )}
          </div>

          {/* Live badge */}
          <div style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}>
            <span style={{
              width: 7, height: 7,
              background: '#22c55e',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'pulse-dot 1.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>LIVE GPS</span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

// ── Main BusMap component ─────────────────────────────────────────────────
const BusMap = ({
  buses          = [],
  userLocation   = null,
  center         = [9.0192, 38.7525],   // Addis Ababa default
  zoom           = 12,
  height         = '100%',
  flyToUser      = false,
  recenterTrigger = 0,                  // increment to imperatively recenter
  defaultLayer   = 'street',
}) => {
  const [activeLayer, setActiveLayer] = useState(defaultLayer);

  const safeCenter = isValidLatLng(center?.[0], center?.[1])
    ? center
    : [9.0192, 38.7525];

  const safeUser =
    userLocation && isValidLatLng(userLocation.lat, userLocation.lng)
      ? userLocation
      : null;

  const validBuses = (Array.isArray(buses) ? buses : []).filter((b) =>
    isValidLatLng(b?.latitude ?? b?.lat, b?.longitude ?? b?.lng)
  );

  const tile = TILE_LAYERS[activeLayer] || TILE_LAYERS.street;
  const isSatellite = activeLayer === 'satellite';

  return (
    <MapErrorBoundary>
      <div
        style={{ height, width: '100%', position: 'relative' }}
        className="rounded-xl overflow-hidden shadow-sm border border-gray-200"
      >
        <MapContainer
          center={safeCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}          // we position it manually below
          attributionControl={true}
        >
          {/* Active tile layer */}
          <TileLayer
            key={activeLayer}          // force remount on layer change
            url={tile.url}
            attribution={tile.attribution}
            maxZoom={tile.maxZoom}
          />

          {/* Zoom control — bottom-left so it doesn't clash with layer toggle */}
          <ZoomControlBottomLeft />

          {/* Layer toggle — top-right */}
          <LayerSwitcher layer={activeLayer} onToggle={setActiveLayer} />

          {/* Passenger marker — only rendered when coords are valid */}
          {safeUser && (
            <Marker
              position={[safeUser.lat, safeUser.lng]}
              icon={createUserIcon(isSatellite)}
            >
              <Popup>
                <div style={{ textAlign: 'center', fontFamily: 'system-ui,sans-serif', padding: '4px 0' }}>
                  <p style={{ fontSize: 22, margin: '0 0 4px' }}>📍</p>
                  <p style={{ fontWeight: 700, color: '#7c3aed', margin: 0, fontSize: 13 }}>Your Location</p>
                  {safeUser.accuracy && (
                    <p style={{ color: '#6b7280', margin: '3px 0 0', fontSize: 11 }}>
                      Accuracy: ~{safeUser.accuracy} m
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Bus markers */}
          {validBuses.map((bus, idx) => (
            <BusMarker
              key={bus.tripId || bus._id || idx}
              bus={bus}
              isSatellite={isSatellite}
            />
          ))}

          {flyToUser && safeUser && <FlyToUser position={safeUser} trigger={recenterTrigger} />}
        </MapContainer>

        {/* Empty state overlay — shown on top of the map, not inside it */}
        {!validBuses.length && (
          <div style={{
            position:   'absolute',
            bottom:     16,
            left:       '50%',
            transform:  'translateX(-50%)',
            zIndex:     999,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(6px)',
            borderRadius: 10,
            padding:    '8px 16px',
            fontSize:   12,
            color:      '#6b7280',
            fontFamily: 'system-ui,sans-serif',
            whiteSpace: 'nowrap',
            boxShadow:  '0 2px 8px rgba(0,0,0,0.12)',
            pointerEvents: 'none',
          }}>
            🚌 No active buses on the map
          </div>
        )}
      </div>
    </MapErrorBoundary>
  );
};

// ── Zoom control positioned bottom-left ───────────────────────────────────
const ZoomControlBottomLeft = () => {
  const map = useMap();
  useEffect(() => {
    // Remove the default zoom control (added by MapContainer) and add one at bottom-left
    map.zoomControl?.remove();
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
  }, [map]);
  return null;
};

export default BusMap;
