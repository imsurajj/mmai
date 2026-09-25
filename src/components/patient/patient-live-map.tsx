import { useColor } from "@/hooks/useColor";
import { useLiveLocation } from "@/hooks/use-live-location";
import { isExpoGoRuntime } from "@/lib/location-runtime";
import {
  SafeZone,
  getSafeZonesForPatient,
  isPointInZone,
} from "@/lib/safezone-service";
import { MapPin } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, Region, UrlTile } from "react-native-maps";

type Props = {
  patientId?: string | null;
};

const DEFAULT_DELTA = 0.008;

export function PatientLiveMap({ patientId }: Props) {
  const text = useColor("text");
  const muted = useColor("textMuted");
  const primary = useColor("primary");
  const border = useColor("border");
  const card = useColor("card");
  const { coords, error, permissionDenied, loading } = useLiveLocation();
  const [zone, setZone] = useState<SafeZone | null>(null);

  useEffect(() => {
    if (!patientId) return;
    getSafeZonesForPatient(patientId)
      .then((zones) => {
        if (zones?.length) setZone(zones[0]);
      })
      .catch(() => {});
  }, [patientId]);

  const region: Region | undefined = useMemo(() => {
    if (!coords) return undefined;
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    };
  }, [coords?.latitude, coords?.longitude]);

  const insideZone =
    coords && zone ? isPointInZone(coords, zone) : null;

  // Android Studio builds need OSM tiles unless a Google Maps key is set.
  // Expo Go already ships Google Maps keys.
  const useOsmTiles = Platform.OS === "android" && !isExpoGoRuntime();

  return (
    <View style={[styles.wrap, { borderColor: border, backgroundColor: card }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MapPin size={16} color={primary} />
          <Text style={[styles.title, { color: text }]}>Live location</Text>
        </View>
        <View
          style={[
            styles.livePill,
            {
              backgroundColor: coords ? `${primary}22` : "transparent",
              borderColor: primary,
            },
          ]}
        >
          <View
            style={[
              styles.liveDot,
              { backgroundColor: coords ? primary : muted },
            ]}
          />
          <Text style={[styles.livePillText, { color: primary }]}>
            {coords ? "LIVE" : "GPS"}
          </Text>
        </View>
      </View>

      <View style={styles.mapFrame}>
        {loading && !coords ? (
          <View style={styles.fallback}>
            <ActivityIndicator color={primary} />
            <Text style={[styles.fallbackText, { color: muted }]}>
              Finding your position…
            </Text>
          </View>
        ) : region && coords ? (
          <MapView
            style={StyleSheet.absoluteFill}
            region={region}
            mapType={useOsmTiles ? "none" : "standard"}
            showsUserLocation={!useOsmTiles}
            showsMyLocationButton
            followsUserLocation
            pitchEnabled={false}
            rotateEnabled={false}
            toolbarEnabled={false}
          >
            {useOsmTiles ? (
              <UrlTile
                urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maximumZ={19}
                tileSize={256}
              />
            ) : null}
            <Marker
              coordinate={{
                latitude: coords.latitude,
                longitude: coords.longitude,
              }}
              title="You are here"
              description={
                coords.accuracy != null
                  ? `Accuracy ±${Math.round(coords.accuracy)}m`
                  : undefined
              }
            />
            {zone ? (
              <Circle
                center={zone.center}
                radius={zone.radius_m}
                strokeColor={primary}
                fillColor={`${primary}33`}
                strokeWidth={2}
              />
            ) : null}
          </MapView>
        ) : (
          <View style={styles.fallback}>
            <Text style={[styles.fallbackText, { color: muted }]}>
              {permissionDenied || error
                ? error || "Allow location to see the map."
                : "Waiting for GPS…"}
            </Text>
          </View>
        )}
      </View>

      {coords ? (
        <Text style={[styles.meta, { color: muted }]}>
          {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
          {coords.accuracy != null
            ? `  ·  ±${Math.round(coords.accuracy)}m`
            : ""}
          {insideZone === true ? "  ·  Inside safe zone" : ""}
          {insideZone === false ? "  ·  Outside safe zone" : ""}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  livePillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  mapFrame: {
    height: 240,
    borderRadius: 10,
    overflow: "hidden",
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  fallbackText: {
    fontSize: 13,
    textAlign: "center",
  },
  meta: {
    fontSize: 12,
  },
});
