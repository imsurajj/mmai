import * as Location from "expo-location";
import { useEffect, useState } from "react";

export type LiveCoords = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
};

export function useLiveLocation() {
  const [coords, setCoords] = useState<LiveCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const current = await Location.getForegroundPermissionsAsync();
        let status = current.status;
        if (status !== "granted") {
          const req = await Location.requestForegroundPermissionsAsync();
          status = req.status;
        }
        if (status !== "granted") {
          if (!cancelled) {
            setPermissionDenied(true);
            setError("Location permission is required to show the live map.");
            setLoading(false);
          }
          return;
        }

        await Location.enableNetworkProviderAsync().catch(() => {});

        const last = await Location.getLastKnownPositionAsync();
        if (last && !cancelled) {
          setCoords({
            latitude: last.coords.latitude,
            longitude: last.coords.longitude,
            accuracy: last.coords.accuracy,
            heading: last.coords.heading,
            speed: last.coords.speed,
            timestamp: last.timestamp,
          });
          setLoading(false);
        }

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 3,
            mayShowUserSettingsDialog: true,
          },
          (loc) => {
            if (cancelled) return;
            setCoords({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
              heading: loc.coords.heading,
              speed: loc.coords.speed,
              timestamp: loc.timestamp,
            });
            setError(null);
            setLoading(false);
          },
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to read GPS");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return { coords, error, permissionDenied, loading };
}
