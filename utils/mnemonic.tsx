import { createSigningClient } from '@ixo/impactxclient-sdk';

import { TRX_MSG } from 'types/transactions';
import { USER } from 'types/user';
import { WALLET } from 'types/wallet';
import { EVENT_LISTENER_TYPE } from '@constants/events';
import { CHAIN_ID, CHAIN_NETWORK, MATRIX_HOMESERVER_URL, IXO_BLOCKCHAIN_RPC_URL } from '@constants/env';
import { renderModal } from '@components/Modal/Modal';
import MnemonicInputModal from '@components/MnemonicInputModal/MnemonicInputModal';
import MnemonicTransactionModal from '@components/MnemonicTransactionModal/MnemonicTransactionModal';
import { sendTransaction } from '@utils/client';
import { defaultTrxFeeOption } from '@utils/transactions';

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

// Multi-transaction signing state management
let multiTrxActive = false;
let lastMultiTrxTimestamp = 0;
let multiTrxAutoApprove = false;

const MULTI_TRX_SESSION_TIMEOUT = 60 * 1000; // 1 minute in milliseconds

export const mnemonicBroadCastMessage = async (msgs: TRX_MSG[], memo = '', wallet: WALLET): Promise<string | null> => {
  if (mnemonicBroadCastMessageBusy) return null;
  mnemonicBroadCastMessageBusy = true;

  let removeModal: () => void;
  let transactionResolve: (value: string) => void;
  let transactionReject: (error: Error) => void;

  // Multi-transaction session management - always enabled for mnemonic transactions
  const currentTime = Date.now();
  let shouldAutoApprove = false;

  // Check if session is still valid (within 1 minute of last transaction)
  const sessionExpired = lastMultiTrxTimestamp > 0 && currentTime - lastMultiTrxTimestamp > MULTI_TRX_SESSION_TIMEOUT;

  if (sessionExpired || !multiTrxActive) {
    // Start new session
    multiTrxActive = true;
    multiTrxAutoApprove = false;
    lastMultiTrxTimestamp = currentTime;
  } else {
    // Continue existing session
    lastMultiTrxTimestamp = currentTime;
    shouldAutoApprove = multiTrxAutoApprove;
  }

  // callback for when modal is closed manually (decline)
  const onManualCloseModal = () => {
    // Reset auto-approve on manual close during multi-transaction session
    multiTrxAutoApprove = false;
    if (transactionReject) {
      transactionReject(new Error('Transaction cancelled'));
    }
  };

  try {
    if (!CHAIN_ID || !CHAIN_NETWORK) throw new Error('No chain info found to broadcast transaction');

    if (!wallet.user) throw new Error('No user found to broadcast transaction');
    if (!mnemonicClient) throw new Error('No mnemonicClient found to broadcast transaction');

    // Create a promise that waits for user approval or decline
    const transactionPromise = new Promise<string>((resolve, reject) => {
      transactionResolve = resolve;
      transactionReject = reject;

      const handleApprove = async (): Promise<string> => {
        // Create SigningStargateClient from mnemonic client (secp client with signDirect method)
        const signingClient = await createSigningClient(IXO_BLOCKCHAIN_RPC_URL as string, mnemonicClient as any);

        // Broadcast transaction
        const result = await sendTransaction(signingClient, wallet.user!.address, {
          msgs,
          chain_id: CHAIN_ID,
          memo,
          fee: defaultTrxFeeOption,
          feeDenom: 'uixo',
        });

        if (!result || !result.transactionHash) {
          throw new Error('Transaction failed - no transaction hash returned');
        }

        // Update last transaction timestamp on success
        lastMultiTrxTimestamp = Date.now();

        return result.transactionHash;
      };

      const handleDecline = () => {
        // Reset auto-approve on decline during multi-transaction session
        multiTrxAutoApprove = false;
        reject(new Error('Transaction rejected'));
      };

      const handleComplete = (transactionHash: string) => {
        resolve(transactionHash);
      };

      const handleError = (error: Error) => {
        // Reset auto-approve on error during multi-transaction session
        multiTrxAutoApprove = false;
        reject(error);
      };

      const handleApproveAll = () => {
        // Enable auto-approve for subsequent transactions
        multiTrxAutoApprove = true;
      };

      const handleStopAutoApprove = () => {
        // Stop auto-approve but don't reject - show normal buttons
        multiTrxAutoApprove = false;
      };

      removeModal = renderModal(
        <MnemonicTransactionModal
          msgs={msgs}
          memo={memo}
          onApprove={handleApprove}
          onDecline={handleDecline}
          onComplete={handleComplete}
          onError={handleError}
          isMultiTrxActive={multiTrxActive && shouldAutoApprove}
          onApproveAll={handleApproveAll}
          onStopAutoApprove={handleStopAutoApprove}
        />,
        onManualCloseModal,
        'Mnemonic Transaction',
      );
    });

    const transactionHash = await transactionPromise;
    return transactionHash;
  } catch (e) {
    console.error('ERROR::mnemonicBroadCastMessage::', e);
    // Reset auto-approve on error
    multiTrxAutoApprove = false;
    throw e;
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
