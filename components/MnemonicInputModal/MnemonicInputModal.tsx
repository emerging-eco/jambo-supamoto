import { ClipboardEvent, useState } from 'react';
import cls from 'classnames';

import Button, { BUTTON_BG_COLOR, BUTTON_BORDER_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import Input from '@components/Input/Input';
import LoaderMessage from '@components/LoaderMessage/LoaderMessage';
import EyeIcon from '@icons/eye.svg';
import { getSecpClient } from '@utils/secp';
import { checkIidDocumentExists } from '@utils/did';
import {
  generateUsernameFromAddress,
  checkIsUsernameAvailable,
  generatePasswordFromMnemonic,
  generatePassphraseFromMnemonic,
  logoutMatrixClient,
  loginOrRegisterMatrixAccount,
  createMatrixClient,
} from '@utils/matrix';
import { decrypt } from '@utils/encryption';
import { MATRIX_HOMESERVER_URL, MATRIX_ROOM_BOT_URL } from '@constants/env';
import PinInputModal from '@components/PinInputModal/PinInputModal';

import styles from './MnemonicInputModal.module.scss';

type MnemonicInputModalProps = {
  onClose: () => void;
  onLogin: (data: {
    wallet: any;
    credentialId: string;
    did: string;
    address: string;
    matrix: {
      accessToken: string;
      address: string;
      userId: string;
      deviceId: string;
      roomId: string;
    };
  }) => void;
};

const MnemonicInputModal = ({ onClose, onLogin }: MnemonicInputModalProps) => {
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [words, setWords] = useState<string[]>(() => Array(12).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loaderMessage, setLoaderMessage] = useState('Verifying your account...');
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinError, setPinError] = useState<string | undefined>(undefined);
  const [encryptedMnemonicForPin, setEncryptedMnemonicForPin] = useState<string | undefined>(undefined);
  const [secpClientForLogin, setSecpClientForLogin] = useState<any>(undefined);
  const [mxUsernameForLogin, setMxUsernameForLogin] = useState<string | undefined>(undefined);
  const [didForLogin, setDidForLogin] = useState<string | undefined>(undefined);
  const [addressForLogin, setAddressForLogin] = useState<string | undefined>(undefined);
  const [roomIdForLogin, setRoomIdForLogin] = useState<string | undefined>(undefined);

  const handleWordCountChange = (newWordCount: 12 | 24) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setWordCount(newWordCount);
    // Resize words array, preserving existing values or filling with empty strings
    setWords((prev) => {
      const newWords = Array(newWordCount).fill('');
      for (let i = 0; i < Math.min(prev.length, newWordCount); i++) {
        newWords[i] = prev[i] || '';
      }
      return newWords;
    });
  };

  const handleWordCountContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const handleShowMnemonicToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setShowMnemonic((prev) => !prev);
  };

  const handleWordChange = (index: number, value: string) => {
    setWords((prev) => {
      const newWords = [...prev];
      newWords[index] = value.trim();
      return newWords;
    });
  };

  const handlePaste = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      const text = await navigator.clipboard.readText();
      const pastedWords = text
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 0);

      if (pastedWords.length === 0) return;

      setWords((prev) => {
        const newWords = [...prev];
        const wordsToFill = Math.min(pastedWords.length, wordCount);
        for (let i = 0; i < wordsToFill; i++) {
          newWords[i] = pastedWords[i];
        }
        return newWords;
      });
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  };

  const handleInputPaste = (index: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const pastedWords = text
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 0);

    if (pastedWords.length === 0) return;

    const wordsToFill = Math.min(pastedWords.length, wordCount - index);

    setWords((prev) => {
      const newWords = [...prev];
      for (let i = 0; i < wordsToFill; i++) {
        if (index + i < wordCount) {
          newWords[index + i] = pastedWords[i];
        }
      }
      return newWords;
    });

    // Focus the last filled input or next empty input
    const lastFilledIndex = Math.min(index + wordsToFill - 1, wordCount - 1);
    const nextEmptyIndex = lastFilledIndex + 1;
    if (nextEmptyIndex < wordCount) {
      setTimeout(() => {
        const form = e.currentTarget.closest('[class*="mnemonicForm"]') || e.currentTarget.parentElement?.parentElement;
        if (form) {
          const nextInput = form.querySelector(`input[data-word-index="${nextEmptyIndex}"]`) as HTMLInputElement;
          if (nextInput) {
            nextInput.focus();
          }
        }
      }, 0);
    }
  };

  const handleKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle spacebar - move to next input
    if (e.key === ' ') {
      e.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex < wordCount) {
        // Find the next input element in the DOM using data attribute
        const currentInput = e.currentTarget;
        const form = currentInput.closest('[class*="mnemonicForm"]') || currentInput.parentElement?.parentElement;
        if (form) {
          const nextInput = form.querySelector(`input[data-word-index="${nextIndex}"]`) as HTMLInputElement;
          if (nextInput) {
            nextInput.focus();
          }
        }
      }
    }

    // Handle backspace - move to previous input if current is empty
    if (e.key === 'Backspace') {
      const currentValue = words[index] || '';
      const inputElement = e.currentTarget;
      const cursorPosition = inputElement.selectionStart || 0;

      // If field is empty or cursor is at the start, move to previous
      if (currentValue === '' || (cursorPosition === 0 && currentValue.length === 0)) {
        e.preventDefault();
        const prevIndex = index - 1;
        if (prevIndex >= 0) {
          // Find the previous input element in the DOM using data attribute
          const form = inputElement.closest('[class*="mnemonicForm"]') || inputElement.parentElement?.parentElement;
          if (form) {
            const prevInput = form.querySelector(`input[data-word-index="${prevIndex}"]`) as HTMLInputElement;
            if (prevInput) {
              prevInput.focus();
              // Move cursor to end of previous input
              setTimeout(() => {
                prevInput.setSelectionRange(prevInput.value.length, prevInput.value.length);
              }, 0);
            }
          }
        }
      }
    }
  };

  const allFieldsFilled = words.slice(0, wordCount).every((word) => word.length > 0);

  const handlePinSubmit = async (pin: string) => {
    if (!encryptedMnemonicForPin) return;

    setShowPinInput(false);
    setLoading(true);
    setLoaderMessage('Decrypting mnemonic...');
    setPinError(undefined);

    try {
      const mxMnemonic = decrypt(encryptedMnemonicForPin, pin);

      if (!mxMnemonic) {
        setPinError('Incorrect PIN. Please try again.');
        setShowPinInput(true);
        setLoading(false);
        return;
      }

      // Continue with matrix login
      await continueMatrixLogin(mxMnemonic);
    } catch (decryptErr) {
      // Decryption failed - incorrect PIN
      setPinError('Incorrect PIN. Please try again.');
      setShowPinInput(true);
      setLoading(false);
    }
  };

  const continueMatrixLogin = async (mxMnemonic: string) => {
    if (!secpClientForLogin || !mxUsernameForLogin) {
      setError('Session expired. Please try again.');
      setLoading(false);
      return;
    }

    try {
      // Generate password and passphrase from decrypted mnemonic
      const mxPassword = generatePasswordFromMnemonic(mxMnemonic);
      const mxPassphrase = generatePassphraseFromMnemonic(mxMnemonic);

      const homeServerUrl = MATRIX_HOMESERVER_URL as string;

      // Always logout any existing matrix session first
      setLoaderMessage('Logging out...');
      await logoutMatrixClient({ baseUrl: homeServerUrl });

      // Wait 1 second before attempting login
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Login to matrix account
      setLoaderMessage('Logging into Matrix...');
      const account = await loginOrRegisterMatrixAccount({
        homeServerUrl,
        username: mxUsernameForLogin,
        password: mxPassword,
        wallet: secpClientForLogin,
      });

      if (!account?.accessToken) {
        throw new Error('Failed to login to matrix account, please try again.');
      }

      // Create matrix client
      setLoaderMessage('Initializing Matrix client...');
      await createMatrixClient();

      // Call onLogin with the required data
      if (!didForLogin || !addressForLogin || !roomIdForLogin) {
        throw new Error('Missing required login data');
      }

      onLogin({
        wallet: secpClientForLogin,
        credentialId: 'secp256k1',
        did: didForLogin,
        address: addressForLogin,
        // @ts-ignore - enrich payload for initializer to forward matrix details
        matrix: {
          accessToken: account.accessToken as string,
          address: addressForLogin,
          userId: account.userId,
          deviceId: account.deviceId as string,
          roomId: roomIdForLogin,
        },
      });

      // Keep loader showing - user handles subsequent steps
      setLoaderMessage('Login successful!');
    } catch (err) {
      console.error('Error during matrix login:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during matrix login. Please try again.');
      setLoading(false);
    }
  };

  const handlePinCancel = () => {
    setShowPinInput(false);
    setEncryptedMnemonicForPin(undefined);
    setPinError(undefined);
    setSecpClientForLogin(undefined);
    setMxUsernameForLogin(undefined);
    setDidForLogin(undefined);
    setAddressForLogin(undefined);
    setRoomIdForLogin(undefined);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!allFieldsFilled) return;

    const mnemonic = words.slice(0, wordCount).join(' ');
    setLoading(true);
    setError(undefined);

    try {
      // Generate secp client from mnemonic
      const secpClient = await getSecpClient(mnemonic);
      const did = secpClient.did;

      // Check if DID exists
      const didExists = await checkIidDocumentExists(did);

      if (!didExists) {
        throw new Error(
          'DID not found. Please ensure your mnemonic phrase is correct and your account exists on the IXO blockchain.',
        );
      }

      // DID exists - continue with matrix login
      setLoaderMessage('Checking Matrix account...');

      const address = secpClient.baseAccount.address;
      const mxUsername = generateUsernameFromAddress(address);
      const homeServerUrl = MATRIX_HOMESERVER_URL as string;

      if (!homeServerUrl) {
        throw new Error('Matrix homeserver URL not configured');
      }

      const isUsernameAvailable = await checkIsUsernameAvailable({
        homeServerUrl,
        username: mxUsername,
      });

      if (isUsernameAvailable) {
        // User doesn't exist - show error
        throw new Error('Matrix account not found. Please register first.');
      }

      // Username exists - proceed with login
      setLoaderMessage('Authenticating...');

      // Create challenge and sign it
      const timestamp = new Date().toISOString();
      const challenge = Buffer.from(timestamp).toString('base64');
      const signature = await secpClient.sign(challenge);

      // Get encrypted mnemonic from API
      const response = await fetch('/api/auth/get-secret-secp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: secpClient.baseAccount.address,
          secpResult: {
            challenge,
            signature: Buffer.from(signature).toString('base64'),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (!errorData.error?.includes('M_NOT_FOUND: Room alias')) {
          throw new Error(errorData.error || 'Failed to login');
        }
        // If room alias not found, user might not have matrix account set up
        throw new Error('Matrix account not found. Please register first.');
      }

      const { encryptedMnemonic, roomId } = await response.json();

      // Store values needed for matrix login
      setSecpClientForLogin(secpClient);
      setMxUsernameForLogin(mxUsername);
      setDidForLogin(did);
      setAddressForLogin(address);
      setRoomIdForLogin(roomId);
      setEncryptedMnemonicForPin(encryptedMnemonic);
      setShowPinInput(true);
      setLoading(false);
      return; // Wait for PIN submission
    } catch (err) {
      console.error('Error during login:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during login. Please try again.');
      setLoading(false);
    }
  };

  if (showPinInput) {
    return <PinInputModal onClose={handlePinCancel} onSubmit={handlePinSubmit} error={pinError} />;
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <LoaderMessage message={loaderMessage} />
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <p className={styles.controlLabel}>
          Type of paste your secret mnemonic phrase consisting of {wordCount} words, to login with your existing keys.
        </p>

        {error && <p className={styles.errorMessage}>{error}</p>}

        <div className={styles.mnemonicForm}>
          {Array.from({ length: wordCount }, (_, index) => (
            <div key={index} className={styles.wordInputWrapper}>
              <span className={styles.wordNumber}>{index + 1}</span>
              <Input
                type={showMnemonic ? 'text' : 'password'}
                value={words[index] || ''}
                onChange={(e) => handleWordChange(index, e.target.value)}
                onPaste={handleInputPaste(index)}
                onKeyDown={handleKeyDown(index)}
                className={styles.wordInput}
                autoComplete='off'
                data-word-index={index}
              />
            </div>
          ))}
        </div>

        <div className={styles.row}>
          <div
            className={styles.wordCountButtons}
            onClick={handleWordCountContainerClick}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type='button'
              onClick={handleWordCountChange(12)}
              onMouseDown={(e) => e.stopPropagation()}
              className={cls(styles.wordCountButton, wordCount === 12 && styles.wordCountButtonActive)}
            >
              12 words
            </button>
            <button
              type='button'
              onClick={handleWordCountChange(24)}
              onMouseDown={(e) => e.stopPropagation()}
              className={cls(styles.wordCountButton, wordCount === 24 && styles.wordCountButtonActive)}
            >
              24 words
            </button>
          </div>

          <Button
            label={showMnemonic ? 'Hide' : 'Show'}
            size={BUTTON_SIZE.small}
            bgColor={showMnemonic ? BUTTON_BG_COLOR.lightGrey : BUTTON_BG_COLOR.primary}
            color={showMnemonic ? BUTTON_COLOR.primary : BUTTON_COLOR.white}
            borderColor={BUTTON_BORDER_COLOR.primary}
            onClick={handleShowMnemonicToggle}
            prefixIcon={<EyeIcon className={styles.eyeIcon} />}
          />
        </div>

        <div className={styles.actions}>
          <Button
            label='Cancel'
            size={BUTTON_SIZE.medium}
            bgColor={BUTTON_BG_COLOR.lightGrey}
            borderColor={BUTTON_BORDER_COLOR.lightGrey}
            onClick={onClose}
          />
          <Button
            label='Login'
            size={BUTTON_SIZE.medium}
            bgColor={BUTTON_BG_COLOR.primary}
            color={BUTTON_COLOR.white}
            onClick={handleSubmit}
            disabled={!allFieldsFilled}
          />
        </div>
      </div>
    </>
  );
};

export default MnemonicInputModal;
