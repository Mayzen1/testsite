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
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  averagePower: number; // watts
  normalizedPower: number; // watts
  averageCadence: number; // rpm
  calories: number;
}

export type DrawMode = 'draw' | 'heart' | 'circle' | 'loop';

export interface RideDetails {
  name: string;
  date: string;
  startTime: string;
  description: string;
  avgSpeedKmh: number;
  speedVariability: number; // 0-50 percentage
  includeHeartRate: boolean;
  ftp: number;
  includePower: boolean;
  includeCadence: boolean;
  avgCadence: number;
  bikeType: 'road' | 'gravel' | 'mtb' | 'tt';
  drafting: boolean;
  weight: number; // rider + bike kg
  loopDistanceKm: number;
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
