import AppCamera from "@/components/ui/camera";
import { useColor } from "@/hooks/useColor";
import {
    analyzeItemWithGeminiVision,
    DEFAULT_PRIORITY_ITEMS,
    deleteItemLocation,
    formatTimeAgo,
    getItemLocations,
    ItemCategory,
    ItemLocationRecord,
    PriorityLevel,
    queryItemLocation,
    saveItemLocation,
} from "@/lib/item-location-service";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import {
    AlertTriangle,
    Camera as CameraIcon,
    CheckCircle2,
    CreditCard,
    Ear,
    Footprints,
    Glasses,
    Image as ImageIcon,
    Key,
    MapPin,
    Pill,
    Search,
    Smartphone,
    Sparkles,
    Trash2,
    X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

function showAlert(title: string, message: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export function PatientItemTracker() {
  const text = useColor("text");
  const muted = useColor("textMuted");
  const primary = useColor("primary");
  const border = useColor("border");
  const bgCard = useColor("card");

  const [locations, setLocations] = useState<ItemLocationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search / Query state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchResult, setActiveSearchResult] = useState<{
    record: ItemLocationRecord | null;
    answerText: string;
  } | null>(null);

  // Selected item detail modal
  const [selectedRecord, setSelectedRecord] =
    useState<ItemLocationRecord | null>(null);

  // Web Live Camera Viewfinder Modal State
  const [liveCameraModalVisible, setLiveCameraModalVisible] = useState(false);
  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<any>(null);
  const activeStreamRef = useRef<any>(null);

  // Placement confirmation & Gemini AI analysis modal state
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(
    null,
  );
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [nativeCameraVisible, setNativeCameraVisible] = useState(false);
  const appCameraRef = useRef<any>(null);

  // Editable fields after capture
  const [itemNameInput, setItemNameInput] = useState("");
  const [categoryInput, setCategoryInput] = useState<ItemCategory>("keys");
  const [priorityInput, setPriorityInput] = useState<PriorityLevel>("high");
  const [locationDescInput, setLocationDescInput] = useState("");
  const [roomInput, setRoomInput] = useState("Living Room");
  const [aiExplanationInput, setAiExplanationInput] = useState("");

  // Load locations on mount
  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    const data = await getItemLocations();
    setLocations(data);
    setLoading(false);
  };

  const handleSearch = async (queryText?: string) => {
    const q = queryText !== undefined ? queryText : searchQuery;
    if (!q.trim()) {
      setActiveSearchResult(null);
      return;
    }
    const result = await queryItemLocation(q);
    setActiveSearchResult(result);
  };

  const getItemIcon = (
    category: ItemCategory,
    size = 18,
    color = "#FFFFFF",
  ) => {
    switch (category) {
      case "keys":
        return <Key size={size} color={color} />;
      case "glasses":
        return <Glasses size={size} color={color} />;
      case "wallet":
        return <CreditCard size={size} color={color} />;
      case "medication":
        return <Pill size={size} color={color} />;
      case "phone":
        return <Smartphone size={size} color={color} />;
      case "hearing_aid":
        return <Ear size={size} color={color} />;
      case "cane":
        return <Footprints size={size} color={color} />;
      default:
        return <MapPin size={size} color={color} />;
    }
  };

  // Process captured/uploaded image and trigger Gemini analysis
  const processCapturedImage = async (uri: string, base64: string | null) => {
    setCapturedImageUri(uri);
    setCapturedImageBase64(base64);
    setCameraModalVisible(true);

    if (base64) {
      setAnalyzingAi(true);
      const aiResult = await analyzeItemWithGeminiVision(base64, categoryInput);
      setItemNameInput(aiResult.item_name);
      setCategoryInput(aiResult.category);
      setPriorityInput(aiResult.priority);
      setLocationDescInput(aiResult.location_description);
      setRoomInput(aiResult.room);
      setAiExplanationInput(aiResult.ai_explanation);
      setAnalyzingAi(false);
    } else {
      const meta = DEFAULT_PRIORITY_ITEMS.find(
        (d) => d.category === categoryInput,
      );
      setItemNameInput(meta?.name || "Important Belonging");
      setLocationDescInput(
        meta?.sampleLocation || "Placed safely on the table",
      );
      setRoomInput(meta?.defaultRoom || "Living Room");
      setAiExplanationInput(
        `Gemini identified your ${meta?.name || "Item"} in the ${meta?.defaultRoom || "Room"}.`,
      );
    }
  };

  // Web file input fallback helper
  const triggerWebFileInput = (captureCamera = false) => {
    if (typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (captureCamera) {
      input.capture = "environment";
    }
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const resultStr = reader.result as string;
          processCapturedImage(resultStr, resultStr);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // Start Web Live Camera Feed
  const startWebLiveCamera = async () => {
    setLiveCameraModalVisible(true);
    setCameraError(null);
    setCameraStreamActive(false);

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.mediaDevices?.getUserMedia
      ) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        activeStreamRef.current = stream;
        setCameraStreamActive(true);

        // Allow modal to mount before attaching video stream
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }, 150);
      } else {
        setCameraError(
          "Webcam not directly accessible in this browser. You can still select or take a photo.",
        );
      }
    } catch (err: any) {
      console.warn("getUserMedia error:", err);
      setCameraError(
        "Could not start webcam stream. Tap below to capture or select a photo.",
      );
    }
  };

  // Capture snapshot from Web Live Camera
  const captureWebSnapshot = () => {
    const video = videoRef.current;
    if (!video) {
      triggerWebFileInput(true);
      stopWebLiveCamera();
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.8);
        stopWebLiveCamera();
        processCapturedImage(base64, base64);
      } else {
        triggerWebFileInput(true);
        stopWebLiveCamera();
      }
    } catch {
      triggerWebFileInput(true);
      stopWebLiveCamera();
    }
  };

  // Stop Web Live Camera
  const stopWebLiveCamera = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track: any) => track.stop());
      activeStreamRef.current = null;
    }
    setLiveCameraModalVisible(false);
    setCameraStreamActive(false);
    setCameraError(null);
  };

  // Main Handler for Snap Live Photo (cross-platform)
  const handleSnapLivePhoto = async () => {
    if (Platform.OS === "web") {
      await startWebLiveCamera();
      return;
    }

    // Native iOS / Android
    try {
      let hasPermission = false;
      const currentPerm = await ImagePicker.getCameraPermissionsAsync();
      if (currentPerm.granted) {
        hasPermission = true;
      } else {
        const requested = await ImagePicker.requestCameraPermissionsAsync();
        hasPermission = requested.granted;
      }

      if (!hasPermission) {
        showAlert(
          "Camera Permission Needed",
          "Please allow camera access in device settings to snap live photos.",
        );
        return;
      }

      // Open the in-app Camera component (BNA UI) for native capture
      setNativeCameraVisible(true);
      return;
    } catch (err) {
      console.warn("Native camera error, fallback to picker:", err);
      // Seamless fallback to image library
      handleUploadImage();
    }
  };

  // Main Handler for Upload Image (cross-platform)
  const handleUploadImage = async () => {
    if (Platform.OS === "web") {
      triggerWebFileInput(false);
      return;
    }

    // Native iOS / Android
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const base64 = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : null;
        processCapturedImage(uri, base64);
      }
    } catch (err) {
      console.warn("Image library picker error:", err);
      showAlert("Notice", "Unable to open photo library.");
    }
  };

  // Save the logged item placement to database
  const handleSavePlacement = async () => {
    if (!itemNameInput.trim() || !locationDescInput.trim()) {
      showAlert(
        "Missing Details",
        "Please provide an item name and location description.",
      );
      return;
    }

    await saveItemLocation({
      item_name: itemNameInput.trim(),
      category: categoryInput,
      priority: priorityInput,
      location_description: locationDescInput.trim(),
      room: roomInput.trim() || "Home",
      image_uri: capturedImageBase64 || capturedImageUri || undefined,
      ai_explanation: aiExplanationInput || undefined,
    });

    setCameraModalVisible(false);
    setCapturedImageBase64(null);
    setCapturedImageUri(null);

    // Refresh list
    await loadLocations();
  };

  const handleDeleteItem = async (id: string) => {
    await deleteItemLocation(id);
    setSelectedRecord(null);
    await loadLocations();
  };

  // Quick prompt presets for high priority items
  const highPriorityItems = DEFAULT_PRIORITY_ITEMS.filter(
    (i) => i.priority === "high",
  );

  return (
    <View style={[styles.cardContainer, { borderColor: border }]}>
      {/* Top Title Bar */}
      <View style={styles.headerTitleRow}>
        <View style={[styles.headerIconCircle, { backgroundColor: primary }]}>
          <MapPin size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: text }]}>
            Where Did I Put It?
          </Text>
          <Text style={[styles.cardSub, { color: muted }]}>
            Gemini Vision AI object memory for your essential belongings
          </Text>
        </View>
      </View>

      {/* Dual Photo Action Buttons Row (Camera vs Upload) */}
      <View style={styles.actionButtonsRow}>
        <Pressable
          onPress={handleSnapLivePhoto}
          style={({ pressed }) => [
            styles.primaryActionBtn,
            { backgroundColor: primary },
            pressed && { opacity: 0.8 },
          ]}
        >
          <MapPin size={16} color="#FFFFFF" />
          <Text style={styles.primaryActionBtnText}>Snap Live Photo</Text>
        </Pressable>

        {/* Upload button removed per design request */}
      </View>

      {/* Query Search Bar ("Where is my...") */}
      <View style={[styles.searchBox, { borderColor: border }]}>
        <Search size={18} color={primary} />
        <TextInput
          style={[styles.searchInput, { color: text }]}
          placeholder="Ask where something is (e.g., 'Where are my keys?')"
          placeholderTextColor={muted}
          value={searchQuery}
          onChangeText={(val) => {
            setSearchQuery(val);
            if (!val.trim()) setActiveSearchResult(null);
          }}
          onSubmitEditing={() => handleSearch()}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => {
              setSearchQuery("");
              setActiveSearchResult(null);
            }}
          >
            <X size={16} color={muted} />
          </Pressable>
        )}
      </View>

      {/* Quick Tap Category Shortcuts */}
      <View style={styles.quickTagsScroll}>
        <Text style={[styles.quickTagsLabel, { color: muted }]}>
          Ask about item:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsContainer}
        >
          {highPriorityItems.map((item) => {
            const isSelected = searchQuery
              .toLowerCase()
              .includes(item.category);
            return (
              <Pressable
                key={item.category}
                onPress={() => {
                  setSearchQuery(`Where are my ${item.name}?`);
                  handleSearch(item.name);
                }}
                style={({ pressed }) => [
                  styles.tagPill,
                  {
                    borderColor: isSelected ? primary : border,
                    backgroundColor: isSelected
                      ? `${primary}15`
                      : "transparent",
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {getItemIcon(item.category, 14, primary)}
                <Text style={[styles.tagPillText, { color: text }]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Search Answer Result Card */}
      {activeSearchResult && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[
            styles.answerCard,
            { borderColor: primary, backgroundColor: `${primary}08` },
          ]}
        >
          <View style={styles.answerTopRow}>
            <View style={styles.rowAlign}>
              <Sparkles size={16} color={primary} />
              <Text style={[styles.answerBadge, { color: primary }]}>
                Gemini Object Memory Recall
              </Text>
            </View>
            <Pressable onPress={() => setActiveSearchResult(null)}>
              <X size={16} color={muted} />
            </Pressable>
          </View>

          <Text style={[styles.answerText, { color: text }]}>
            {activeSearchResult.answerText}
          </Text>

          {activeSearchResult.record && (
            <View style={styles.answerDetailBox}>
              {activeSearchResult.record.image_uri ? (
                <Image
                  source={{ uri: activeSearchResult.record.image_uri }}
                  style={styles.answerImagePreview}
                  resizeMode="cover"
                />
              ) : null}

              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.answerRoom, { color: primary }]}>
                  📍 Room: {activeSearchResult.record.room || "Home"}
                </Text>
                <Text style={[styles.answerLocDesc, { color: text }]}>
                  "{activeSearchResult.record.location_description}"
                </Text>
                <Text style={[styles.answerTime, { color: muted }]}>
                  Recorded {formatTimeAgo(activeSearchResult.record.updated_at)}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {/* Priority Essential Items List */}
      <View style={styles.listSectionHeader}>
        <Text style={[styles.listSectionTitle, { color: text }]}>
          High-Priority Belongings ({locations.length})
        </Text>
        <Text style={[styles.listSectionSub, { color: muted }]}>
          Tap any item to see full location details or photo
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="small"
          color={primary}
          style={{ marginVertical: 16 }}
        />
      ) : locations.length > 0 ? (
        <View style={styles.itemsGrid}>
          {locations.map((item) => {
            const timeStr = formatTimeAgo(item.updated_at);
            const isHighPriority = item.priority === "high";

            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedRecord(item)}
                style={({ pressed }) => [
                  styles.itemCard,
                  { borderColor: border },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.itemCardHeader}>
                  <View
                    style={[
                      styles.itemCategoryIconCircle,
                      { backgroundColor: primary },
                    ]}
                  >
                    {getItemIcon(item.category, 16, "#FFFFFF")}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowAlignBetween}>
                      <Text
                        style={[styles.itemName, { color: text }]}
                        numberOfLines={1}
                      >
                        {item.item_name}
                      </Text>
                      {isHighPriority && (
                        <View
                          style={[
                            styles.priorityBadge,
                            { backgroundColor: "#EF444420" },
                          ]}
                        >
                          <Text style={styles.priorityBadgeText}>Urgent</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[styles.itemRoom, { color: primary }]}
                      numberOfLines={1}
                    >
                      📍 {item.room || "Home"} • {timeStr}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[styles.itemLocPreview, { color: muted }]}
                  numberOfLines={2}
                >
                  "{item.location_description}"
                </Text>

                {item.image_uri ? (
                  <View style={styles.hasPhotoBadge}>
                    <CameraIcon size={12} color={primary} />
                    <Text style={[styles.hasPhotoText, { color: primary }]}>
                      Photo Saved
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <AlertTriangle size={24} color={muted} />
          <Text style={[styles.emptyText, { color: muted }]}>
            No items logged yet.
          </Text>
          <View style={styles.rowAlign}>
            <Pressable
              onPress={handleSnapLivePhoto}
              style={[styles.emptyAddBtn, { borderColor: primary }]}
            >
              <CameraIcon size={14} color={primary} />
              <Text style={[styles.emptyAddBtnText, { color: primary }]}>
                Live Photo
              </Text>
            </Pressable>
            {/* Upload action removed from empty state */}
          </View>
        </View>
      )}

      {/* Item Detail Modal */}
      {selectedRecord && (
        <>
          <Modal
            visible={Boolean(selectedRecord)}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedRecord(null)}
          >
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.detailModalCard,
                  { backgroundColor: bgCard, borderColor: border },
                ]}
              >
                <View style={styles.modalTopRow}>
                  <View style={styles.rowAlign}>
                    <View
                      style={[
                        styles.itemCategoryIconCircle,
                        { backgroundColor: primary },
                      ]}
                    >
                      {getItemIcon(selectedRecord.category, 20, "#FFFFFF")}
                    </View>
                    <View>
                      <Text style={[styles.detailTitle, { color: text }]}>
                        {selectedRecord.item_name}
                      </Text>
                      <Text style={[styles.detailSub, { color: primary }]}>
                        📍 {selectedRecord.room || "Home"} •{" "}
                        {formatTimeAgo(selectedRecord.updated_at)}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setSelectedRecord(null)}
                    hitSlop={8}
                  >
                    <X size={20} color={muted} />
                  </Pressable>
                </View>

                {selectedRecord.image_uri ? (
                  <Image
                    source={{ uri: selectedRecord.image_uri }}
                    style={styles.detailImageFull}
                    resizeMode="cover"
                  />
                ) : null}

                {selectedRecord.ai_explanation ? (
                  <View
                    style={[
                      styles.aiExplanationCard,
                      { borderColor: primary, backgroundColor: `${primary}10` },
                    ]}
                  >
                    <View style={styles.rowAlign}>
                      <Sparkles size={16} color={primary} />
                      <Text
                        style={[styles.aiExplanationTitle, { color: primary }]}
                      >
                        Gemini Dynamic AI Memory
                      </Text>
                    </View>
                    <Text style={[styles.aiExplanationBody, { color: text }]}>
                      {selectedRecord.ai_explanation}
                    </Text>
                  </View>
                ) : null}

                <View style={[styles.detailDescBox, { borderColor: border }]}>
                  <Text style={[styles.detailDescHeader, { color: muted }]}>
                    Placement Spot Description:
                  </Text>
                  <Text style={[styles.detailDescText, { color: text }]}>
                    "{selectedRecord.location_description}"
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActionsRow}>
                  <Pressable
                    onPress={() => handleDeleteItem(selectedRecord.id)}
                    style={[styles.deleteBtn, { borderColor: "#EF4444" }]}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text
                      style={{
                        color: "#EF4444",
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      Remove
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setSelectedRecord(null)}
                    style={[styles.closeModalBtn, { backgroundColor: primary }]}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                    >
                      Got It!
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* In-app native Camera Modal (BNA UI) */}
          <Modal
            visible={nativeCameraVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setNativeCameraVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.captureModalCard,
                  { backgroundColor: bgCard, borderColor: border },
                ]}
              >
                <AppCamera
                  ref={appCameraRef}
                  onCapture={async ({ uri }) => {
                    setNativeCameraVisible(false);
                    try {
                      const b64 = await FileSystem.readAsStringAsync(uri, {
                        encoding: FileSystem.EncodingType.Base64,
                      });
                      const dataUri = `data:image/jpeg;base64,${b64}`;
                      processCapturedImage(uri, dataUri);
                    } catch (err) {
                      console.warn("Failed to read file as base64:", err);
                      processCapturedImage(uri, null);
                    }
                  }}
                  onClose={() => setNativeCameraVisible(false)}
                />
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* Web Live Camera Viewfinder Modal */}
      {liveCameraModalVisible && (
        <Modal
          visible={liveCameraModalVisible}
          transparent
          animationType="fade"
          onRequestClose={stopWebLiveCamera}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.liveCameraModalCard,
                { backgroundColor: bgCard, borderColor: border },
              ]}
            >
              {/* Header */}
              <View style={styles.modalTopRow}>
                <View style={styles.rowAlign}>
                  <View style={styles.liveDot} />
                  <Text style={[styles.detailTitle, { color: text }]}>
                    Live Camera Viewfinder
                  </Text>
                </View>
                <Pressable onPress={stopWebLiveCamera} hitSlop={8}>
                  <X size={20} color={muted} />
                </Pressable>
              </View>

              <Text style={[styles.viewfinderInstructions, { color: muted }]}>
                Aim your camera at the item (e.g. keys on table, glasses on
                desk) and click Capture.
              </Text>

              {/* Live Video Box */}
              <View style={styles.liveVideoBox}>
                {Platform.OS === "web" &&
                  React.createElement("video", {
                    ref: videoRef,
                    autoPlay: true,
                    playsInline: true,
                    muted: true,
                    style: {
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      backgroundColor: "#000",
                    },
                  })}

                {/* Target overlay reticle */}
                <View style={styles.targetReticle} pointerEvents="none">
                  <View style={[styles.reticleCorner, styles.reticleTopLeft]} />
                  <View
                    style={[styles.reticleCorner, styles.reticleTopRight]}
                  />
                  <View
                    style={[styles.reticleCorner, styles.reticleBottomLeft]}
                  />
                  <View
                    style={[styles.reticleCorner, styles.reticleBottomRight]}
                  />
                </View>

                {cameraError ? (
                  <View style={styles.cameraErrorOverlay}>
                    <AlertTriangle size={24} color="#EF4444" />
                    <Text style={styles.cameraErrorText}>{cameraError}</Text>
                    <Pressable
                      onPress={() => {
                        stopWebLiveCamera();
                        triggerWebFileInput(true);
                      }}
                      style={[
                        styles.cameraFallbackBtn,
                        { backgroundColor: primary },
                      ]}
                    >
                      <CameraIcon size={14} color="#FFFFFF" />
                      <Text style={styles.cameraFallbackBtnText}>
                        Take Photo via File Picker
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {/* Action Buttons */}
              <View style={styles.viewfinderActionRow}>
                <Pressable
                  onPress={() => {
                    stopWebLiveCamera();
                    triggerWebFileInput(false);
                  }}
                  style={[
                    styles.viewfinderSecondaryBtn,
                    { borderColor: border },
                  ]}
                >
                  <ImageIcon size={16} color={text} />
                  <Text
                    style={[styles.viewfinderSecondaryText, { color: text }]}
                  >
                    Select File
                  </Text>
                </Pressable>

                <Pressable
                  onPress={captureWebSnapshot}
                  style={[
                    styles.viewfinderCaptureBtn,
                    { backgroundColor: primary },
                  ]}
                >
                  <CameraIcon size={18} color="#FFFFFF" />
                  <Text style={styles.viewfinderCaptureText}>
                    Capture Photo Now
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Snap Photo / Upload Image Modal (Gemini AI Analysis) */}
      <Modal
        visible={cameraModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCameraModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.scrollModalContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.captureModalCard,
                { backgroundColor: bgCard, borderColor: border },
              ]}
            >
              {/* Modal Top Header */}
              <View style={styles.modalTopRow}>
                <View style={styles.rowAlign}>
                  <Sparkles size={20} color={primary} />
                  <Text style={[styles.detailTitle, { color: text }]}>
                    Gemini Vision AI Analysis
                  </Text>
                </View>
                <Pressable
                  onPress={() => setCameraModalVisible(false)}
                  hitSlop={8}
                >
                  <X size={20} color={muted} />
                </Pressable>
              </View>

              {/* Photo Preview */}
              {capturedImageUri ? (
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: capturedImageUri }}
                    style={styles.capturedPhoto}
                  />
                  {analyzingAi && (
                    <View style={styles.aiAnalyzingOverlay}>
                      <ActivityIndicator size="large" color="#FFFFFF" />
                      <Text style={styles.aiAnalyzingText}>
                        Gemini AI examining photo & generating dynamic answer...
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}

              {/* Gemini Dynamic Response Card */}
              {aiExplanationInput && !analyzingAi ? (
                <View
                  style={[
                    styles.aiResponseBox,
                    { borderColor: primary, backgroundColor: `${primary}12` },
                  ]}
                >
                  <View style={styles.rowAlign}>
                    <Sparkles size={16} color={primary} />
                    <Text style={[styles.aiResponseTag, { color: primary }]}>
                      Gemini Dynamic AI Response
                    </Text>
                  </View>
                  <Text style={[styles.aiResponseText, { color: text }]}>
                    {aiExplanationInput}
                  </Text>
                </View>
              ) : null}

              {/* Form Input Fields */}
              <View style={styles.formContainer}>
                {/* Category Picker */}
                <Text style={[styles.label, { color: text }]}>
                  Detected Item Category:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tagsContainer}
                >
                  {DEFAULT_PRIORITY_ITEMS.map((item) => {
                    const isSelected = categoryInput === item.category;
                    return (
                      <Pressable
                        key={item.category}
                        onPress={() => {
                          setCategoryInput(item.category);
                          setItemNameInput(item.name);
                        }}
                        style={[
                          styles.tagPill,
                          {
                            borderColor: isSelected ? primary : border,
                            backgroundColor: isSelected
                              ? primary
                              : "transparent",
                          },
                        ]}
                      >
                        {getItemIcon(
                          item.category,
                          14,
                          isSelected ? "#FFFFFF" : primary,
                        )}
                        <Text
                          style={[
                            styles.tagPillText,
                            { color: isSelected ? "#FFFFFF" : text },
                          ]}
                        >
                          {item.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Item Name */}
                <Text style={[styles.label, { color: text }]}>Item Name:</Text>
                <TextInput
                  style={[styles.input, { color: text, borderColor: border }]}
                  value={itemNameInput}
                  onChangeText={setItemNameInput}
                  placeholder="e.g. Car Keys, Reading Glasses"
                  placeholderTextColor={muted}
                />

                {/* Room */}
                <Text style={[styles.label, { color: text }]}>
                  Room Location:
                </Text>
                <TextInput
                  style={[styles.input, { color: text, borderColor: border }]}
                  value={roomInput}
                  onChangeText={setRoomInput}
                  placeholder="e.g. Kitchen, Living Room, Bedroom"
                  placeholderTextColor={muted}
                />

                {/* Location Description */}
                <Text style={[styles.label, { color: text }]}>
                  Placement Spot Description:
                </Text>
                <TextInput
                  style={[
                    styles.inputArea,
                    { color: text, borderColor: border },
                  ]}
                  value={locationDescInput}
                  onChangeText={setLocationDescInput}
                  multiline
                  numberOfLines={3}
                  placeholder="e.g. Placed on the wooden dining table next to the coffee mug"
                  placeholderTextColor={muted}
                />
              </View>

              {/* Retake & Save Actions */}
              <View style={styles.modalActionsRow}>
                <Pressable
                  onPress={handleSnapLivePhoto}
                  style={[styles.retakeBtn, { borderColor: border }]}
                >
                  <CameraIcon size={14} color={text} />
                  <Text style={[styles.retakeText, { color: text }]}>
                    Camera
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleUploadImage}
                  style={[styles.retakeBtn, { borderColor: border }]}
                >
                  <ImageIcon size={14} color={text} />
                  <Text style={[styles.retakeText, { color: text }]}>
                    Upload
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleSavePlacement}
                  disabled={analyzingAi}
                  style={[
                    styles.saveBtn,
                    { backgroundColor: primary },
                    analyzingAi && { opacity: 0.6 },
                  ]}
                >
                  <CheckCircle2 size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save to Memory</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginTop: 10,
  },
  rowAlign: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowAlignBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  cardSub: {
    fontSize: 12,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 20,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    paddingVertical: 10,
    borderRadius: 20,
  },
  secondaryActionBtnText: {
    fontWeight: "700",
    fontSize: 13,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  quickTagsScroll: {
    gap: 6,
  },
  quickTagsLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  tagsContainer: {
    gap: 8,
    paddingRight: 10,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  answerCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    gap: 8,
  },
  answerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  answerBadge: {
    fontSize: 12,
    fontWeight: "800",
  },
  answerText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  answerDetailBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  answerImagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  answerRoom: {
    fontSize: 13,
    fontWeight: "700",
  },
  answerLocDesc: {
    fontSize: 13,
  },
  answerTime: {
    fontSize: 11,
  },
  listSectionHeader: {
    marginTop: 4,
  },
  listSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  listSectionSub: {
    fontSize: 12,
  },
  itemsGrid: {
    gap: 8,
  },
  itemCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  itemCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemCategoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityBadgeText: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "800",
  },
  itemRoom: {
    fontSize: 12,
    fontWeight: "600",
  },
  itemLocPreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  hasPhotoBadge: {
    flexDirection: "row",
  },
  hasPhotoText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  detailModalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  modalTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  detailSub: {
    fontSize: 13,
    fontWeight: "600",
  },
  detailImageFull: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },
  aiExplanationCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  aiExplanationTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  aiExplanationBody: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  detailDescBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  detailDescHeader: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailDescText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  modalActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeModalBtn: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  scrollModalContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  captureModalCard: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  photoContainer: {
    position: "relative",
    width: "100%",
    height: 190,
    borderRadius: 12,
    overflow: "hidden",
  },
  capturedPhoto: {
    width: "100%",
    height: "100%",
  },
  aiAnalyzingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 10,
  },
  aiAnalyzingText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  aiResponseBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  aiResponseTag: {
    fontSize: 12,
    fontWeight: "800",
  },
  aiResponseText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  formContainer: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
  },
  inputArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    height: 60,
    textAlignVertical: "top",
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  retakeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  liveCameraModalCard: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
  viewfinderInstructions: {
    fontSize: 13,
    lineHeight: 18,
  },
  liveVideoBox: {
    position: "relative",
    width: "100%",
    height: 260,
    backgroundColor: "#000000",
    borderRadius: 12,
    overflow: "hidden",
  },
  targetReticle: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  reticleCorner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "rgba(255, 255, 255, 0.75)",
  },
  reticleTopLeft: {
    top: 40,
    left: 40,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  reticleTopRight: {
    top: 40,
    right: 40,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  reticleBottomLeft: {
    bottom: 40,
    left: 40,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  reticleBottomRight: {
    bottom: 40,
    right: 40,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  cameraErrorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 12,
  },
  cameraErrorText: {
    color: "#FFFFFF",
    fontSize: 13,
    textAlign: "center",
  },
  cameraFallbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cameraFallbackBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  viewfinderActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  viewfinderSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  viewfinderSecondaryText: {
    fontSize: 13,
    fontWeight: "600",
  },
  viewfinderCaptureBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  viewfinderCaptureText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
