import { useColor } from "@/hooks/useColor";
import { useLiveLocation } from "@/hooks/use-live-location";
import { MapPin } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  patientId?: string | null;
};

export function PatientLiveMap({ patientId: _patientId }: Props) {
  const text = useColor("text");
  const muted = useColor("textMuted");
  const primary = useColor("primary");
  const border = useColor("border");
  const card = useColor("card");
  const { coords, error, loading } = useLiveLocation();

  return (
    <View style={[styles.wrap, { borderColor: border, backgroundColor: card }]}>
      <View style={styles.titleRow}>
        <MapPin size={16} color={primary} />
        <Text style={[styles.title, { color: text }]}>Live location</Text>
      </View>
      {loading && !coords ? (
        <Text style={[styles.meta, { color: muted }]}>Finding your position…</Text>
      ) : coords ? (
        <Text style={[styles.meta, { color: muted }]}>
          {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
          {coords.accuracy != null
            ? `  ·  ±${Math.round(coords.accuracy)}m`
            : ""}
        </Text>
      ) : (
        <Text style={[styles.meta, { color: muted }]}>
          {error || "Allow location to see your position."}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
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
  meta: {
    fontSize: 13,
  },
});
