import { useState } from 'react';
import {
  loginOrRegisterMatrixAccount,
  generateUsernameFromAddress,
  generatePasswordFromMnemonic,
  generatePasswordFromSignature,
  generateMatrixAuthChallenge,
  signChallengeWithWallet,
} from '@utils/matrix';
import { secret } from '@utils/secrets';

export function useMatrixAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Authenticate with Matrix using wallet address and mnemonic
   */
  const authenticateWithMatrix = async (address: string, mnemonic: string) => {
    setLoading(true);
    setError(null);

    try {
      const homeServerUrl = process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL;
      if (!homeServerUrl) {
        throw new Error('Matrix homeserver URL not configured');
      }

      // Generate Matrix credentials from wallet
      const mxUsername = generateUsernameFromAddress(address);
      const mxPassword = generatePasswordFromMnemonic(mnemonic);

      // Login or register
      const account = await loginOrRegisterMatrixAccount({
        homeServerUrl,
        username: mxUsername,
        password: mxPassword,
      });

      if (!account?.accessToken) {
        throw new Error('Failed to obtain Matrix access token');
      }

      return account;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to authenticate with Matrix';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Authenticate with Matrix using wallet signature (works with all wallet types)
   */
  const authenticateWithWalletSignature = async (walletType: string, chainId: string, address: string) => {
    setLoading(true);
    setError(null);

    try {
      const homeServerUrl = process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL;
      if (!homeServerUrl) {
        throw new Error('Matrix homeserver URL not configured');
      }

      console.log('Generating Matrix auth challenge...');
      // Generate challenge
      const challenge = generateMatrixAuthChallenge();

      console.log('Requesting wallet signature...');
      // Sign challenge with wallet
      const signature = await signChallengeWithWallet(walletType, chainId, address, challenge);

      console.log('Signature obtained, generating Matrix credentials...');
      // Generate Matrix credentials from signature
      const mxUsername = generateUsernameFromAddress(address);
      const mxPassword = generatePasswordFromSignature(signature);

      console.log('Logging in to Matrix server...');
      // Login or register
      const account = await loginOrRegisterMatrixAccount({
        homeServerUrl,
        username: mxUsername,
        password: mxPassword,
      });

      if (!account?.accessToken) {
        throw new Error('Failed to obtain Matrix access token');
      }

      console.log('Matrix authentication successful!');
      return account;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to authenticate with Matrix';
      console.error('Matrix authentication error:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get current Matrix access token from storage
   */
  const getAccessToken = () => {
    return secret.accessToken;
  };

  /**
   * Check if user is authenticated with Matrix
   */
  const isAuthenticated = () => {
    return !!secret.accessToken;
  };

  return {
    authenticateWithMatrix,
    authenticateWithWalletSignature,
    getAccessToken,
    isAuthenticated,
    loading,
    error,
  };
}

