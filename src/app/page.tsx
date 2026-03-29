'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/map/SearchBar';
import ToolBar from '@/components/panels/ToolBar';
import ConfigPanel from '@/components/panels/ConfigPanel';
import ElevationChart from '@/components/panels/ElevationChart';
import type { Waypoint, DrawMode, RouteStats, RoutePoint } from '@/lib/types';
import { buildRoutePoints, computeStats } from '@/lib/route-engine';
import { humanizeTimestamps, generateGPX } from '@/lib/gpx-generator';

// Mapbox GL requires browser APIs — load client-side only
const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

export default function Home() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [drawMode, setDrawMode] = useState<DrawMode>('free');
  const [shapeSize, setShapeSize] = useState(2);
  const [paceMinPerKm, setPaceMinPerKm] = useState(5.5);
  const [stats, setStats] = useState<RouteStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleWaypointAdd = useCallback((wp: Waypoint) => {
    setWaypoints((prev) => [...prev, wp]);
    setRouteGeometry(null);
    setStats(null);
    setRoutePoints([]);
  }, []);

  const handleWaypointsSet = useCallback((wps: Waypoint[]) => {
    setWaypoints(wps);
    setRouteGeometry(null);
    setStats(null);
    setRoutePoints([]);
  }, []);

  const handleUndo = useCallback(() => {
    setWaypoints((prev) => prev.slice(0, -1));
    setRouteGeometry(null);
    setStats(null);
    setRoutePoints([]);
  }, []);

  const handleClear = useCallback(() => {
    setWaypoints([]);
    setRouteGeometry(null);
    setStats(null);
    setRoutePoints([]);
    setDrawMode('free');
  }, []);

  const handleDrawModeChange = useCallback((mode: DrawMode) => {
    setDrawMode(mode);
    if (mode !== 'free') {
      setRouteGeometry(null);
      setStats(null);
      setRoutePoints([]);
    }
  }, []);

  const handlePlaceSelect = useCallback((_lng: number, _lat: number, _name: string) => {
    // Place selection — could fly to location if we had map ref
  }, []);

  const handleGenerate = useCallback(async () => {
    if (waypoints.length < 2) return;

    setIsLoading(true);
    try {
      const points = await buildRoutePoints(waypoints);

      if (points.length === 0) {
        alert('Impossible de calculer le parcours. Vérifiez les waypoints.');
        return;
      }

      const routeStats = computeStats(points, paceMinPerKm);
      setStats(routeStats);
      setRouteGeometry(points.map((p) => [p.lng, p.lat] as [number, number]));

      const humanized = humanizeTimestamps(points, {
        paceMinPerKm,
        startTime: new Date(),
        activityType: 'running',
      });

      setRoutePoints(humanized);

      const gpxContent = generateGPX(humanized, `FakeMyRun - ${(routeStats.totalDistance / 1000).toFixed(1)}km`);
      downloadFile(gpxContent, 'fakemyrun-activity.gpx', 'application/gpx+xml');
    } catch (err) {
      console.error('GPX generation failed:', err);
      alert(`Erreur: ${err instanceof Error ? err.message : 'Échec de la génération'}`);
    } finally {
      setIsLoading(false);
    }
  }, [waypoints, paceMinPerKm]);

  return (
    <div className="h-full flex relative">
      {/* Map (full page) */}
      <div className="flex-1 relative">
        <MapView
          waypoints={waypoints}
          routeGeometry={routeGeometry}
          onWaypointAdd={handleWaypointAdd}
          onWaypointsSet={handleWaypointsSet}
          drawMode={drawMode}
          shapeSize={shapeSize}
        />

        {/* Search bar overlay */}
        <div className="absolute top-4 left-4 z-10">
          <SearchBar onPlaceSelect={handlePlaceSelect} />
        </div>

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-2.5 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Right sidebar */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-80' : 'w-0'
        } overflow-hidden flex-shrink-0`}
      >
        <div className="w-80 h-full bg-gray-50 border-l border-gray-200 overflow-y-auto p-4 space-y-4">
          <div className="text-center pb-2 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-800">FakeMyRun</h1>
            <p className="text-xs text-gray-400">Générateur de GPX réaliste</p>
          </div>

          <ToolBar
            drawMode={drawMode}
            onDrawModeChange={handleDrawModeChange}
            shapeSize={shapeSize}
            onShapeSizeChange={setShapeSize}
            onClear={handleClear}
            onUndo={handleUndo}
            waypointCount={waypoints.length}
          />

          <ConfigPanel
            paceMinPerKm={paceMinPerKm}
            onPaceChange={setPaceMinPerKm}
            stats={stats}
            isLoading={isLoading}
            onGenerate={handleGenerate}
            canGenerate={waypoints.length >= 2}
          />

          {routePoints.length > 0 && <ElevationChart points={routePoints} />}

          {waypoints.length === 0 && (
            <div className="bg-blue-50 rounded-lg p-4 text-xs text-blue-700 space-y-1">
              <p className="font-semibold">Comment utiliser :</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Cliquez sur la carte pour placer des waypoints</li>
                <li>Ou choisissez une forme automatique</li>
                <li>Ajustez l&apos;allure souhaitée</li>
                <li>Cliquez &quot;Générer &amp; Télécharger GPX&quot;</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
