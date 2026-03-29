'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Waypoint, DrawMode } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { generateHeart, generateCircle, generateCat, generateDog } from '@/lib/shapes';

interface MapViewProps {
  waypoints: Waypoint[];
  routeGeometry: [number, number][] | null;
  onWaypointAdd: (waypoint: Waypoint) => void;
  onWaypointsSet: (waypoints: Waypoint[]) => void;
  drawMode: DrawMode;
  shapeSize: number;
  flyTo: [number, number] | null; // [lat, lng]
}

// Custom marker icons
function createIcon(color: string, label?: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:24px;height:24px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      font-size:10px;color:white;font-weight:bold;
    ">${label || ''}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const startIcon = createIcon('#22c55e', 'S');
const endIcon = createIcon('#ef4444', 'F');
const midIcon = createIcon('#3b82f6');

// Component that flies the map to a given position
function FlyToHandler({ flyTo }: { flyTo: [number, number] | null }) {
  const map = useMap();
  const prevFlyTo = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!flyTo || flyTo === prevFlyTo.current) return;
    prevFlyTo.current = flyTo;
    map.flyTo(flyTo, 14);
  }, [flyTo, map]);

  return null;
}

// Component that handles map click events
function ClickHandler({ drawMode, onWaypointAdd }: { drawMode: DrawMode; onWaypointAdd: (wp: Waypoint) => void }) {
  useMapEvents({
    click(e) {
      if (drawMode !== 'free') return;
      onWaypointAdd({
        id: uuidv4(),
        lng: e.latlng.lng,
        lat: e.latlng.lat,
      });
    },
  });
  return null;
}

// Component that generates shapes on the current map center
function ShapeGenerator({
  drawMode,
  shapeSize,
  onWaypointsSet,
}: {
  drawMode: DrawMode;
  shapeSize: number;
  onWaypointsSet: (wps: Waypoint[]) => void;
}) {
  const map = useMap();
  const prevMode = useRef(drawMode);

  useEffect(() => {
    if (drawMode === 'free' || drawMode === prevMode.current) return;
    prevMode.current = drawMode;

    const center = map.getCenter();
    const centerCoord: [number, number] = [center.lng, center.lat];

    let shapeCoords: [number, number][];
    switch (drawMode) {
      case 'heart':
        shapeCoords = generateHeart(centerCoord, shapeSize);
        break;
      case 'circle':
        shapeCoords = generateCircle(centerCoord, shapeSize);
        break;
      case 'cat':
        shapeCoords = generateCat(centerCoord, shapeSize);
        break;
      case 'dog':
        shapeCoords = generateDog(centerCoord, shapeSize);
        break;
      default:
        return;
    }

    onWaypointsSet(
      shapeCoords.map((coord) => ({
        id: uuidv4(),
        lng: coord[0],
        lat: coord[1],
      }))
    );
  }, [drawMode, shapeSize, map, onWaypointsSet]);

  // Reset prevMode when going back to free
  useEffect(() => {
    if (drawMode === 'free') prevMode.current = 'free';
  }, [drawMode]);

  return null;
}

export default function MapView({
  waypoints,
  routeGeometry,
  onWaypointAdd,
  onWaypointsSet,
  drawMode,
  shapeSize,
  flyTo,
}: MapViewProps) {
  // Convert route geometry from [lng, lat] to [lat, lng] for Leaflet
  const routeLatLngs = routeGeometry
    ? routeGeometry.map(([lng, lat]) => [lat, lng] as [number, number])
    : [];

  // Dashed preview line from waypoints
  const previewLatLngs = waypoints.map((w) => [w.lat, w.lng] as [number, number]);

  return (
    <MapContainer
      center={[48.8566, 2.3522]}
      zoom={13}
      className="absolute inset-0 z-0"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToHandler flyTo={flyTo} />
      <ClickHandler drawMode={drawMode} onWaypointAdd={onWaypointAdd} />
      <ShapeGenerator drawMode={drawMode} shapeSize={shapeSize} onWaypointsSet={onWaypointsSet} />

      {/* Dashed preview line between waypoints */}
      {previewLatLngs.length >= 2 && (
        <Polyline positions={previewLatLngs} pathOptions={{ color: '#94a3b8', weight: 2, dashArray: '8 8' }} />
      )}

      {/* Snapped route line */}
      {routeLatLngs.length >= 2 && (
        <Polyline positions={routeLatLngs} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8 }} />
      )}

      {/* Waypoint markers */}
      {waypoints.map((wp, idx) => (
        <Marker
          key={wp.id}
          position={[wp.lat, wp.lng]}
          icon={idx === 0 ? startIcon : idx === waypoints.length - 1 ? endIcon : midIcon}
        />
      ))}
    </MapContainer>
  );
}
