import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from "react-native";
import { analytics } from "../analytics/AnalyticsService";
import { RBAC_EVENTS } from "../analytics/events";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  title?: string;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  showFooter?: boolean;
}

export default function AuthenticatedLayout({
  children,
  title,
  onRefresh,
  refreshing = false,
  showFooter = true,
}: AuthenticatedLayoutProps) {
  useEffect(() => {
    // Track footer rendered event
    if (showFooter) {
      analytics.track({
        event: "footer_rendered",
        properties: {
          screen: title || "unknown",
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      });
    }
  }, [showFooter, title]);

  return (
    <SafeAreaView style={styles.container}>
      {title && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {children}

        {showFooter && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Designed & developed by{" "}
              <Text style={styles.footerBrand}>Special</Text>
            </Text>
            <Text style={styles.footerSubtext}>
              Empowering MSMEs with smart workforce management
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
  footerBrand: {
    color: "#007AFF",
    fontWeight: "bold",
  },
  footerSubtext: {
    color: "#444",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
});
