import { useEffect, useRef } from "react";
import { usePathname } from "expo-router";
import { routeLogger } from "../debug/RouteLogger";

export const useRouteLogger = () => {
  const pathname = usePathname();
  const previousPathname = useRef<string>("unknown");

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      routeLogger.logRouteChange(previousPathname.current, pathname);
      previousPathname.current = pathname;
    }
  }, [pathname]);

  return {
    currentRoute: routeLogger.getCurrentRoute(),
    routeHistory: routeLogger.getRouteHistory(),
    lastRouteChange: routeLogger.getLastRouteChange(),
    printRouteHistory: () => routeLogger.printRouteHistory(),
    clearHistory: () => routeLogger.clearHistory(),
    enable: () => routeLogger.enable(),
    disable: () => routeLogger.disable(),
    isEnabled: routeLogger.isRouteLoggerEnabled(),
  };
};
