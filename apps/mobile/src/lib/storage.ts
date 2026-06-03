import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const customStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return window.localStorage.getItem(name);
      } catch {
        return null;
      }
    }
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.setItem(name, value);
      } catch {}
    } else {
      try {
        await AsyncStorage.setItem(name, value);
      } catch {}
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.removeItem(name);
      } catch {}
    } else {
      try {
        await AsyncStorage.removeItem(name);
      } catch {}
    }
  },
};
