"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import mapboxgl from "mapbox-gl";
import { Pencil, Heart, Circle, Route, Eye, EyeOff, Undo2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/map/search-bar";
import { RideDetailsPanel } from "@/components/panels/ride-details";
import { ElevationProfile, SpeedProfile, PowerProfile, CadenceProfile } from "@/components/panels/data-viz";
import { useToast } from "@/components/ui/toast";
import { snapToRoads, buildRoutePoints, computeStats } from "@/lib/route-engine";
import { generateGPX, humanizeTimestamps } from "@/lib/gpx-generator";
import { generateHeart, generateCircle, generateLoop } from "@/lib/shapes";
import { getTokenStore } from "@/lib/token-store";
import { flyTo } from "@/components/map/map-container";
import type { Waypoint, RoutePoint, RouteStats, DrawMode, RideDetails } from "@/lib/types";

const MapContainer = dynamic(
  () => import("@/components/map/map-container").then((m) => m.MapContainer),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /> }
);

const defaultDetails: RideDetails = {
  name: "Morning Ride",
  date: new Date().toISOString().split("T")[0],
  startTime: "07:30",
  description: "",
  avgSpeedKmh: 25,
  speedVariability: 5,
  includeHeartRate: false,
  ftp: 200,
  includePower: false,
  includeCadence: false,
  avgCadence: 85,
  bikeType: "road",
  drafting: false,
  weight: 80,
  loopDistanceKm: 30,
};

const emptyStats: RouteStats = {
  totalDistance: 0,
  totalElevationGain: 0,
  totalElevationLoss: 0,
  estimatedDuration: 0,
  averageSpeedKmh: 25,
  maxSpeedKmh: 0,
  averagePower: 0,
  normalizedPower: 0,
  averageCadence: 85,
  calories: 0,
};

export default function CreatePage() {
  const { toast } = useToast();
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [stats, setStats] = useState<RouteStats>(emptyStats);
  const [details, setDetails] = useState<RideDetails>(defaultDetails);
  const [drawMode, setDrawMode] = useState<DrawMode>("draw");
  const [showWaypoints, setShowWaypoints] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewPoints, setPreviewPoints] = useState<RoutePoint[]>([]);

  const calcStats = useCallback((pts: RoutePoint[], d: RideDetails) => {
    return computeStats(pts, d.avgSpeedKmh, d.speedVariability, {
      ftp: d.ftp,
      avgCadence: d.avgCadence,
      weight: d.weight,
    });
  }, []);

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
        setStats(emptyStats);
        return;
      }

      setIsProcessing(true);
      try {
        const { geometry } = await snapToRoads(wps);
        setRouteGeometry(geometry);
        const points = buildRoutePoints(geometry, mapRef.current);
        setRoutePoints(points);
        setStats(calcStats(points, details));
      } catch (error) {
        console.error("Route processing error:", error);
        toast({ title: "Route Error", description: "Could not process route.", variant: "error" });
        setRouteGeometry(wps.map((w): [number, number] => [w.lng, w.lat]));
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
        const newWaypoints = [...waypoints, { lng: lngLat.lng, lat: lngLat.lat }];
        setWaypoints(newWaypoints);
        await processRoute(newWaypoints);
      } else if (drawMode === "loop") {
        toast({ title: "Generating loop", description: `~${details.loopDistanceKm}km loop...` });
        const loopWps = generateLoop([lngLat.lng, lngLat.lat], details.loopDistanceKm);
        setWaypoints(loopWps);
        await processRoute(loopWps);
      } else {
        const isHeart = drawMode === "heart";
        toast({ title: `${isHeart ? "Heart" : "Circle"} shape`, description: "Generating..." });
        const shapeWps = isHeart
          ? generateHeart([lngLat.lng, lngLat.lat], 2)
          : generateCircle([lngLat.lng, lngLat.lat], 2);
        setWaypoints(shapeWps);
        await processRoute(shapeWps);
      }
    },
    [waypoints, drawMode, isProcessing, processRoute, toast, details.loopDistanceKm]
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
    setStats(emptyStats);
  }, []);

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
    a.download = `${details.name.replace(/\s+/g, "_") || "ride"}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "GPX Downloaded!", description: "1 token consumed.", variant: "success" });
  }, [routePoints, details, toast]);

  const handleSearchSelect = useCallback((lng: number, lat: number) => {
    if (mapRef.current) flyTo(mapRef.current, lng, lat);
  }, []);

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
              <Button size="sm" variant={drawMode === "draw" ? "default" : "secondary"} onClick={() => setDrawMode("draw")}>
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Draw</span>
              </Button>
              <Button size="sm" variant={drawMode === "heart" ? "default" : "secondary"} onClick={() => setDrawMode("heart")}>
                <Heart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Heart</span>
              </Button>
              <Button size="sm" variant={drawMode === "circle" ? "default" : "secondary"} onClick={() => setDrawMode("circle")}>
                <Circle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Circle</span>
              </Button>
              <Button size="sm" variant={drawMode === "loop" ? "default" : "secondary"} onClick={() => setDrawMode("loop")}>
                <Route className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Loop</span>
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

          {/* Loop distance slider */}
          {drawMode === "loop" && (
            <div className="flex items-center gap-3 px-4 py-2 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <Route className="h-4 w-4 text-orange-500 shrink-0" />
              <span className="text-sm font-medium dark:text-white whitespace-nowrap">Loop distance:</span>
              <input
                type="range"
                min={5}
                max={100}
                step={1}
                value={details.loopDistanceKm}
                onChange={(e) => setDetails({ ...details, loopDistanceKm: Number(e.target.value) })}
                className="flex-1 accent-orange-500"
              />
              <span className="text-sm font-mono text-orange-500 w-14 text-right">{details.loopDistanceKm} km</span>
            </div>
          )}

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

          {/* Data Viz (desktop) */}
          <div className="border-t dark:border-gray-800 bg-white dark:bg-gray-950 p-4 hidden lg:block">
            <div className="grid grid-cols-2 gap-6">
              <SpeedProfile points={previewPoints} averageSpeed={details.avgSpeedKmh} />
              <ElevationProfile points={previewPoints} />
              {details.includePower && <PowerProfile points={previewPoints} />}
              {details.includeCadence && <CadenceProfile points={previewPoints} />}
            </div>
          </div>
        </div>

        {/* Mobile sidebar toggle */}
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
          <RideDetailsPanel
            stats={stats}
            details={details}
            onDetailsChange={setDetails}
            onDownload={handleDownload}
            routeReady={routePoints.length >= 2}
          />

          {/* Mobile data viz */}
          <div className="lg:hidden p-4 border-t dark:border-gray-800 space-y-4">
            <SpeedProfile points={previewPoints} averageSpeed={details.avgSpeedKmh} />
            <ElevationProfile points={previewPoints} />
            {details.includePower && <PowerProfile points={previewPoints} />}
            {details.includeCadence && <CadenceProfile points={previewPoints} />}
          </div>
        </div>
      </div>
    </div>
  );
}
