// Note: avoid importing '@/lib/supabase' at module top-level to keep tests simple
// saveSafeZone will dynamically import the supabase client when needed.

export type LatLng = { latitude: number; longitude: number };

export type SafeZone = {
  id: string;
  patient_id: string;
  center: LatLng;
  radius_m: number; // radius in meters
  created_at?: string;
  name?: string;
  created_by?: string;
};

export function computeCentroidSafeZone(
  points: LatLng[],
  paddingMeters = 50,
): SafeZone | null {
  if (!points || points.length === 0) return null;
  const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.longitude, 0) / points.length;
  const center = { latitude: lat, longitude: lng };

  // Compute max distance from center
  let maxDist = 0;
  for (const p of points) {
    const d = haversineDistanceMeters(center, p);
    if (d > maxDist) maxDist = d;
  }

  const radius = Math.max(50, Math.ceil(maxDist) + paddingMeters);
  return {
    id: "local-" + Math.random().toString(36).slice(2, 9),
    patient_id: "",
    center,
    radius_m: radius,
    name: "Auto safezone",
  } as SafeZone;
}

export function isPointInZone(point: LatLng, zone: SafeZone) {
  const d = haversineDistanceMeters(point, zone.center);
  return d <= zone.radius_m;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineDistanceMeters(a: LatLng, b: LatLng) {
  const R = 6371000; // meters
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDlat = Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2);
  const aa =
    sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

export async function saveSafeZone(zone: SafeZone) {
  const { supabase } = await import("./supabase");
  const { data, error } = await supabase
    .from("safe_zones")
    .insert([zone])
    .select()
    .single();
  if (error) throw error;
  return data as SafeZone;
}

export async function getSafeZonesForPatient(patientId: string) {
  const { supabase } = await import("./supabase");
  const { data, error } = await supabase
    .from("safe_zones")
    .select("*")
    .eq("patient_id", patientId);
  if (error) throw error;
  return data as SafeZone[];
}

export async function deleteSafeZone(zoneId: string) {
  const { supabase } = await import("./supabase");
  const { error } = await supabase.from("safe_zones").delete().eq("id", zoneId);
  if (error) throw error;
  return true;
}

export async function updateSafeZone(zoneId: string, patch: Partial<SafeZone>) {
  const { supabase } = await import("./supabase");
  const { data, error } = await supabase
    .from("safe_zones")
    .update(patch)
    .eq("id", zoneId)
    .select()
    .single();
  if (error) throw error;
  return data as SafeZone;
}

// Simple clustering: group points within `clusterRadiusMeters` of any cluster member.
export function computeClusteredSafeZones(
  points: LatLng[],
  clusterRadiusMeters = 100,
  paddingMeters = 50,
) {
  const clusters: LatLng[][] = [];
  for (const p of points) {
    let placed = false;
    for (const c of clusters) {
      for (const member of c) {
        if (haversineDistanceMeters(p, member) <= clusterRadiusMeters) {
          c.push(p);
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (!placed) clusters.push([p]);
  }

  const zones: SafeZone[] = clusters.map((c) => {
    const zone = computeCentroidSafeZone(c, paddingMeters)!;
    zone.name = `Cluster (${c.length})`;
    return zone;
  });

  return zones;
}
