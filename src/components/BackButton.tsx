import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface BackButtonProps {
  onPress?: () => void;
  title?: string;
  showTitle?: boolean;
  style?: any;
  textStyle?: any;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  title = "Back",
  showTitle = true,
  style,
  textStyle
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Default back behavior
      if (router.canGoBack()) {
        router.back();
      } else {
        // Fallback to home/dashboard
        router.replace('/dashboard');
      }
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="arrow-back" size={20} color="#007AFF" />
      </View>
      {showTitle && (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    marginVertical: 4,
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default BackButton;

