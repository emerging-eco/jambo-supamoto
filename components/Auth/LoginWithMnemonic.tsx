import { useRef, useState } from 'react';
import { utils } from '@ixo/impactxclient-sdk';
import { createMatrixApiClient } from '@ixo/matrixclient-sdk';
import { OfflineSigner } from '@cosmjs/proto-signing';

import Button, { BUTTON_BG_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import Loader from '@components/Loader/Loader';
import EmailFeegrantForm from '@components/EmailFeegrantForm/EmailFeegrantForm';
import MatrixPinForm from '@components/MatrixPinForm/MatrixPinForm';

import { getSecpClient, SecpClient } from '@utils/secp';
import { checkAddressFeegrant } from '@utils/feegrant';
import { checkIidDocumentExists, createIidDocument } from '@utils/did';
import { decrypt, encrypt } from '@utils/encryption';
import {
  checkIsUsernameAvailable,
  createMatrixClient,
  generatePassphraseFromMnemonic,
  generatePasswordFromMnemonic,
  generateUsernameFromAddress,
  generateUserRoomAliasFromAddress,
  hasCrossSigningAccountData,
  loginOrRegisterMatrixAccount,
  logoutMatrixClient,
  setupCrossSigning,
} from '@utils/matrix';
import useSteps from '@hooks/useSteps';
import { delay } from '@utils/timestamp';

enum STEPS {
  loading = 0,
  mnemonic = 1,
  pin = 2,
  email = 3,
}

const STEPS_STATE = [STEPS.loading, STEPS.mnemonic, STEPS.pin, STEPS.email];

interface LoginWithMnemonicProps {
  onClose: () => void;
  onLogin: (response: { wallet: SecpClient; address: string; did: string; credentialId: string }) => void;
}

export default function LoginWithMnemonic({ onClose, onLogin }: LoginWithMnemonicProps) {
  const { step, reset, goTo } = useSteps(STEPS_STATE, STEPS.mnemonic);
  const [mnemonic, setMnemonic] = useState('');
  const [wordCount, setWordCount] = useState<12 | 15 | 18 | 24>(12);
  const [words, setWords] = useState<string[]>(Array(12).fill(''));
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedWordIndex, setFocusedWordIndex] = useState<number | null>(null);

  const handlerRef = useRef<{
    resolve?: (value: any) => void;
    reject?: (reason: any) => void;
  }>({});
  const addressRef = useRef<string | undefined>(undefined);
  const encryptedMnemonicRef = useRef<string | undefined>(undefined);

  const stepIsLoading = step === STEPS.loading;
  const stepIsMnemonic = step === STEPS.mnemonic;
  const stepIsPin = step === STEPS.pin;
  const stepIsEmail = step === STEPS.email;

  function normalizeToWords(value: string, count: number) {
    const arr = value.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean).slice(0, count);
    const padded = [...arr, ...Array(Math.max(0, count - arr.length)).fill('')];
    return padded.slice(0, count);
  }

  function syncMnemonicFromWords(nextWords: string[]) {
    const nextMnemonic = nextWords.join(' ').trim();
    setMnemonic(nextMnemonic);
  }

  function handleGenerateMnemonic() {
    const newMnemonic = utils.mnemonic.generateMnemonic(wordCount);
    const newWords = normalizeToWords(newMnemonic, wordCount);
    setWords(newWords);
    setMnemonic(newMnemonic);
    navigator.clipboard.writeText(newMnemonic);
  }

  function handleWordChange(idx: number, value: string) {
    const cleaned = value.toLowerCase().replace(/[^a-z]/g, '');
    const next = words.slice();
    next[idx] = cleaned;
    setWords(next);
    syncMnemonicFromWords(next);
  }

  function handleWordCountChange(nextCount: 12 | 15 | 18 | 24) {
    setWordCount(nextCount);
    const nextWords = normalizeToWords(mnemonic, nextCount);
    setWords(nextWords);
    syncMnemonicFromWords(nextWords);
  }

  async function requestEmail(address: string) {
    addressRef.current = address;
    return new Promise(function (resolve, reject) {
      handlerRef.current = {
        resolve: function (value: any) {
          resolve(value);
          handlerRef.current = {};
        },
        reject: function (reason: any) {
          reject(reason);
          handlerRef.current = {};
        },
      };
      addressRef.current = address;
      goTo(STEPS.email);
    });
  }

  async function requestPin(encryptedMnemonic?: string) {
    encryptedMnemonicRef.current = undefined;
    return new Promise(function (resolve, reject) {
      handlerRef.current = {
        resolve: function (value: any) {
          resolve(value);
          handlerRef.current = {};
        },
        reject: function (reason: any) {
          reject(reason);
          handlerRef.current = {};
        },
      };
      encryptedMnemonicRef.current = encryptedMnemonic;
      goTo(STEPS.pin);
    });
  }

  async function handleLogin() {
    goTo(STEPS.loading);
    setError(null);
    try {
      if (!mnemonic) {
        throw new Error('Please enter your mnemonic phrase');
      }
      // Create wallet from mnemonic (kept only in state)
      const wallet = await getSecpClient(mnemonic);
      const address = wallet.baseAccount.address;
      const did = utils.did.generateSecpDid(address);
      const didExists = await checkIidDocumentExists(did);
      if (!didExists) {
        // Feegrant via email OTP
        const feegrant = await checkAddressFeegrant(address);
        if (!feegrant) {
          (await requestEmail(address)) as string;
          goTo(STEPS.loading);
          const feegrant2 = await checkAddressFeegrant(address);
          if (!feegrant2) {
            throw new Error('Failed to grant feegrant, please try again.');
          }
        }

        // DID create
        await createIidDocument(did, wallet as unknown as OfflineSigner);
        await delay(500);
        const didExists2 = await checkIidDocumentExists(did);
        if (!didExists2) {
          throw new Error('Failed to create did, please try again.');
        }
      }

      // MATRIX
      const mxUsername = generateUsernameFromAddress(address);
      const isUsernameAvailable = await checkIsUsernameAvailable({
        homeServerUrl: process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL as string,
        username: mxUsername,
      });
      let homeServerUrl = process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL as string;
      let mxMnemonicSource: 'decrypted' | 'generated' = 'generated';
      let mxMnemonic = utils.mnemonic.generateMnemonic(12);
      let mxPassword = generatePasswordFromMnemonic(mxMnemonic);
      let mxPassphrase = generatePassphraseFromMnemonic(mxMnemonic);
      let mxRoomAlias: string = generateUserRoomAliasFromAddress(address, homeServerUrl);
      let mxRoomId: string = '';

      let pin: string = '';
      if (!isUsernameAvailable) {
        const timestamp = new Date().toISOString();
        const challenge = Buffer.from(timestamp).toString('base64');
        const signature = await wallet.sign(challenge);
        const response = await fetch('/api/auth/get-secret-secp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: wallet.baseAccount.address,
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
        } else {
          const { encryptedMnemonic, roomId } = await response.json();
          pin = (await requestPin(encryptedMnemonic)) as string;
          // show loader immediately after PIN provided
          goTo(STEPS.loading);
          mxMnemonic = decrypt(encryptedMnemonic, pin);
          if (!mxMnemonic) {
            throw new Error('Failed to decrypt mnemonic - incorrect pin');
          }
          mxMnemonicSource = 'decrypted';
          mxPassword = generatePasswordFromMnemonic(mxMnemonic);
          mxPassphrase = generatePassphraseFromMnemonic(mxMnemonic);
          mxRoomId = roomId;
        }
      }
      if (!pin) {
        pin = (await requestPin()) as string;
        // show loader immediately after PIN provided
        goTo(STEPS.loading);
      }

      await logoutMatrixClient({ baseUrl: homeServerUrl });
      const account = await loginOrRegisterMatrixAccount({
        homeServerUrl: homeServerUrl,
        username: mxUsername,
        password: mxPassword,
        wallet: wallet,
      });
      if (!account?.accessToken) {
        throw new Error('Failed to login or register matrix account, please try again.');
      }
      const mxClient = await createMatrixClient();
      const matrixApiClient = createMatrixApiClient({
        homeServerUrl: homeServerUrl,
        accessToken: account.accessToken as string,
      });
      if (mxMnemonicSource === 'generated') {
        let hasCrossSigning = hasCrossSigningAccountData(mxClient);
        if (!hasCrossSigning) {
          hasCrossSigning = await setupCrossSigning(mxClient, {
            securityPhrase: mxPassphrase,
            password: mxPassword,
            forceReset: true,
          });
          if (!hasCrossSigning) {
            throw new Error('Failed to setup cross signing, please try again.');
          }
        }
        const queryIdResponse = await matrixApiClient.room.v1beta1.queryId(mxRoomAlias).catch(() => undefined);
        mxRoomId = queryIdResponse?.room_id ?? '';
        if (!mxRoomId) {
          const response = await fetch(`${process.env.NEXT_PUBLIC_MATRIX_ROOM_BOT_URL}/room/source`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ did: did, userMatrixId: account.userId }),
          });
          if (!response.ok) {
            throw new Error('Failed to create matrix room.');
          }
          const data = await response.json();
          mxRoomId = data.roomId;
          if (!mxRoomId) {
            throw new Error('Failed to create user matrix room.');
          }
        }
        let joinedMembers = await matrixApiClient.room.v1beta1.listJoinedMembers(mxRoomId).catch(() => undefined);
        let joined = !!joinedMembers?.joined?.[account.userId];
        if (!joined) {
          const joinResponse = await matrixApiClient.room.v1beta1.join(mxRoomId);
          if (!joinResponse.room_id) {
            throw new Error('Failed to join matrix room.');
          }
          joinedMembers = await matrixApiClient.room.v1beta1.listJoinedMembers(mxRoomId);
          joined = !!joinedMembers?.joined?.[account.userId];
          if (!joined) {
            throw new Error('Failed to join matrix room.');
          }
        }
        const encryptedMnemonic = encrypt(mxMnemonic, pin);
        const storeEncryptedMnemonicResponse = await fetch(
          `${homeServerUrl}/_matrix/client/r0/rooms/${mxRoomId}/state/ixo.room.state.secure/encrypted_mnemonic`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${account.accessToken as string}`,
            },
            body: JSON.stringify({ encrypted_mnemonic: encryptedMnemonic }),
          },
        );
        if (!storeEncryptedMnemonicResponse.ok) {
          throw new Error('Failed to store encrypted mnemonic in matrix room.');
        }
        await storeEncryptedMnemonicResponse.json();
      }

      onLogin({
        wallet,
        credentialId: 'secp256k1',
        did,
        address,
        // @ts-ignore - enrich payload for initializer to forward matrix details
        matrix: {
          accessToken: account.accessToken as string,
          address,
          userId: account.userId,
          roomId: mxRoomId,
        },
      });
      // Clear mnemonic from state
      setMnemonic('');
      setWords(Array(wordCount).fill(''));
      // onClose();
    } catch (err: any) {
      console.error('Login error:', err);
      setError((typeof err === 'string' ? err : err.message) || 'Failed to login. Please try again.');
    } finally {
      goTo(STEPS.mnemonic);
    }
  }

  function handleEmailSuccess() {
    try {
      handlerRef.current?.resolve?.(true);
    } catch (error) {
      setError('Something went wrong. Please try again.');
      reset();
    }
  }

  function handleEmailError(error: string) {
    try {
      handlerRef.current?.reject?.(error);
    } catch (error) {
      setError('Something went wrong. Please try again.');
      reset();
    }
  }

  function handlePinSuccess(pin: string) {
    try {
      handlerRef.current?.resolve?.(pin);
    } catch (error) {
      setError('Something went wrong. Please try again.');
      reset();
    }
  }

  function handlePinError(error: string) {
    try {
      handlerRef.current?.reject?.(error);
    } catch (error) {
      setError('Something went wrong. Please try again.');
      reset();
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      {stepIsLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          {/* @ts-ignore */}
          <Loader />
          <p style={{ marginTop: '16px' }}>Setting up your account...</p>
        </div>
      ) : stepIsMnemonic ? (
        <>
          <p>Enter your mnemonic phrase to login or generate a new mnemonic</p>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[12, 15, 18, 21, 24].map((cnt) => (
                <button
                  key={cnt}
                  type='button'
                  onClick={() => handleWordCountChange(cnt as 12 | 15 | 18 | 24)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: cnt === wordCount ? '1px solid var(--primary-color)' : '1px solid #ced4da',
                    background: cnt === wordCount ? 'var(--primary-color)' : 'white',
                    color: cnt === wordCount ? 'white' : 'var(--text-color)',
                    cursor: 'pointer',
                  }}
                >
                  {cnt}
                </button>
              ))}

              <button
                type='button'
                onClick={handleGenerateMnemonic}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #ced4da',
                  background: 'white',
                  marginLeft: 'auto',
                }}
              >
                Generate
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 12,
              }}
            >
              {Array.from({ length: wordCount }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 14, fontSize: 12, color: '#6c757d' }}>{i + 1}.</span>
                  <input
                    type={showMnemonic ? 'text' : 'password'}
                    value={words[i] || ''}
                    onChange={(e) => handleWordChange(i, e.target.value)}
                    onFocus={() => ((window as any)._mnemonicFocusedIndex = i)}
                    onBlur={() => ((window as any)._mnemonicFocusedIndex = null)}
                    placeholder={`word ${i + 1}`}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #ced4da',
                      borderRadius: 6,
                      fontSize: 14,
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <small style={{ color: '#6c757d' }}>Enter each word in order</small>

              <button
                type='button'
                onClick={() => setShowMnemonic(!showMnemonic)}
                style={{
                  marginLeft: 'auto',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #ced4da',
                  background: 'white',
                }}
              >
                {showMnemonic ? 'Hide' : 'Show'}
              </button>
            </div>

            <p style={{ fontSize: '12px' }}>
              <span style={{ color: 'var(--warning-color)', fontWeight: 500 }}>Warning:</span> Your mnemonic is the only
              way to access your account and should be stored somewhere safe (do not share it with anyone).
            </p>
          </div>

          {error && <p style={{ color: 'red', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div />
            {/* @ts-ignore */}
            <Button
              label={'Next'}
              onClick={handleLogin}
              disabled={stepIsLoading}
              color={BUTTON_COLOR.white}
              size={BUTTON_SIZE.mediumLarge}
              bgColor={BUTTON_BG_COLOR.primary}
            />
          </div>
        </>
      ) : stepIsEmail ? (
        // @ts-ignore
        <EmailFeegrantForm
          address={addressRef.current as string}
          onSuccess={handleEmailSuccess}
          onError={handleEmailError}
        />
      ) : stepIsPin ? (
        // @ts-ignore
        <MatrixPinForm
          encryptedMnemonic={encryptedMnemonicRef.current}
          onSuccess={handlePinSuccess}
          onError={handlePinError}
        />
      ) : null}
    </div>
  );
}
