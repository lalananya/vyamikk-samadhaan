import { StatusBar } from 'expo-status-bar';
import RootRouterGuard from '../src/guards/RootRouterGuard';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <RootRouterGuard />
    </>
  );
}