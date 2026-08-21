import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const isNativeApp = Capacitor.isNativePlatform();
let nativeStorageReady: Promise<void> | undefined;

async function ensureNativeStorageReady() {
  if (!isNativeApp) return;
  nativeStorageReady ??= SecureStorage.setKeyPrefix('quizspace_secure_');
  await nativeStorageReady;
}

/**
 * Supabase Auth storage adapter.
 *
 * Android/iOS values are held by the platform secure-storage implementation
 * backed by the OS keystore/keychain. The browser fallback is used only when
 * running the public web app, never as the native app's primary session store.
 */
export const supabaseSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!isNativeApp) return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
    await ensureNativeStorageReady();
    return SecureStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!isNativeApp) {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      return;
    }
    await ensureNativeStorageReady();
    await SecureStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (!isNativeApp) {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      return;
    }
    await ensureNativeStorageReady();
    await SecureStorage.removeItem(key);
  },
};
