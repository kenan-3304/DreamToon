import { Button, IconButton, HStack } from "native-base";
import { Ionicons } from "@expo/vector-icons";

export function Controls({
  fileUri,
  onCancel,
  onUpload,
  onRecordAgain,
}: {
  fileUri: string | null;
  onCancel: () => void;
  onUpload: () => Promise<void>;
  onRecordAgain: () => void;
}) {
  if (fileUri === null) {
    return (
      <IconButton
        icon={<Ionicons name="close-circle" size={32} color="white" />}
        onPress={onCancel}
        mt={6}
      />
    );
  }
  return (
    <HStack space={4} mt={6} justifyContent="center">
      <Button
        onPress={onRecordAgain}
        colorScheme="purple"
        _text={{ fontWeight: "bold" }}
      >
        Record Again
      </Button>
      <Button
        onPress={onUpload}
        colorScheme="green"
        _text={{ fontWeight: "bold" }}
      >
        Upload
      </Button>
    </HStack>
  );
}
