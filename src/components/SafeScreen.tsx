import React from "react";
import {
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Platform,
  ViewStyle,
  TextStyle,
} from "react-native";

interface SafeScreenProps {
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  titleStyle?: TextStyle;
}

export default function SafeScreen({
  title,
  footer,
  children,
  style,
  contentContainerStyle,
  titleStyle,
}: SafeScreenProps) {
  return (
    <SafeAreaView style={[styles.container, style]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {title && <Text style={[styles.title, titleStyle]}>{title}</Text>}
          {children}
        </ScrollView>
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 24,
    color: "#1a1a1a",
  },
  footer: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e1e5e9",
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16, // Account for home indicator
  },
});
