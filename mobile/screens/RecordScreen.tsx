import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { VStack, Button, Text } from "native-base";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";

export default function RecordScreen() {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Ready to record your dream, bro!");
  const [fileUri, setFileUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const result = await AudioModule.requestRecordingPermissionsAsync();
      if (!result.granted) {
        Alert.alert("Permission to access microphone was denied");
      }
    })();
  }, []);

  const startRecording = async () => {
    try {
      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();
      setIsRecording(true);
      setStatus("⏺️ Recording…");
    } catch (err) {
      console.error("Start error:", err);
      setStatus(`Start error: ${(err as Error).message}`);
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      setIsRecording(false);
      const uri = audioRecorder.uri;
      setFileUri(uri ?? null);
      setStatus("✅ Saved locally. Ready to upload!");
    } catch (err) {
      console.error("Stop error:", err);
      setStatus(`Stop error: ${(err as Error).message}`);
    }
  };
  const uploadRecording = async () => {
    if (!fileUri) return;

    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Log blob details
      console.log("Blob details:", {
        type: blob.type,
        size: blob.size,
      });

      const formData = new FormData();
      formData.append("audio", {
        uri: fileUri,
        type: "audio/m4a",
        name: "dream.m4a",
      } as any);
      formData.append("user_id", "demo-user");

      // Log FormData contents
      console.log("FormData contents:");
      // @ts-ignore - entries() exists but TypeScript doesn't know about it
      for (const pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      const res = await fetch(
        "https://lzrhocmfiulykdxjzaku.functions.supabase.co/process_dream",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );

      const result = await res.text();
      console.log("Server response:", result);
      setStatus("🚀 Uploaded successfully!");
    } catch (err) {
      console.error("Upload failed:", err);
      setStatus("❌ Upload failed.");
    }
  };

  return (
    <VStack
      flex={1}
      space={6}
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <Text fontSize="lg">{status}</Text>
      <Button
        onPress={isRecording ? stopRecording : startRecording}
        colorScheme={isRecording ? "red" : "primary"}
        w="64"
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </Button>
      {fileUri && (
        <>
          <Text fontSize="xs" mt={4} textAlign="center">
            {fileUri}
          </Text>
          <Button mt={4} onPress={uploadRecording} colorScheme="green">
            Upload Recording
          </Button>
        </>
      )}
    </VStack>
  );
}
