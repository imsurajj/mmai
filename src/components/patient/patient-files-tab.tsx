import { useColor } from "@/hooks/useColor";
import {
    PatientFile,
    deletePatientFile,
    getSignedUrl,
    listPatientFiles,
    uploadPatientFile,
} from "@/lib/patient-files-service";
import { CurrentSessionUser } from "@/lib/supabase";
import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";

type Props = { currentUser: CurrentSessionUser };

export default function PatientFilesTab({ currentUser }: Props) {
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [loading, setLoading] = useState(false);
  const primary = useColor("primary");

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    if (!currentUser?.patient_id) return;
    setLoading(true);
    try {
      const data = await listPatientFiles(currentUser.patient_id);
      setFiles(data || []);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Unable to load files");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });
    if (res.type !== "success") return;
    if (!currentUser?.patient_id) return Alert.alert("Not signed in");

    // Validate size (expo document picker may not return size on all platforms)
    if (res.size && res.size > 10 * 1024 * 1024) {
      return Alert.alert("File too large", "Please pick a file under 10 MB.");
    }

    // Validate mime types
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (res.mimeType && !allowed.includes(res.mimeType)) {
      return Alert.alert(
        "Unsupported type",
        "Please pick a PDF, image, DOCX, or TXT file.",
      );
    }

    try {
      setLoading(true);
      const row = await uploadPatientFile({
        patientId: currentUser.patient_id,
        filePath: res.uri,
        fileName: res.name,
        mimeType: res.mimeType || "application/octet-stream",
      });
      setFiles((s) => [row, ...s]);
      Alert.alert("Uploaded", res.name);
    } catch (err) {
      console.error(err);
      Alert.alert("Upload failed", String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(file: PatientFile) {
    Alert.alert("Delete", `Delete ${file.file_name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await deletePatientFile(file);
            setFiles((s) => s.filter((f) => f.id !== file.id));
          } catch (err) {
            console.error(err);
            Alert.alert("Delete failed", String(err));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  function renderItem({ item }: { item: PatientFile }) {
    return (
      <View style={{ padding: 12, borderBottomWidth: 1, borderColor: "#eee" }}>
        <Text style={{ fontWeight: "600" }}>{item.file_name}</Text>
        <Text style={{ color: "#666", marginTop: 6 }}>
          {formatBytes(item.file_size_bytes || 0)} •{" "}
          {item.file_extension.toUpperCase()}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          <Pressable
            onPress={async () => {
              try {
                setLoading(true);
                const url = await getSignedUrl(item.storage_path, 120);
                Linking.openURL(url);
              } catch (err) {
                console.error(err);
                Alert.alert("Open failed", String(err));
              } finally {
                setLoading(false);
              }
            }}
            style={{ marginRight: 12 }}
          >
            <Text style={{ color: primary }}>Open</Text>
          </Pressable>
          <Pressable onPress={() => handleDelete(item)}>
            <Text style={{ color: "red" }}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View>
          <Text style={{ fontSize: 20, fontWeight: "700" }}>My Files</Text>
          <Text style={{ color: "#666" }}>
            Private files uploaded to your health workspace
          </Text>
        </View>
        <Pressable onPress={handleUpload} style={{ padding: 8 }}>
          <Text style={{ color: primary }}>Upload file</Text>
        </Pressable>
      </View>

      <FlatList
        data={files}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={refresh}
        style={{ marginTop: 12 }}
        ListEmptyComponent={() => (
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: "#666" }}>
              No files yet. Upload a document, image, or report to keep it here.
            </Text>
          </View>
        )}
      />
    </View>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
