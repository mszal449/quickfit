import { useCallback, useEffect, useRef, useState } from "react";

export function useRestTimer() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const endsAtRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (endsAtRef.current === null) return;
      const remaining = Math.ceil((endsAtRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        endsAtRef.current = null;
        setSecondsLeft(0);
        if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
      } else {
        setSecondsLeft(remaining);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const start = useCallback((seconds: number) => {
    endsAtRef.current = Date.now() + seconds * 1000;
    setTotalSeconds(seconds);
    setSecondsLeft(seconds);
  }, []);

  const skip = useCallback(() => {
    endsAtRef.current = null;
    setSecondsLeft(0);
  }, []);

  const addTime = useCallback((delta: number) => {
    if (endsAtRef.current === null) return;
    endsAtRef.current += delta * 1000;
    setSecondsLeft((s) => Math.max(0, s + delta));
  }, []);

  return {
    secondsLeft,
    totalSeconds,
    isActive: secondsLeft > 0,
    start,
    skip,
    addTime,
  };
}
