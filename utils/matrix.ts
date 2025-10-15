import { createClient } from 'matrix-js-sdk';
import md5 from 'md5';
import { cons } from '@constants/matrix';
import { secureSave, secureRemove } from './storage';

export type AuthResponse = {
  accessToken: string;
  deviceId: string;
  userId: string;
  baseUrl: string;
};

/**
 * Generate Matrix username from wallet address
 * Format: did-ixo-{address}
 */
export function generateUsernameFromAddress(address: string): string {
  return `did-ixo-${address}`;
}

/**
 * Generate Matrix password from mnemonic
 * Uses MD5 hash of the mnemonic
 */
export function generatePasswordFromMnemonic(mnemonic: string): string {
  return md5(mnemonic);
}

/**
 * Generate Matrix password from wallet signature
 * Uses MD5 hash of the signature (similar to mnemonic approach)
 */
export function generatePasswordFromSignature(signature: string): string {
  return md5(signature);
}

/**
 * Generate a challenge for wallet signature authentication
 * Returns ISO timestamp encoded in base64
 */
export function generateMatrixAuthChallenge(): string {
  const timestamp = new Date().toISOString();
  return Buffer.from(timestamp).toString('base64');
}

/**
 * Sign a challenge with the wallet using signArbitrary
 * Returns the signature string that can be used to generate Matrix password
 */
export async function signChallengeWithWallet(
  walletType: string,
  chainId: string,
  address: string,
  challenge: string,
): Promise<string> {
  try {
    // Get the appropriate wallet instance based on wallet type
    let walletInstance: any;

    if (walletType === 'keplr' || walletType === 'opera') {
      // For Keplr and Opera, use window.keplr
      if (typeof window !== 'undefined' && (window as any).keplr) {
        walletInstance = (window as any).keplr;
      } else {
        throw new Error('Keplr wallet not found');
      }
    } else if (walletType === 'walletConnect') {
      // For WalletConnect, we need to handle it differently
      // This is a simplified version - you may need to adjust based on your WC implementation
      throw new Error('WalletConnect signature support coming soon');
    } else {
      throw new Error(`Unsupported wallet type: ${walletType}`);
    }

    // Use signArbitrary method available in Keplr and other wallets
    if (walletInstance && walletInstance.signArbitrary) {
      const result = await walletInstance.signArbitrary(chainId, address, challenge);
      return result.signature;
    } else {
      throw new Error('Wallet does not support signArbitrary method');
    }
  } catch (error: any) {
    console.error('Error signing challenge:', error);
    throw new Error(`Failed to sign challenge: ${error.message}`);
  }
}

/**
 * Normalize username for Matrix (remove @ and domain if present)
 */
function normalizeUsername(username: string): string {
  const usernameLowerCase = username.toLowerCase();
  if (usernameLowerCase.startsWith('@')) {
    return usernameLowerCase.slice(1).split(':')[0];
  }
  return usernameLowerCase.split(':')[0];
}

/**
 * Create a temporary Matrix client for authentication
 */
function createTemporaryClient(homeServerUrl: string) {
  return createClient({ baseUrl: homeServerUrl });
}

/**
 * Store Matrix credentials in secure storage
 */
function updateLocalStore(accessToken: string, deviceId: string, userId: string, baseUrl: string) {
  secureSave(cons.secretKey.ACCESS_TOKEN, accessToken);
  secureSave(cons.secretKey.DEVICE_ID, deviceId);
  secureSave(cons.secretKey.USER_ID, userId);
  secureSave(cons.secretKey.BASE_URL, baseUrl);
}

/**
 * Clear Matrix credentials from storage
 */
export function clearMatrixCredentials() {
  secureRemove(cons.secretKey.ACCESS_TOKEN);
  secureRemove(cons.secretKey.DEVICE_ID);
  secureRemove(cons.secretKey.USER_ID);
  secureRemove(cons.secretKey.BASE_URL);
}

/**
 * Login to Matrix server
 */
export async function mxLogin({
  homeServerUrl,
  username,
  password,
}: {
  homeServerUrl: string;
  username: string;
  password: string;
}): Promise<AuthResponse> {
  const client = createTemporaryClient(homeServerUrl);

  const response = await client.login('m.login.password', {
    identifier: {
      type: 'm.id.user',
      user: normalizeUsername(username),
    },
    password,
    initial_device_display_name: cons.DEVICE_DISPLAY_NAME,
  });

  const data: AuthResponse = {
    accessToken: response.access_token,
    deviceId: response.device_id,
    userId: response.user_id,
    baseUrl: response?.well_known?.['m.homeserver']?.base_url || client.baseUrl,
  };

  updateLocalStore(data.accessToken, data.deviceId, data.userId, data.baseUrl);

  return data;
}

/**
 * Register a new Matrix account
 */
export async function mxRegister({
  homeServerUrl,
  username,
  password,
}: {
  homeServerUrl: string;
  username: string;
  password: string;
}): Promise<AuthResponse> {
  const client = createTemporaryClient(homeServerUrl);

  const response = await client.register(normalizeUsername(username), password, undefined, {
    type: 'm.login.dummy',
  });

  const data: AuthResponse = {
    accessToken: response.access_token,
    deviceId: response.device_id,
    userId: response.user_id,
    baseUrl: response?.well_known?.['m.homeserver']?.base_url || client.baseUrl,
  };

  updateLocalStore(data.accessToken, data.deviceId, data.userId, data.baseUrl);

  return data;
}

/**
 * Check if a Matrix username is available
 */
export async function checkIsUsernameAvailable({
  homeServerUrl,
  username,
}: {
  homeServerUrl: string;
  username: string;
}): Promise<boolean> {
  try {
    const client = createTemporaryClient(homeServerUrl);
    const response = await client.isUsernameAvailable(normalizeUsername(username));
    return response;
  } catch (error: any) {
    // If error is M_USER_IN_USE, username is taken
    if (error?.errcode === 'M_USER_IN_USE') {
      return false;
    }
    throw error;
  }
}

/**
 * Login or register Matrix account
 * Tries to login first, if fails, registers a new account
 */
export async function loginOrRegisterMatrixAccount({
  homeServerUrl,
  username,
  password,
}: {
  homeServerUrl: string;
  username: string;
  password: string;
}): Promise<AuthResponse> {
  try {
    // Try to login first
    return await mxLogin({ homeServerUrl, username, password });
  } catch (loginError: any) {
    console.log('Login failed, attempting registration:', loginError.message);

    // If login fails, try to register
    try {
      return await mxRegister({ homeServerUrl, username, password });
    } catch (registerError: any) {
      console.error('Registration failed:', registerError);
      throw new Error(`Failed to login or register: ${registerError.message}`);
    }
  }
}

/**
 * Logout from Matrix (clear local credentials)
 */
export async function logoutMatrixClient({ baseUrl }: { baseUrl: string }) {
  try {
    clearMatrixCredentials();
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

/**
 * Authenticate SignX wallet users with Matrix using address-based credentials
 * This provides a seamless authentication experience for SignX users without requiring wallet signatures
 *
 * @param address - The wallet address from SignX
 * @returns AuthResponse with access token and user details
 */
export async function authenticateSignXWithMatrix(address: string): Promise<AuthResponse> {
  try {
    const homeServerUrl = process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL;
    if (!homeServerUrl) {
      throw new Error('Matrix homeserver URL not configured');
    }

    console.log('SignX Matrix authentication starting for address:', address);

    // Generate Matrix credentials from address
    const mxUsername = generateUsernameFromAddress(address);
    // Use MD5 of address as password - deterministic but less secure than signature
    const mxPassword = md5(address);

    console.log('Generated Matrix username:', mxUsername);

    // Login or register with Matrix server
    const account = await loginOrRegisterMatrixAccount({
      homeServerUrl,
      username: mxUsername,
      password: mxPassword,
    });

    if (!account?.accessToken) {
      throw new Error('Failed to obtain Matrix access token for SignX user');
    }

    console.log('SignX Matrix authentication successful!');
    return account;
  } catch (error: any) {
    console.error('SignX Matrix authentication error:', error);
    throw new Error(`Failed to authenticate SignX with Matrix: ${error.message}`);
  }
}

