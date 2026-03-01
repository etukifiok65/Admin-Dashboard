import React, { useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { AppointmentLocationDisputeSnapshot } from '@app-types/index';

interface LocationEvidenceMapProps {
  snapshots: AppointmentLocationDisputeSnapshot[];
  showPatient: boolean;
  showProvider: boolean;
  showPaths: boolean;
  loading: boolean;
  error: string | null;
}

type Role = 'patient' | 'provider';

type MapPoint = {
  key: string;
  role: Role;
  position: [number, number];
  timeBucket: string;
  capturedAt: string | null;
  accuracyMeters: number | null;
  distanceMeters: number | null;
  hasBothPoints: boolean;
};

const formatDateTime = (value: string | null): string => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const sortSnapshotsByTime = (snapshots: AppointmentLocationDisputeSnapshot[]): AppointmentLocationDisputeSnapshot[] => {
  return [...snapshots].sort((a, b) => new Date(a.timeBucket).getTime() - new Date(b.timeBucket).getTime());
};

const AutoFitBounds: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!points.length) return;

    if (points.length === 1) {
      map.setView(points[0], 16);
      return;
    }

    map.fitBounds(points, { padding: [30, 30] });
  }, [map, points]);

  return null;
};

export const LocationEvidenceMap: React.FC<LocationEvidenceMapProps> = ({
  snapshots,
  showPatient,
  showProvider,
  showPaths,
  loading,
  error,
}) => {
  const orderedSnapshots = useMemo(() => sortSnapshotsByTime(snapshots), [snapshots]);

  const patientPoints = useMemo<MapPoint[]>(() => orderedSnapshots
    .filter((snapshot) => snapshot.patient.latitude !== null && snapshot.patient.longitude !== null)
    .map((snapshot, index) => ({
      key: `patient-${snapshot.timeBucket}-${index}`,
      role: 'patient',
      position: [snapshot.patient.latitude as number, snapshot.patient.longitude as number],
      timeBucket: snapshot.timeBucket,
      capturedAt: snapshot.patient.capturedAt,
      accuracyMeters: snapshot.patient.accuracyMeters,
      distanceMeters: snapshot.distanceMeters,
      hasBothPoints: snapshot.hasBothPoints,
    })), [orderedSnapshots]);

  const providerPoints = useMemo<MapPoint[]>(() => orderedSnapshots
    .filter((snapshot) => snapshot.provider.latitude !== null && snapshot.provider.longitude !== null)
    .map((snapshot, index) => ({
      key: `provider-${snapshot.timeBucket}-${index}`,
      role: 'provider',
      position: [snapshot.provider.latitude as number, snapshot.provider.longitude as number],
      timeBucket: snapshot.timeBucket,
      capturedAt: snapshot.provider.capturedAt,
      accuracyMeters: snapshot.provider.accuracyMeters,
      distanceMeters: snapshot.distanceMeters,
      hasBothPoints: snapshot.hasBothPoints,
    })), [orderedSnapshots]);

  const visiblePoints = useMemo(() => {
    const points: MapPoint[] = [];
    if (showPatient) points.push(...patientPoints);
    if (showProvider) points.push(...providerPoints);
    return points;
  }, [patientPoints, providerPoints, showPatient, showProvider]);

  if (loading) {
    return <p className="mt-3 text-sm text-slate-500">Loading location evidence...</p>;
  }

  if (error) {
    return <p className="mt-3 text-sm text-red-600">{error}</p>;
  }

  if (visiblePoints.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">No map data available</p>;
  }

  const patientPath = patientPoints.map((point) => point.position);
  const providerPath = providerPoints.map((point) => point.position);

  return (
    <div className="mt-3 h-80 overflow-hidden rounded-lg border border-slate-200">
      <MapContainer
        center={visiblePoints[0].position}
        zoom={13}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AutoFitBounds points={visiblePoints.map((point) => point.position)} />

        {showPaths && showPatient && patientPath.length > 1 && (
          <Polyline positions={patientPath} pathOptions={{ color: '#2563eb', weight: 3, opacity: 0.7 }} />
        )}

        {showPaths && showProvider && providerPath.length > 1 && (
          <Polyline positions={providerPath} pathOptions={{ color: '#16a34a', weight: 3, opacity: 0.7 }} />
        )}

        {showPatient && patientPoints.map((point) => (
          <CircleMarker
            key={point.key}
            center={point.position}
            radius={7}
            pathOptions={{ color: '#1d4ed8', fillColor: '#2563eb', fillOpacity: 0.95 }}
          >
            <Popup>
              <div className="space-y-1 text-xs text-slate-700">
                <p className="font-semibold text-blue-700">Patient</p>
                <p>Time bucket: {formatDateTime(point.timeBucket)}</p>
                <p>Captured: {formatDateTime(point.capturedAt)}</p>
                <p>Accuracy: {point.accuracyMeters !== null ? `${point.accuracyMeters.toFixed(2)} m` : 'N/A'}</p>
                {point.hasBothPoints && point.distanceMeters !== null && (
                  <p>Distance: {point.distanceMeters.toFixed(2)} m</p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {showProvider && providerPoints.map((point) => (
          <CircleMarker
            key={point.key}
            center={point.position}
            radius={7}
            pathOptions={{ color: '#15803d', fillColor: '#16a34a', fillOpacity: 0.95 }}
          >
            <Popup>
              <div className="space-y-1 text-xs text-slate-700">
                <p className="font-semibold text-emerald-700">Provider</p>
                <p>Time bucket: {formatDateTime(point.timeBucket)}</p>
                <p>Captured: {formatDateTime(point.capturedAt)}</p>
                <p>Accuracy: {point.accuracyMeters !== null ? `${point.accuracyMeters.toFixed(2)} m` : 'N/A'}</p>
                {point.hasBothPoints && point.distanceMeters !== null && (
                  <p>Distance: {point.distanceMeters.toFixed(2)} m</p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LocationEvidenceMap;
