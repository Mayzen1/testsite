export interface Waypoint {
  id: string;
  lng: number;
  lat: number;
  elevation?: number;
}

export interface RoutePoint {
  lng: number;
  lat: number;
  elevation: number;
  distance: number;       // cumulative distance in meters from start
  timestamp: string;      // ISO 8601 timestamp
}

export interface RouteSegment {
  geometry: [number, number][];  // [lng, lat][] from Mapbox Directions
  distance: number;              // segment distance in meters
  duration: number;              // estimated duration in seconds
}

export interface ActivityConfig {
  paceMinPerKm: number;   // target pace in minutes per km (e.g. 5.5 = 5:30)
  startTime: Date;
  activityType: 'running' | 'cycling' | 'walking';
}

export interface RouteStats {
  totalDistance: number;      // meters
  totalElevationGain: number; // meters
  totalElevationLoss: number; // meters
  estimatedDuration: number;  // seconds
}

export type DrawMode = 'free' | 'heart' | 'circle' | 'cat' | 'dog';
