import React, { useState, useEffect } from "react";
import { VStack } from "native-base";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";

import { Header } from "../components/Header";
import { StatusText } from "../components/StatusText";
import { RecorderCircle } from "../components/RecorderCircle";
import { Controls } from "../components/Controls";

export default function RecordScreen() {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Ready to record your dream, bro!");
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [durationText, setDurationText] = useState("0:00");

  // …permissions effect…

  const startRecording = async () => {
    /* …set up timer update… */
  };
  const stopRecording = async () => {
    /* …capture uri… */
  };
  const cancelRecording = () => {
    /* reset state + delete tmp file*/
  };
  const uploadRecording = async () => {
    /* … */
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
        onPressIn={startRecording}
        onPressOut={stopRecording}
      />

      <Controls
        fileUri={fileUri}
        onCancel={cancelRecording}
        onUpload={uploadRecording}
      />
    </VStack>
  );
}
