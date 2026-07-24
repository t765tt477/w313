import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
  height?: string;
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  onLocationSelect,
  initialLat = 24.7136,
  initialLng = 46.6753,
  height = '400px'
}: LocationPickerProps) {
  const [position, setPosition] = useState<L.LatLngExpression>([initialLat, initialLng]);
  const [address, setAddress] = useState<string>('');

  const handleLocationSelect = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    
    // Reverse geocoding using OpenStreetMap Nominatim API (free)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      const formattedAddress = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(formattedAddress);
      onLocationSelect(lat, lng, formattedAddress);
    } catch (error) {
      console.error('Error fetching address:', error);
      const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(fallbackAddress);
      onLocationSelect(lat, lng, fallbackAddress);
    }
  };

  useEffect(() => {
    // Fetch initial address
    handleLocationSelect(initialLat, initialLng);
  }, [initialLat, initialLng]);

  return (
    <div className="w-full">
      <div className="mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600 mb-1">الموقع المحدد:</p>
        <p className="font-medium text-gray-800">{address || 'جاري تحميل العنوان...'}</p>
        {position && (
          <p className="text-xs text-gray-500 mt-1">
            الإحداثيات: {Array.isArray(position) ? `${position[0].toFixed(6)}, ${position[1].toFixed(6)}` : ''}
          </p>
        )}
      </div>
      
      <MapContainer
        center={position}
        zoom={13}
        style={{ height, width: '100%', borderRadius: '8px', zIndex: 1 }}
        className="border border-gray-300"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} />
        <MapClickHandler onLocationSelect={handleLocationSelect} />
      </MapContainer>
      
      <p className="text-xs text-gray-500 mt-2 text-center">
        انقر على الخريطة لتحديد الموقع
      </p>
    </div>
  );
}
