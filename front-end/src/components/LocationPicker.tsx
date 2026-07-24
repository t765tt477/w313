import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom marker icon
const customIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      background: linear-gradient(135deg, #16a34a, #15803d);
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 12px;
        height: 12px;
        background: white;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
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

function MapController({ position }: { position: L.LatLngExpression }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position as L.LatLngExpression, 16, { animate: true });
    }
  }, [position, map]);

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    setLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=ar`
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
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=ar`
        );
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error('Error searching:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleLocationSelect(latitude, longitude);
        setLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('فشل في تحديد الموقع الحالي');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    handleLocationSelect(lat, lon);
    setSearchQuery(result.display_name);
    setSearchResults([]);
  };

  useEffect(() => {
    handleLocationSelect(initialLat, initialLng);
  }, [initialLat, initialLng]);

  return (
    <div className="w-full">
      {/* Search Bar */}
      <div className="mb-3 relative">
        <div className="flex gap-2 px-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="ابحث عن عنوان..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-right"
              dir="rtl"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            onClick={handleGetCurrentLocation}
            disabled={locating}
            className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="تحديد موقعي الحالي"
          >
            {locating ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handleSelectSearchResult(result)}
                className="w-full px-4 py-3 text-right hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="text-sm font-medium text-gray-800">{result.display_name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Address Display */}
      <div className="mb-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs text-green-700 font-semibold mb-1">الموقع المحدد:</p>
            <p className="text-sm text-gray-800 font-medium leading-relaxed">
              {loading ? 'جاري تحميل العنوان...' : address || 'جاري تحميل العنوان...'}
            </p>
            {position && (
              <p className="text-xs text-gray-500 mt-2">
                الإحداثيات: {Array.isArray(position) ? `${position[0].toFixed(6)}, ${position[1].toFixed(6)}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={position}
        zoom={16}
        style={{ height, width: '100%', zIndex: 1 }}
        className="border-2 border-green-200 shadow-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={customIcon} />
        <MapClickHandler onLocationSelect={handleLocationSelect} />
        <MapController position={position} />
      </MapContainer>

      {/* Instructions */}
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>انقر على الخريطة أو استخدم البحث لتحديد الموقع</span>
      </div>
    </div>
  );
}
