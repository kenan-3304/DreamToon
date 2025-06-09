import { Button, IconButton } from "native-base";
import { Ionicons } from "@expo/vector-icons";

export function Controls({
  fileUri,
  onCancel,
  onUpload,
}: {
  fileUri: string | null;
  onCancel: () => void;
  onUpload: () => Promise<void>;
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
    <Button
      mt={6}
      w="60%"
      onPress={onUpload}
      colorScheme="green"
      _text={{ fontWeight: "bold" }}
    >
      Upload Recording
    </Button>
  );
}
