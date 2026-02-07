import { useEffect, useState } from "react";
import { AppState } from "react-native";

/** Returns true when app is in foreground (active). */
export function useAppIsActive(): boolean {
  const [isActive, setIsActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setIsActive(state === "active");
    });
    return () => sub.remove();
  }, []);

  return isActive;
}
