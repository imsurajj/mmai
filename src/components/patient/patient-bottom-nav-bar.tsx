import {
    Bell,
    Calendar,
    FileText,
    LayoutDashboard,
    Settings,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PatientTab } from "./patient-types";

type PatientBottomNavBarProps = {
  activeTab: PatientTab;
  onSelectTab: (tab: PatientTab) => void;
  insetsBottom: number;
};

export function PatientBottomNavBar({
  activeTab,
  onSelectTab,
  insetsBottom,
}: PatientBottomNavBarProps) {
  return (
    <View
      style={[
        styles.bottomNavBar,
        {
          backgroundColor: "#748B75",
          paddingTop: 12,
          paddingBottom: Math.max(insetsBottom, 16),
        },
      ]}
    >
      {/* 1: Home */}
      <Pressable onPress={() => onSelectTab("home")} style={styles.navTabBtn}>
        <View
          style={[
            styles.navTabIconWrap,
            activeTab === "home" && styles.navTabActiveCircle,
          ]}
        >
          <LayoutDashboard
            size={20}
            strokeWidth={activeTab === "home" ? 2.8 : 1.9}
            color={activeTab === "home" ? "#FFFFFF" : "rgba(255,255,255,0.7)"}
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.navTabLabel,
            {
              color:
                activeTab === "home" ? "#FFFFFF" : "rgba(255,255,255,0.75)",
              fontWeight: activeTab === "home" ? "700" : "500",
            },
          ]}
        >
          Today
        </Text>
      </Pressable>

      {/* 2: Memories */}
      <Pressable
        onPress={() => onSelectTab("timeline")}
        style={styles.navTabBtn}
      >
        <View
          style={[
            styles.navTabIconWrap,
            activeTab === "timeline" && styles.navTabActiveCircle,
          ]}
        >
          <Calendar
            size={20}
            strokeWidth={activeTab === "timeline" ? 2.8 : 1.9}
            color={
              activeTab === "timeline" ? "#FFFFFF" : "rgba(255,255,255,0.7)"
            }
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.navTabLabel,
            {
              color:
                activeTab === "timeline" ? "#FFFFFF" : "rgba(255,255,255,0.75)",
              fontWeight: activeTab === "timeline" ? "700" : "500",
            },
          ]}
        >
          Memories
        </Text>
      </Pressable>

      {/* 3: Routines */}
      <Pressable
        onPress={() => onSelectTab("reminders")}
        style={styles.navTabBtn}
      >
        <View
          style={[
            styles.navTabIconWrap,
            activeTab === "reminders" && styles.navTabActiveCircle,
          ]}
        >
          <Bell
            size={20}
            strokeWidth={activeTab === "reminders" ? 2.8 : 1.9}
            color={
              activeTab === "reminders" ? "#FFFFFF" : "rgba(255,255,255,0.7)"
            }
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.navTabLabel,
            {
              color:
                activeTab === "reminders"
                  ? "#FFFFFF"
                  : "rgba(255,255,255,0.75)",
              fontWeight: activeTab === "reminders" ? "700" : "500",
            },
          ]}
        >
          Routines
        </Text>
      </Pressable>

      {/* 4: Settings */}
      {/* 4: Files */}
      <Pressable onPress={() => onSelectTab("files")} style={styles.navTabBtn}>
        <View
          style={[
            styles.navTabIconWrap,
            activeTab === "files" && styles.navTabActiveCircle,
          ]}
        >
          <FileText
            size={20}
            strokeWidth={activeTab === "files" ? 2.8 : 1.9}
            color={activeTab === "files" ? "#FFFFFF" : "rgba(255,255,255,0.7)"}
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.navTabLabel,
            {
              color:
                activeTab === "files" ? "#FFFFFF" : "rgba(255,255,255,0.75)",
              fontWeight: activeTab === "files" ? "700" : "500",
            },
          ]}
        >
          Files
        </Text>
      </Pressable>

      {/* 5: Settings */}
      <Pressable
        onPress={() => onSelectTab("settings")}
        style={styles.navTabBtn}
      >
        <View
          style={[
            styles.navTabIconWrap,
            activeTab === "settings" && styles.navTabActiveCircle,
          ]}
        >
          <Settings
            size={20}
            strokeWidth={activeTab === "settings" ? 2.8 : 1.9}
            color={
              activeTab === "settings" ? "#FFFFFF" : "rgba(255,255,255,0.7)"
            }
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.navTabLabel,
            {
              color:
                activeTab === "settings" ? "#FFFFFF" : "rgba(255,255,255,0.75)",
              fontWeight: activeTab === "settings" ? "700" : "500",
            },
          ]}
        >
          Settings
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  navTabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  navTabIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  navTabActiveCircle: {
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    borderRadius: 19,
  },
  navTabLabel: {
    fontSize: 11,
    textAlign: "center",
  },
});
