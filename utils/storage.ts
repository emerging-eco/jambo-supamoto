import SecureStorage from 'secure-web-storage';
import CryptoJS from 'crypto-js';

// Use a consistent secret key for encryption
// In production, this should be more secure
const SECRET_KEY = 'jambo-supamoto-secret-key-v1';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// Create a mock storage for SSR
const mockStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

// Initialize secure storage only in browser environment
const secureStorage = isBrowser
  ? new SecureStorage(localStorage, {
      hash: function (key: string) {
        return CryptoJS.SHA256(key).toString();
      },
      encrypt: function (data: string) {
        return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
      },
      decrypt: function (data: string) {
        const bytes = CryptoJS.AES.decrypt(data, SECRET_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
      },
    })
  : mockStorage;

export function secureSave(key: string, value: string) {
  const valueStringified = JSON.stringify({ data: value });
  secureStorage.setItem(key, valueStringified);
  return value;
}

export function secureGet(key: string): string | null {
  try {
    const value = secureStorage.getItem(key);
    if (!value) return null;
    const parsed = JSON.parse(value);
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

export function secureRemove(key: string) {
  secureStorage.removeItem(key);
}

export function secureClear() {
  secureStorage.clear();
}

