import { useState, useEffect } from "react";
import { networkManager, NetworkState } from "../net/NetworkManager";

export function useNetworkStatus() {
  const [networkState, setNetworkState] = useState<NetworkState>(() =>
    networkManager.getCurrentState(),
  );

  useEffect(() => {
    const unsubscribe = networkManager.subscribe(setNetworkState);
    return unsubscribe;
  }, []);

  return {
    ...networkState,
    isOnline: networkManager.isOnline(),
    forceCheck: () => networkManager.forceCheck(),
  };
}
