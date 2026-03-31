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
  cadence?: number; // rpm
  power?: number; // watts
}

export interface RouteStats {
  totalDistance: number; // meters
  totalElevationGain: number;
  totalElevationLoss: number;
  estimatedDuration: number; // seconds
  // Run-specific
  averagePace: number; // min/km
  paceInconsistency: number; // percentage
  // Bike-specific
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  averagePower: number; // watts
  normalizedPower: number; // watts
  averageCadence: number; // rpm
  calories: number;
}

export type DrawMode = 'draw' | 'heart' | 'circle';
export type ActivityType = 'run' | 'bike';

export interface RunDetails {
  name: string;
  date: string;
  startTime: string;
  description: string;
  activityType: ActivityType;
  // Shared
  paceMinPerKm: number;
  paceInconsistency: number;
  includeHeartRate: boolean;
  // Bike-specific
  avgSpeedKmh: number;
  ftp: number; // functional threshold power (watts)
  includePower: boolean;
  includeCadence: boolean;
  avgCadence: number; // target cadence rpm
  bikeType: 'road' | 'gravel' | 'mtb' | 'tt';
  drafting: boolean;
  weight: number; // rider + bike weight in kg
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
