export interface Waypoint {
  lng: number;
  lat: number;
  elevation?: number;
}

export interface RoutePoint {
  lng: number;
  lat: number;
  elevation: number;
  distance: number; // cumulative distance in meters
  timestamp?: string; // ISO 8601
  heartRate?: number;
}

export interface RouteStats {
  totalDistance: number; // meters
  totalElevationGain: number;
  totalElevationLoss: number;
  estimatedDuration: number; // seconds
  averagePace: number; // min/km
  paceInconsistency: number; // percentage
}

export type DrawMode = 'draw' | 'heart' | 'circle';
export type ActivityType = 'run' | 'bike';

export interface RunDetails {
  name: string;
  date: string;
  startTime: string;
  description: string;
  activityType: ActivityType;
  paceMinPerKm: number;
  paceInconsistency: number;
  includeHeartRate: boolean;
}

export interface TokenData {
  t: number;
  h: PurchaseEntry[];
  s: string;
  ts: number;
  v: number;
  c?: string;
}

export interface PurchaseEntry {
  date: string;
  tokens: number;
  amount: number;
}
