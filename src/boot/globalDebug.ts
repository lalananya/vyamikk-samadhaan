import { LogBox } from "react-native";
LogBox.ignoreLogs([
  "Non-serializable values were found in the navigation state",
]);

const prevUHE = (global as any).onunhandledrejection;
(global as any).onunhandledrejection = (e: any) => {
  console.error("⚠️ Unhandled promise rejection:", e?.reason || e);
  prevUHE?.(e);
};

if ((global as any).ErrorUtils?.setGlobalHandler) {
  const prev = (global as any).ErrorUtils.getGlobalHandler?.();
  (global as any).ErrorUtils.setGlobalHandler((err: any, fatal?: boolean) => {
    console.error("⚠️ Uncaught error:", err, "fatal:", fatal);
    prev?.(err, fatal);
  });
}
