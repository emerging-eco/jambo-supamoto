import { createSigningClient } from '@ixo/impactxclient-sdk';

import { TRX_MSG } from 'types/transactions';
import { USER } from 'types/user';
import { WALLET } from 'types/wallet';
import { EVENT_LISTENER_TYPE } from '@constants/events';
import { CHAIN_ID, CHAIN_NETWORK, MATRIX_HOMESERVER_URL } from '@constants/env';
import { renderModal } from '@components/Modal/Modal';
import MnemonicInputModal from '@components/MnemonicInputModal/MnemonicInputModal';

type SigningClient = Awaited<ReturnType<typeof createSigningClient>>;
let mnemonicClient: SigningClient;

let mnemonicInitializing = false;

export const initializeMnemonic = async (walletUser?: USER): Promise<USER | undefined> => {
  if (mnemonicInitializing) return;
  mnemonicInitializing = true;

  let removeModal: () => void;
  try {
    if (!CHAIN_ID || !CHAIN_NETWORK) throw new Error('No chain info found to initialize mnemonic wallet');

    // if user already has an address or pubkey, return
    if (walletUser?.address || walletUser?.pubKey) return walletUser;

    // Create a promise that waits for onLogin to be called
    const loginData = await new Promise<{
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
    }>((resolve, reject) => {
      // Callback for when modal is closed manually
      const onManualCloseModal = () => {
        mnemonicInitializing = false;
        reject(new Error('Login cancelled'));
      };

      const onLogin = (data: {
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
      }) => {
        resolve(data);
      };

      removeModal = renderModal(
        <MnemonicInputModal onClose={onManualCloseModal} onLogin={onLogin} />,
        onManualCloseModal,
        'Mnemonic',
      );
    });

    // Extract pubKey from wallet
    const accounts = await loginData.wallet.getAccounts();
    const pubKey = accounts[0]?.pubkey;

    if (!pubKey) {
      throw new Error('Failed to get public key from wallet');
    }
    mnemonicClient = loginData.wallet;

    return {
      name: loginData.did, // Use did as the name
      address: loginData.address,
      pubKey: pubKey,
      did: loginData.did,
      algo: loginData.credentialId,
      chainId: CHAIN_ID,
      matrix: {
        accessToken: loginData.matrix.accessToken,
        userId: loginData.matrix.userId,
        deviceId: loginData.matrix.deviceId,
        baseUrl: MATRIX_HOMESERVER_URL,
      },
    };
  } catch (e) {
    console.error('ERROR::initializeMnemonic::', e);
    const event = new Event(EVENT_LISTENER_TYPE.wallet_logout);
    window.dispatchEvent(event);
    return undefined;
  } finally {
    mnemonicInitializing = false;
    // @ts-ignore
    if (removeModal) {
      removeModal();
    }
  }
};

let mnemonicBroadCastMessageBusy = false;
export const mnemonicBroadCastMessage = async (msgs: TRX_MSG[], memo = '', wallet: WALLET): Promise<string | null> => {
  if (mnemonicBroadCastMessageBusy) return null;
  mnemonicBroadCastMessageBusy = true;

  let removeModal: () => void;
  // callback for when modal is closed manually
  // let onManualCloseModal = (clearSession = true) => {
  //   signXClient.stopPolling('Transaction cancelled', SIGN_X_TRANSACT_ERROR, clearSession);
  // };

  try {
    if (!CHAIN_ID || !CHAIN_NETWORK) throw new Error('No chain info found to broadcast transaction');

    if (!wallet.user) throw new Error('No user found to broadcast transaction');

    throw new Error('Not implemented');
  } catch (e) {
    console.error('ERROR::mnemonicBroadCastMessage::', e);
    return null;
  } finally {
    mnemonicBroadCastMessageBusy = false;
    // @ts-ignore
    if (removeModal) {
      removeModal();
    }
  }
};

// Attach methods to window object to avoid require cycles
if (typeof window !== 'undefined') {
  if (!window._mnemonic) {
    window._mnemonic = {} as any;
  }
  if (window._mnemonic) {
    window._mnemonic.initializeMnemonic = initializeMnemonic;
    window._mnemonic.mnemonicBroadCastMessage = mnemonicBroadCastMessage;
  }
}
