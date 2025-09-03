import Constants from 'expo-constants';
import { Platform } from 'react-native';

const fromAppJson = (Constants.expoConfig?.extra as any)?.apiUrl as string | undefined;

export const API_BASE =
  fromAppJson ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');
