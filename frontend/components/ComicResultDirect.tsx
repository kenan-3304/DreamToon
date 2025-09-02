import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useUser } from "../context/UserContext";

export const ComicResultDirect = () => {
  const router = useRouter();
  const { completedComicData, clearCompletedComicData } = useUser();

  useEffect(() => {
    // Check if there is an announcement and if it's for THIS screen's comic
    if (completedComicData && completedComicData.dreamId) {
      console.log(
        `ProcessingScreen: Detected completion for dream ${completedComicData.dreamId}. Navigating.`
      );

      // Navigate to the result screen with the final data
      router.replace({
        pathname: "/(tab)/ComicResultScreen",
        params: {
          id: completedComicData.dreamId,
          urls: JSON.stringify(completedComicData.panelUrls),
        },
      });

      // Clean up the announcement so we don't navigate again
      clearCompletedComicData();
    }
  }, [completedComicData, clearCompletedComicData, router]);
  return null;
};
