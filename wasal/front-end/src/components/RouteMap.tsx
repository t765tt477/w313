import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pickupIcon = L.divIcon({
  className: 'route-marker',
  html: `<div style="background:#16a34a;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,.3);"></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const deliveryIcon = L.divIcon({
  className: 'route-marker',
  html: `<div style="background:#eab308;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,.3);"></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

// Google-Maps-style "puck": a directional arrow that rotates to the driver's
// heading, sitting on a pulsing accuracy halo — this is what gives the live
// tracking its "moving on the road" feel instead of a static pin.
function buildDriverIcon(heading: number) {
  return L.divIcon({
    className: 'route-marker driver-marker',
    html: `
      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
        <div class="driver-pulse" style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(37,99,235,.25);"></div>
        <div style="position:relative;width:26px;height:26px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;transform:rotate(${heading}deg);transition:transform .3s linear;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M12 2 L19 21 L12 17 L5 21 Z"/></svg>
        </div>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}

interface LatLng { lat: number; lng: number }

interface RouteMapProps {
  pickup: { lat: number; lng: number; address?: string };
  delivery: { lat: number; lng: number; address?: string };
  driverPosition?: LatLng | null;
  height?: string;
  /** Which leg of the trip the driver is currently on — decides the live road route target. */
  activeLeg?: 'to_pickup' | 'to_delivery';
  /** Show the floating map controls (follow/recenter, zoom, open-in-maps). Default true. */
  showControls?: boolean;
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function toDeg(rad: number) { return (rad * 180) / Math.PI; }

function bearingBetween(from: LatLng, to: LatLng) {
  const lat1 = toRad(from.lat), lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Fits the map to all relevant points exactly once (on first paint), so that
// later live GPS updates don't keep yanking the zoom/pan around.
function InitialFitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current) return;
    if (points.length >= 2) {
      map.fitBounds(points as any, { padding: [50, 50] });
      didFit.current = true;
    } else if (points.length === 1) {
      map.setView(points[0], 15);
      didFit.current = true;
    }
  }, [points, map]);
  return null;
}

// While "follow" mode is on, smoothly re-centers on the driver every time a
// new GPS fix comes in — this is the behavior that makes it feel like Google
// Maps' live navigation instead of a map that merely shows a dot.
function FollowDriver({ position, follow }: { position: LatLng | null; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!follow || !position) return;
    map.panTo([position.lat, position.lng], { animate: true, duration: 0.8 });
  }, [position?.lat, position?.lng, follow, map]);
  return null;
}

function MapReady({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
}

// Drops out of "follow" mode the moment the user manually drags the map, so
// a person looking around isn't fought by the auto-recenter-on-driver.
function UserInteractionListener({ onInteract }: { onInteract: () => void }) {
  useMapEvents({
    dragstart: () => onInteract(),
  });
  return null;
}

export default function RouteMap({
  pickup,
  delivery,
  driverPosition,
  height = '320px',
  activeLeg = 'to_delivery',
  showControls = true,
}: RouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [follow, setFollow] = useState(true);
  const [heading, setHeading] = useState(0);
  const prevPosRef = useRef<LatLng | null>(null);
  const [roadRoute, setRoadRoute] = useState<[number, number][] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const lastFetchRef = useRef<{ pos: LatLng; time: number } | null>(null);

  const target = activeLeg === 'to_pickup' ? pickup : delivery;

  // Track heading so the driver puck rotates to face the direction of travel,
  // just like a real navigation app.
  useEffect(() => {
    if (!driverPosition) return;
    const prev = prevPosRef.current;
    if (prev) {
      const moved = distanceMeters(prev, driverPosition);
      if (moved > 3) {
        setHeading(bearingBetween(prev, driverPosition));
        prevPosRef.current = driverPosition;
      }
    } else {
      prevPosRef.current = driverPosition;
    }
  }, [driverPosition?.lat, driverPosition?.lng]);

  // Fetch a real road-following route (OSRM public routing) from the driver's
  // live position to whichever stop is next, throttled so we don't spam the
  // routing API on every GPS tick.
  useEffect(() => {
    if (!driverPosition) { setRoadRoute(null); setRouteInfo(null); return; }
    const last = lastFetchRef.current;
    const now = Date.now();
    if (last && distanceMeters(last.pos, driverPosition) < 25 && now - last.time < 15000) return;

    let cancelled = false;
    const url = `https://router.project-osrm.org/route/v1/driving/${driverPosition.lng},${driverPosition.lat};${target.lng},${target.lat}?overview=full&geometries=geojson`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const route = data?.routes?.[0];
        if (route?.geometry?.coordinates) {
          setRoadRoute(route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]));
          setRouteInfo({ distance: route.distance, duration: route.duration });
          lastFetchRef.current = { pos: driverPosition, time: now };
        }
      })
      .catch(() => { /* offline / rate-limited: fall back to the straight dashed line */ });
    return () => { cancelled = true; };
  }, [driverPosition?.lat, driverPosition?.lng, target.lat, target.lng]);

  const driverIcon = useMemo(() => buildDriverIcon(heading), [heading]);

  if (!pickup?.lat || !pickup?.lng || !delivery?.lat || !delivery?.lng) {
    return (
      <div style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '14px' }}>بيانات الموقع غير متوفرة</div>
        </div>
      </div>
    );
  }

  const initialPoints: [number, number][] = [
    [pickup.lat, pickup.lng],
    [delivery.lat, delivery.lng],
    ...(driverPosition ? [[driverPosition.lat, driverPosition.lng] as [number, number]] : [])
  ];

  const handleRecenter = useCallback(() => {
    setFollow(true);
    if (mapRef.current && driverPosition) {
      mapRef.current.setView([driverPosition.lat, driverPosition.lng], 16, { animate: true });
    } else if (mapRef.current) {
      mapRef.current.fitBounds(initialPoints as any, { padding: [50, 50] });
    }
  }, [driverPosition]);

  const handleZoomIn = useCallback(() => {
    setFollow(false);
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    setFollow(false);
    mapRef.current?.zoomOut();
  }, []);

  const navigateUrl = driverPosition
    ? `https://www.google.com/maps/dir/?api=1&origin=${driverPosition.lat},${driverPosition.lng}&destination=${target.lat},${target.lng}&travelmode=driving`
    : null;

  const km = routeInfo ? (routeInfo.distance / 1000).toFixed(1) : null;
  const mins = routeInfo ? Math.max(1, Math.round(routeInfo.duration / 60)) : null;

  return (
    <div style={{ position: 'relative', height, width: '100%', borderRadius: 16, overflow: 'hidden' }}>
      <MapContainer
        center={[pickup.lat, pickup.lng]}
        zoom={14}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />
        <Marker position={[delivery.lat, delivery.lng]} icon={deliveryIcon} />
        {driverPosition && (
          <Marker position={[driverPosition.lat, driverPosition.lng]} icon={driverIcon} />
        )}

        {/* Faded reference line for the whole trip, pickup -> delivery */}
        <Polyline
          positions={[[pickup.lat, pickup.lng], [delivery.lat, delivery.lng]]}
          pathOptions={{ color: '#94a3b8', weight: 2, dashArray: '6,8', opacity: 0.6 }}
        />

        {/* Real road route the driver is currently following, live */}
        {driverPosition && (
          <Polyline
            positions={roadRoute ?? [[driverPosition.lat, driverPosition.lng], [target.lat, target.lng]]}
            pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.9 }}
          />
        )}

        <InitialFitBounds points={initialPoints} />
        <FollowDriver position={driverPosition ?? null} follow={follow} />
        <MapReady onReady={(m) => { mapRef.current = m; }} />
        <UserInteractionListener onInteract={() => setFollow(false)} />
      </MapContainer>

      {/* ETA / distance badge */}
      {routeInfo && (
        <div
          style={{
            position: 'absolute', top: 12, insetInlineStart: 12, zIndex: 500,
            background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(4px)',
            borderRadius: 999, padding: '6px 14px', boxShadow: '0 4px 14px rgba(0,0,0,.15)',
            fontSize: 12, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <span>⏱️ {mins} دقيقة</span>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <span>{km} كم</span>
        </div>
      )}

      {showControls && (
        <div style={{ position: 'absolute', bottom: 12, insetInlineEnd: 12, zIndex: 500, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {navigateUrl && (
            <a
              href={navigateUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="فتح المسار في خرائط جوجل"
              style={{
                width: 40, height: 40, borderRadius: '50%', background: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,.25)', color: 'white', textDecoration: 'none'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l7-7-7-7M19 12H5" />
              </svg>
            </a>
          )}
          {driverPosition && (
            <button
              type="button"
              onClick={handleRecenter}
              title="تتبع موقع المندوب"
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: follow ? '#16a34a' : 'rgba(255,255,255,.95)',
                color: follow ? 'white' : '#334155',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,.2)', border: 'none', cursor: 'pointer'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={handleZoomIn}
            title="تكبير"
            style={{
              width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.95)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,.2)', border: 'none', cursor: 'pointer', color: '#334155', fontSize: 20, fontWeight: 900
            }}
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="تصغير"
            style={{
              width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.95)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,.2)', border: 'none', cursor: 'pointer', color: '#334155', fontSize: 20, fontWeight: 900
            }}
          >
            −
          </button>
        </div>
      )}

      <style>{`
        .driver-pulse {
          animation: route-map-pulse 1.8s ease-out infinite;
        }
        @keyframes route-map-pulse {
          0% { transform: scale(0.6); opacity: .7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
