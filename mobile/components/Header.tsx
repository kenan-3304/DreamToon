import { HStack, IconButton, Text, Box } from "native-base";
import { Ionicons } from "@expo/vector-icons";

export function Header({ name }: { name: string }) {
  return (
    <HStack
      w="100%"
      px={4}
      pt={8}
      justifyContent="space-between"
      alignItems="center"
      bg="background.500"
    >
      <IconButton icon={<Ionicons name="moon" size={24} color="white" />} />
      <Text color="white" fontSize="lg" fontWeight="bold">
        Good morning, {name}
      </Text>
      <IconButton
        icon={<Ionicons name="notifications-outline" size={24} color="white" />}
      />
    </HStack>
  );
}
