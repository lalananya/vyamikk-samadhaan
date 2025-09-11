import { useRef, useCallback } from "react";

interface UseTripleTapOptions {
  onTripleTap: () => void;
  maxDelay?: number;
}

export const useTripleTap = ({
  onTripleTap,
  maxDelay = 1000,
}: UseTripleTapOptions) => {
  const tapCount = useRef(0);
  const lastTapTime = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();

    // Reset if too much time has passed
    if (now - lastTapTime.current > maxDelay) {
      tapCount.current = 0;
    }

    tapCount.current++;
    lastTapTime.current = now;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (tapCount.current >= 3) {
        onTripleTap();
      }
      tapCount.current = 0;
    }, maxDelay);
  }, [onTripleTap, maxDelay]);

  return { handleTap };
};
