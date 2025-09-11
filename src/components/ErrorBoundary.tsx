import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { appState } from "../state/AppState";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🚨 ErrorBoundary caught error:", error, errorInfo);

    // Log error to analytics
    if (__DEV__) {
      console.error("Error details:", {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }

    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleLogout = async () => {
    try {
      await appState.logout();
    } catch (error) {
      console.error("Failed to logout after error:", error);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.logoutButton]}
              onPress={this.handleLogout}
            >
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#666",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
