/**
 * Distance Calculation & Radius Tracking Utility
 * Uses the Haversine formula to compute great-circle distances between pairs of coordinates.
 */

export const EARTH_RADIUS_KM = 6371;

/**
 * Calculates the great-circle distance between two geographic coordinates in Kilometers (KM).
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
  }

  // If coordinates are virtually identical
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100; // 2 decimal precision
}

/**
 * Formats distance into clean user-friendly representations:
 * - 500 m, 650 m (for < 1 KM)
 * - 1.2 KM, 2.4 KM, 5.8 KM (for >= 1 KM)
 */
export function formatDistanceDisplay(distanceKm: number): string {
  if (distanceKm === undefined || isNaN(distanceKm) || distanceKm <= 0) {
    return '0 m';
  }

  const distanceMeters = Math.round(distanceKm * 1000);
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }

  const roundedKm = (Math.round(distanceKm * 10) / 10).toFixed(1);
  // Clean trailing .0 if exact integer, or keep standard 1 decimal
  return `${roundedKm} KM`;
}

export interface RadiusCheckResult {
  allowed: boolean;
  distanceKm: number;
  distanceMeters: number;
  distanceDisplay: string;
  radiusKm: number;
  message?: string;
}

/**
 * Validates whether a customer delivery location is within the active restaurant delivery radius.
 */
export function checkDeliveryRadius(
  restaurantLat: number,
  restaurantLng: number,
  customerLat: number,
  customerLng: number,
  radiusKm: number
): RadiusCheckResult {
  const distanceKm = calculateHaversineDistanceKm(restaurantLat, restaurantLng, customerLat, customerLng);
  const distanceMeters = Math.round(distanceKm * 1000);
  const distanceDisplay = formatDistanceDisplay(distanceKm);

  const allowed = distanceKm <= radiusKm;

  return {
    allowed,
    distanceKm,
    distanceMeters,
    distanceDisplay,
    radiusKm,
    message: allowed ? undefined : 'Sorry, this delivery address is outside our delivery area.',
  };
}
