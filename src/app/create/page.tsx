"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import mapboxgl from "mapbox-gl";
import { Pencil, Heart, Circle, Eye, EyeOff, Undo2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/map/search-bar";
import { RunDetailsPanel } from "@/components/panels/run-details";
import { PaceProfile, ElevationProfile, SpeedProfile, PowerProfile } from "@/components/panels/data-viz";
import { useToast } from "@/components/ui/toast";
import { snapToRoads, buildRoutePoints, computeStats } from "@/lib/route-engine";
import { generateGPX, humanizeTimestamps } from "@/lib/gpx-generator";
import { generateHeart, generateCircle } from "@/lib/shapes";
import { getTokenStore } from "@/lib/token-store";
import { flyTo } from "@/components/map/map-container";
import type { Waypoint, RoutePoint, RouteStats, DrawMode, RunDetails } from "@/lib/types";

// Dynamic import for MapContainer (no SSR due to mapbox-gl)
const MapContainer = dynamic(
  () => import("@/components/map/map-container").then((m) => m.MapContainer),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /> }
);

const defaultDetails: RunDetails = {
  name: "Morning Run",
  date: new Date().toISOString().split("T")[0],
  startTime: "07:30",
  description: "",
  activityType: "run",
  paceMinPerKm: 5.5,
  paceInconsistency: 5,
  includeHeartRate: false,
  avgSpeedKmh: 25,
  ftp: 200,
  includePower: false,
  includeCadence: false,
  avgCadence: 85,
  bikeType: "road",
  drafting: false,
  weight: 80,
};

export default function CreatePage() {
  const { toast } = useToast();
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [stats, setStats] = useState<RouteStats>({
    totalDistance: 0,
    totalElevationGain: 0,
    totalElevationLoss: 0,
    estimatedDuration: 0,
    averagePace: 5.5,
    paceInconsistency: 5,
    averageSpeedKmh: 25,
    maxSpeedKmh: 0,
    averagePower: 0,
    normalizedPower: 0,
    averageCadence: 85,
    calories: 0,
  });
  const [details, setDetails] = useState<RunDetails>(defaultDetails);
  const [drawMode, setDrawMode] = useState<DrawMode>("draw");
  const [showWaypoints, setShowWaypoints] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Preview points with timestamps applied (for charts)
  const [previewPoints, setPreviewPoints] = useState<RoutePoint[]>([]);

  const calcStats = useCallback((pts: RoutePoint[], d: RunDetails) => {
    return computeStats(pts, d.paceMinPerKm, d.paceInconsistency, d.activityType, {
      avgSpeedKmh: d.avgSpeedKmh,
      ftp: d.ftp,
      avgCadence: d.avgCadence,
      weight: d.weight,
    });
  }, []);

  // Recalculate stats + preview timestamps when any parameter changes
  useEffect(() => {
    if (routePoints.length >= 2) {
      setStats(calcStats(routePoints, details));
      setPreviewPoints(humanizeTimestamps(routePoints, details));
    } else {
      setPreviewPoints([]);
    }
  }, [details, routePoints, calcStats]);

  const processRoute = useCallback(
    async (wps: Waypoint[]) => {
      if (wps.length < 2) {
        setRouteGeometry([]);
        setRoutePoints([]);
        setStats(calcStats([], details));
        return;
      }

      setIsProcessing(true);
      try {
        const profile = details.activityType === 'bike' ? 'cycling' : 'walking';
        const { geometry } = await snapToRoads(wps, profile);
        setRouteGeometry(geometry);

        const points = buildRoutePoints(geometry, mapRef.current);
        setRoutePoints(points);
        setStats(calcStats(points, details));
      } catch (error) {
        console.error("Route processing error:", error);
        toast({ title: "Route Error", description: "Could not process route. Using raw points.", variant: "error" });
        const fallback = wps.map((w): [number, number] => [w.lng, w.lat]);
        setRouteGeometry(fallback);
      } finally {
        setIsProcessing(false);
      }
    },
    [details, calcStats, toast]
  );

  const handleMapClick = useCallback(
    async (lngLat: { lng: number; lat: number }) => {
      if (isProcessing) return;

      if (drawMode === "draw") {
        const newWp: Waypoint = { lng: lngLat.lng, lat: lngLat.lat };
        const newWaypoints = [...waypoints, newWp];
        setWaypoints(newWaypoints);
        await processRoute(newWaypoints);
      } else {
        // Shape mode: generate shape centered on click
        const shapeName = drawMode === "heart" ? "Heart" : "Circle";
        toast({
          title: `${shapeName} shape recentered`,
          description: "Generating shape at new location...",
        });

        const shapeWaypoints =
          drawMode === "heart"
            ? generateHeart([lngLat.lng, lngLat.lat], 2)
            : generateCircle([lngLat.lng, lngLat.lat], 2);

        setWaypoints(shapeWaypoints);
        await processRoute(shapeWaypoints);
      }
    },
    [waypoints, drawMode, isProcessing, processRoute, toast]
  );

  const handleUndo = useCallback(async () => {
    if (waypoints.length === 0) return;
    const newWps = waypoints.slice(0, -1);
    setWaypoints(newWps);
    await processRoute(newWps);
  }, [waypoints, processRoute]);

  const handleClear = useCallback(() => {
    setWaypoints([]);
    setRouteGeometry([]);
    setRoutePoints([]);
    setStats(calcStats([], details));
  }, [details, calcStats]);

  const handleDownload = useCallback(() => {
    if (routePoints.length < 2) {
      toast({ title: "No route", description: "Draw a route first.", variant: "error" });
      return;
    }

    const store = getTokenStore();
    if (!store.useToken()) {
      toast({ title: "No tokens", description: "Get free tokens to download.", variant: "error" });
      return;
    }

    const gpx = generateGPX(routePoints, details);
    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${details.name.replace(/\s+/g, "_") || "route"}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "GPX Downloaded!", description: "1 token consumed.", variant: "success" });
  }, [routePoints, details, toast]);

  const handleSearchSelect = useCallback(
    (lng: number, lat: number) => {
      if (mapRef.current) {
        flyTo(mapRef.current, lng, lat);
      }
    },
    []
  );

  const handleMapReady = useCallback((map: mapboxgl.Map) => {
    mapRef.current = map;
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Map column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b dark:border-gray-800 bg-white dark:bg-gray-950">
            <SearchBar onSelect={handleSearchSelect} />

            <div className="flex items-center gap-1 ml-auto">
              {/* Draw mode buttons */}
              <Button
                size="sm"
                variant={drawMode === "draw" ? "default" : "secondary"}
                onClick={() => setDrawMode("draw")}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Draw</span>
              </Button>
              <Button
                size="sm"
                variant={drawMode === "heart" ? "default" : "secondary"}
                onClick={() => setDrawMode("heart")}
              >
                <Heart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Heart</span>
              </Button>
              <Button
                size="sm"
                variant={drawMode === "circle" ? "default" : "secondary"}
                onClick={() => setDrawMode("circle")}
              >
                <Circle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Circle</span>
              </Button>

              <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

              <Button size="sm" variant="ghost" onClick={() => setShowWaypoints(!showWaypoints)} title="Show Waypoints">
                {showWaypoints ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleUndo} disabled={waypoints.length === 0}>
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleClear} disabled={waypoints.length === 0}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            <MapContainer
              waypoints={waypoints}
              routeGeometry={routeGeometry}
              drawMode={drawMode}
              showWaypoints={showWaypoints}
              onMapClick={handleMapClick}
              onMapReady={handleMapReady}
            />
            {isProcessing && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 rounded-full px-4 py-2 shadow-lg text-sm font-medium dark:text-white">
                Processing route...
              </div>
            )}
          </div>

          {/* Data Visualization (below map on desktop, collapsible) */}
          <div className="border-t dark:border-gray-800 bg-white dark:bg-gray-950 p-4 hidden lg:block">
            <div className="grid grid-cols-2 gap-6">
              {details.activityType === "bike" ? (
                <>
                  <SpeedProfile points={previewPoints} averageSpeed={details.avgSpeedKmh} />
                  <ElevationProfile points={previewPoints} />
                  {details.includePower && <PowerProfile points={previewPoints} />}
                </>
              ) : (
                <>
                  <PaceProfile points={previewPoints} averagePace={details.paceMinPerKm} />
                  <ElevationProfile points={previewPoints} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar toggle for mobile */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed bottom-4 right-4 z-30 bg-orange-500 text-white rounded-full p-3 shadow-lg cursor-pointer"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>

        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          } fixed lg:relative right-0 top-14 bottom-0 w-80 lg:w-96 bg-white dark:bg-gray-950 border-l dark:border-gray-800 overflow-y-auto transition-transform lg:translate-x-0 z-20`}
        >
          <RunDetailsPanel
            stats={stats}
            details={details}
            onDetailsChange={setDetails}
            onDownload={handleDownload}
            routeReady={routePoints.length >= 2}
          />

          {/* Mobile data viz */}
          <div className="lg:hidden p-4 border-t dark:border-gray-800 space-y-4">
            {details.activityType === "bike" ? (
              <>
                <SpeedProfile points={routePoints} averageSpeed={details.avgSpeedKmh} />
                <ElevationProfile points={routePoints} />
                {details.includePower && <PowerProfile points={routePoints} />}
              </>
            ) : (
              <>
                <PaceProfile points={routePoints} averagePace={details.paceMinPerKm} />
                <ElevationProfile points={routePoints} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
