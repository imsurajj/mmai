import { Check, Info } from "lucide-react-native";
import React, {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

export type ChipType = "check" | "info" | "none";

interface ChipData {
  id: number;
  message: string;
  type: ChipType;
}

interface ChipContextType {
  showChip: (message: string, type?: ChipType) => void;
}

const ChipContext = createContext<ChipContextType>({
  showChip: () => {},
});

export function ChipProvider({ children }: { children: React.ReactNode }) {
  const [chip, setChip] = useState<ChipData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showChip = useCallback((message: string, type: ChipType = "check") => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const id = Date.now();
    setChip({ id, message, type });
    timerRef.current = setTimeout(() => {
      setChip(null);
    }, 2000);
  }, []);

  return (
    <ChipContext.Provider value={{ showChip }}>
      {children}
      {chip && (
        <Animated.View
          key={chip.id}
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(160)}
          style={styles.chipContainer}
          pointerEvents="none"
        >
          <View style={styles.chipPill}>
            {chip.type === "check" && (
              <View style={styles.iconCircle}>
                <Check size={11} color="#FFFFFF" strokeWidth={3} />
              </View>
            )}
            {chip.type === "info" && (
              <View style={[styles.iconCircle, { backgroundColor: "#748B75" }]}>
                <Info size={11} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            )}
            <Text style={styles.chipText} numberOfLines={2}>
              {chip.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </ChipContext.Provider>
  );
}

export function useChip() {
  return useContext(ChipContext);
}

const styles = StyleSheet.create({
  chipContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 96 : 72,
    left: 20,
    right: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
    elevation: 10,
  },
  chipPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E2520",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    gap: 8,
    maxWidth: "90%",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
  },
  iconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#748B75",
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "600",
    letterSpacing: -0.1,
    textAlign: "center",
  },
});
