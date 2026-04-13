'use client';

import { useState, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

interface LocationPoint {
  name: string;
  type: string;
  lat: number;
  lng: number;
  context?: string;
}

interface KuwaitMapProps {
  locations: LocationPoint[];
}

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '1rem',
};

const defaultCenter = { lat: 29.3759, lng: 47.9774 }; // وسط الكويت

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
};

const TYPE_COLORS: Record<string, string> = {
  'مسجد': '#2d8a4e',
  'مدرسة': '#8b6a3b',
  'سوق': '#c47f17',
  'حي': '#5b7fa5',
  'ميناء': '#2563eb',
  'جزيرة': '#0891b2',
  'منطقة': '#7c3aed',
};

export default function KuwaitMap({ locations }: KuwaitMapProps) {
  const [activeMarker, setActiveMarker] = useState<number | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handleMarkerClick = useCallback((index: number) => {
    setActiveMarker(index);
  }, []);

  const handleClose = useCallback(() => {
    setActiveMarker(null);
  }, []);

  if (!apiKey) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-2xl border border-[var(--line)] bg-white/60 text-center" dir="rtl">
        <div>
          <p className="text-sm text-[var(--muted)]">
            لعرض الخريطة، أضف مفتاح Google Maps في ملف .env:
          </p>
          <code className="mt-2 block text-xs text-[var(--accent-strong)]">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=مفتاحك_هنا
          </code>
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-2xl border border-[var(--line)] bg-white/60" dir="rtl">
        <p className="text-sm text-[var(--muted)]">لا توجد مواقع جغرافية لعرضها.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      {/* شريط الأنواع */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_COLORS).map(([type, color]) => {
          const count = locations.filter((l) => l.type === type).length;
          if (count === 0) return null;
          return (
            <span
              key={type}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: color }}
            >
              {type} ({count})
            </span>
          );
        })}
      </div>

      {/* الخريطة */}
      <LoadScript googleMapsApiKey={apiKey}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={defaultCenter}
          zoom={12}
          options={mapOptions}
        >
          {locations.map((loc, i) => (
            <Marker
              key={`${loc.name}-${i}`}
              position={{ lat: loc.lat, lng: loc.lng }}
              onClick={() => handleMarkerClick(i)}
            >
              {activeMarker === i && (
                <InfoWindow onCloseClick={handleClose}>
                  <div dir="rtl" className="max-w-[250px] p-1 text-right">
                    <h3 className="mb-1 text-sm font-bold">{loc.name}</h3>
                    <span
                      className="mb-2 inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-medium text-white"
                      style={{ backgroundColor: TYPE_COLORS[loc.type] ?? '#6b7280' }}
                    >
                      {loc.type}
                    </span>
                    {loc.context ? (
                      <p className="mt-1 text-xs leading-5 text-gray-600">
                        &ldquo;{loc.context}&rdquo;
                      </p>
                    ) : null}
                  </div>
                </InfoWindow>
              )}
            </Marker>
          ))}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}
