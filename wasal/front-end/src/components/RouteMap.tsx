import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
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

const driverIcon = L.divIcon({
  className: 'route-marker',
  html: `<div style="background:#2563eb;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">
      <div style="width:8px;height:8px;background:white;border-radius:50%;"></div>
    </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

interface RouteMapProps {
  pickup: { lat: number; lng: number; address?: string };
  delivery: { lat: number; lng: number; address?: string };
  driverPosition?: { lat: number; lng: number } | null;
  height?: string;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(points as any, { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [JSON.stringify(points), map]);
  return null;
}

export default function RouteMap({ pickup, delivery, driverPosition, height = '320px' }: RouteMapProps) {
  if (!pickup?.lat || !pickup?.lng || !delivery?.lat || !delivery?.lng) {
    return (
      <div style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '14px' }}>بيانات الموقع غير متوفرة</div>
        </div>
      </div>
    );
  }

  const points: [number, number][] = [
    [pickup.lat, pickup.lng],
    [delivery.lat, delivery.lng],
    ...(driverPosition ? [[driverPosition.lat, driverPosition.lng] as [number, number]] : [])
  ];

  return (
    <div style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden' }}>
      <MapContainer center={[pickup.lat, pickup.lng]} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />
        <Marker position={[delivery.lat, delivery.lng]} icon={deliveryIcon} />
        {driverPosition && (
          <Marker position={[driverPosition.lat, driverPosition.lng]} icon={driverIcon} />
        )}
        <Polyline
          positions={[[pickup.lat, pickup.lng], [delivery.lat, delivery.lng]]}
          pathOptions={{ color: '#16a34a', weight: 3, dashArray: '6,6' }}
        />
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
