// components/StatusText.tsx
import React from "react";
import { Text } from "native-base";

export function StatusText({ text }: { text: string }) {
  return (
    <Text color="white" fontSize="md" my={4} textAlign="center">
      {text}
    </Text>
  );
}
