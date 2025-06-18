import React, { useState, useEffect, useRef } from "react";
import { Alert } from "react-native";
import { VStack } from "native-base";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";

import { Header } from "../components/Header";
import { StatusText } from "../components/StatusText";
import { RecorderCircle } from "../components/RecorderCircle";
import { Controls } from "../components/Controls";
import { PROCESS_DREAM_URL } from "../config";

export default function RecordScreen() {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Ready to record your dream, bro!");
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [durationText, setDurationText] = useState("0:00");

  // to drive our timer
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ask for mic perms on mount
  useEffect(() => {
    (async () => {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission to access microphone was denied");
      }
    })();
    // clean up timer if unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();
      setIsRecording(true);
      setStatus("⏺️ Recording…");

      // start our duration counter
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        setDurationText(`${mins}:${secs.toString().padStart(2, "0")}`);
      }, 500);
    } catch (err) {
      console.error("Start error:", err);
      setStatus(`Start error: ${(err as Error).message}`);
    }
  };

  const stopRecording = async () => {
    try {
      // stop our timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await audioRecorder.stop();
      setIsRecording(false);

      const uri = audioRecorder.uri;
      setFileUri(uri);
      setStatus("✅ Saved locally. Ready to upload!");
    } catch (err) {
      console.error("Stop error:", err);
      setStatus(`Stop error: ${(err as Error).message}`);
    }
  };

  const cancelRecording = () => {
    // if you want, delete the temp file here via FileSystem
    if (timerRef.current) clearInterval(timerRef.current);
    audioRecorder.stopAsync?.(); // just in case
    setIsRecording(false);
    setStatus("Recording cancelled.");
    setDurationText("0:00");
    setFileUri(null);
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

      const res = await fetch(PROCESS_DREAM_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        });

      const result = await res.text();
      console.log("Server response:", result);
      setStatus("🚀 Uploaded successfully!");
    } catch (err) {
      console.error("Upload failed:", err);
      setStatus("❌ Upload failed.");
    }
  };

  const recordAgain = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    audioRecorder.stopAsync?.(); // just in case
    setIsRecording(false);
    setStatus("Ready to record your dream, bro!");
    setDurationText("0:00");
    setFileUri(null);
  };

  return (
    <VStack
      flex={1}
      bg="background.500"
      alignItems="center"
      justifyContent="flex-start"
    >
      <Header name="Kenan" />
      <StatusText text={status} />

      <RecorderCircle
        isRecording={isRecording}
        durationText={durationText}
        onPress={isRecording ? stopRecording : startRecording}
      />

      <Controls
        fileUri={fileUri}
        onCancel={cancelRecording}
        onUpload={uploadRecording}
        onRecordAgain={recordAgain}
      />
    </VStack>
  );
}
