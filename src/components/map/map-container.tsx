"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { Waypoint, DrawMode } from "@/lib/types";

interface MapContainerProps {
  waypoints: Waypoint[];
  routeGeometry: [number, number][];
  drawMode: DrawMode;
  showWaypoints: boolean;
  onMapClick: (lngLat: { lng: number; lat: number }, map: mapboxgl.Map) => void;
  onMapReady: (map: mapboxgl.Map) => void;
}

export function MapContainer({
  waypoints,
  routeGeometry,
  drawMode,
  showWaypoints,
  onMapClick,
  onMapReady,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Keep a ref to the latest onMapClick so the map listener always calls the fresh version
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const onMapReadyRef = useRef(onMapReady);
  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  // Initialize map (once)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [2.3522, 48.8566], // Paris
      zoom: 12.5,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      // Add terrain for elevation queries
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1 });

      // Route line source & layer
      map.addSource("route-source", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#FC5200", "line-width": 4 },
      });

      setMapLoaded(true);
      mapRef.current = map;
      onMapReadyRef.current(map);
    });

    // Use the ref so the handler always sees the latest callback
    map.on("click", (e) => {
      onMapClickRef.current({ lng: e.lngLat.lng, lat: e.lngLat.lat }, map);
    });

    // Resize handling
    const handleResize = () => {
      setTimeout(() => map.resize(), 100);
      setTimeout(() => map.resize(), 500);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update route geometry on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("route-source") as mapboxgl.GeoJSONSource;
    if (!source) return;

    if (routeGeometry.length >= 2) {
      source.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: routeGeometry },
        properties: {},
      });
    } else {
      source.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: [] },
        properties: {},
      });
    }
  }, [routeGeometry, mapLoaded]);

  // Update markers
  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const map = mapRef.current;
    if (!map || !showWaypoints) return;

    waypoints.forEach((wp, i) => {
      const color = i === 0 ? "#22c55e" : i === waypoints.length - 1 ? "#ef4444" : "#3b82f6";
      const marker = new mapboxgl.Marker({ color, scale: 0.7 })
        .setLngLat([wp.lng, wp.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [waypoints, showWaypoints]);

  // Set cursor based on draw mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = "crosshair";
  }, [drawMode]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapContainerRef} className="absolute inset-0 rounded-lg overflow-hidden" style={{ width: "100%", height: "100%" }} />
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
            Add your Mapbox token to <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">.env.local</code>
            <br />
            <code className="text-xs">NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here</code>
          </p>
        </div>
      )}
    </div>
  );
}

// Flyto helper
export function flyTo(map: mapboxgl.Map, lng: number, lat: number, zoom?: number) {
  map.flyTo({ center: [lng, lat], zoom: zoom || 14, duration: 1500 });
}
