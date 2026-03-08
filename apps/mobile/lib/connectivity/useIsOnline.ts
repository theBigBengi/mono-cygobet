import { useEffect, useState } from "react";
import { isOnlineSync, subscribe } from "./netinfo";

export function useIsOnline(): boolean {
  const [online, setOnline] = useState(isOnlineSync);

  useEffect(() => {
    return subscribe(setOnline);
  }, []);

  return online;
}
