import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getStoredValue(key, fallbackValue = '') {
  try {
    const value = await AsyncStorage.getItem(key);
    return value === null ? fallbackValue : value;
  } catch {
    return fallbackValue;
  }
}

export async function setStoredValue(key, value) {
  await AsyncStorage.setItem(key, String(value));
}
