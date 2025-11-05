declare module 'secure-web-storage' {
  interface SecureStorageOptions {
    hash?: (key: string) => string;
    encrypt?: (data: string) => string;
    decrypt?: (data: string) => string;
  }

  class SecureStorage {
    constructor(storage: Storage, options?: SecureStorageOptions);
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
  }

  export default SecureStorage;
}
