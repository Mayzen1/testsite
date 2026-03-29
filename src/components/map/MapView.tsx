'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
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
}

export default function MapView({
  waypoints,
  routeGeometry,
  onWaypointAdd,
  onWaypointsSet,
  drawMode,
  shapeSize,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [2.3522, 48.8566], // Paris
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add geocoder search
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      // Add route line source and layer
      map.current!.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
      });

      map.current!.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#3b82f6', 'line-width': 4, 'line-opacity': 0.8 },
      });

      // Add waypoints source and layer
      map.current!.addSource('waypoints-preview', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current!.addLayer({
        id: 'waypoints-preview-line',
        type: 'line',
        source: 'waypoints-preview',
        paint: { 'line-color': '#94a3b8', 'line-width': 2, 'line-dasharray': [4, 4] },
      });

      setMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Handle map clicks for free drawing mode
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      if (drawMode !== 'free') return;

      const waypoint: Waypoint = {
        id: uuidv4(),
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
      };
      onWaypointAdd(waypoint);
    };

    map.current.on('click', handleClick);
    return () => {
      map.current?.off('click', handleClick);
    };
  }, [drawMode, onWaypointAdd, mapReady]);

  // Handle shape generation when drawMode changes (not 'free')
  const generateShape = useCallback(() => {
    if (!map.current || drawMode === 'free') return;

    const center = map.current.getCenter();
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

    const newWaypoints: Waypoint[] = shapeCoords.map((coord) => ({
      id: uuidv4(),
      lng: coord[0],
      lat: coord[1],
    }));

    onWaypointsSet(newWaypoints);
  }, [drawMode, shapeSize, onWaypointsSet]);

  // Expose generateShape on drawMode change
  useEffect(() => {
    if (drawMode !== 'free' && mapReady) {
      generateShape();
    }
  }, [drawMode, generateShape, mapReady]);

  // Update markers on waypoints change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    waypoints.forEach((wp, idx) => {
      const el = document.createElement('div');
      el.className = 'waypoint-marker';
      el.style.cssText = `
        width: 24px; height: 24px; border-radius: 50%;
        background: ${idx === 0 ? '#22c55e' : idx === waypoints.length - 1 ? '#ef4444' : '#3b82f6'};
        border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: 10px; color: white; font-weight: bold;
      `;
      if (idx === 0) el.textContent = 'S';
      else if (idx === waypoints.length - 1) el.textContent = 'F';

      const marker = new mapboxgl.Marker({ element: el, draggable: false })
        .setLngLat([wp.lng, wp.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Update dashed preview line
    if (map.current.getSource('waypoints-preview')) {
      const coords = waypoints.map((w) => [w.lng, w.lat]);
      (map.current.getSource('waypoints-preview') as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: {},
      });
    }
  }, [waypoints]);

  // Update route geometry on the map
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const source = map.current.getSource('route') as mapboxgl.GeoJSONSource;
    if (!source) return;

    if (routeGeometry && routeGeometry.length > 0) {
      source.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: routeGeometry },
        properties: {},
      });
    } else {
      source.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] },
        properties: {},
      });
    }
  }, [routeGeometry, mapReady]);

  return (
    <div ref={mapContainer} className="absolute inset-0" />
  );
}
