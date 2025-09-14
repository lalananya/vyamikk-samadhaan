import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";

type Props = { children: React.ReactNode };
type State = { error?: any };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = {};
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("💥 Root ErrorBoundary:", error, info?.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children as any;
    const msg = String(this.state.error?.message || this.state.error);
    return (
      <ScrollView contentContainerStyle={s.wrap}>
        <Text style={s.h1}>App crashed</Text>
        <Text style={s.body}>{msg}</Text>
        <Text style={s.sub}>See Metro logs for stack, then fix & reload.</Text>
      </ScrollView>
    );
  }
}
const s = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  h1: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, marginBottom: 6 },
  sub: { color: "#666" },
});
