import { fromHex, toHex } from '@cosmjs/encoding';
import { createRegistry } from '@ixo//impactxclient-sdk';
import {
  SignX,
  SIGN_X_LOGIN_ERROR,
  SIGN_X_LOGIN_SUCCESS,
  SIGN_X_TRANSACT_ERROR,
  SIGN_X_TRANSACT_SUCCESS,
} from '@ixo/signx-sdk';

import * as Toast from '@components/Toast/Toast';
import { TRX_FEE_OPTION, TRX_MSG } from 'types/transactions';
import { USER } from 'types/user';
import { WALLET } from 'types/wallet';
import { renderModal } from '@components/Modal/Modal';
import SignXModal from '@components/SignX/SignX';
import { EVENT_LISTENER_TYPE } from '@constants/events';
import { KEPLR_CHAIN_INFO_TYPE } from 'types/chain';
import config from '@constants/config.json';
import { SIGN_X_RELAYERS } from '@constants/urls';

let signXClient: SignX | undefined;

let signXInitializing = false;
export const initializeSignX = async (
  chainInfo: KEPLR_CHAIN_INFO_TYPE,
  walletUser?: USER,
): Promise<USER | undefined> => {
  if (signXInitializing) return;
  signXInitializing = true;

  let removeModal: () => void;
  try {
    // Handle chain mismatch gracefully - clear stale wallet data and continue
    if (walletUser?.chainId && walletUser?.chainId !== chainInfo.chainId) {
      console.warn('Chain ID mismatch detected. Clearing stale wallet data.');
      // Dispatch logout event to clear stale data
      const event = new Event(EVENT_LISTENER_TYPE.wallet_logout);
      window.dispatchEvent(event);
      // Return undefined to allow re-initialization with correct chain
      return undefined;
    }
    if (!chainInfo || !chainInfo.chainId) throw new Error('No chain info found to initialize SignX');
    if (chainInfo.chainName !== 'ixo') throw new Error('SignX only works on ixo chain');

    signXClient = new SignX({
      endpoint: SIGN_X_RELAYERS[chainInfo.chainNetwork || 'mainnet'],
      // endpoint: 'http://localhost:8000',
      network: chainInfo.chainNetwork || 'mainnet',
      sitename: config.siteName ?? 'JAMBO dApp',
    });

    // if user already has an address or pubkey, return
    if (walletUser?.address || walletUser?.pubKey) return walletUser;

    // get login data from client to display QR code and start polling
    // matrix: true requests Matrix/Data Vault credentials from the mobile app
    const data = await signXClient!.login({ pollingInterval: 1000, matrix: true });

    // callback for when modal is closed manually
    const onManualCloseModal = () => {
      signXClient!.stopPolling('Login cancelled', SIGN_X_LOGIN_ERROR);
    };

    removeModal = renderModal(
      <SignXModal title='SignX Login' data={data} timeout={signXClient.timeout} transactSequence={1} />,
      onManualCloseModal,
    );

    const eventData: any = await new Promise((resolve, reject) => {
      const handleSuccess = (data: any) => resolve(data);
      const handleError = (error: any) => reject(error);
      signXClient!.on(SIGN_X_LOGIN_SUCCESS, handleSuccess);
      signXClient!.on(SIGN_X_LOGIN_ERROR, handleError);
    });
    // removeModal();

    // Extract matrix credentials from response payload
    const matrix = eventData.data.matrix;

    return {
      name: eventData.data.name,
      address: eventData.data.address,
      pubKey: fromHex(eventData.data.pubKey),
      did: eventData.data.did,
      algo: eventData.data.algo,
      chainId: chainInfo.chainId,
      matrix,
    };
  } catch (e) {
    console.error('ERROR::initializeSignX::', e);
    const event = new Event(EVENT_LISTENER_TYPE.wallet_logout);
    window.dispatchEvent(event);
  } finally {
    signXInitializing = false;
    // @ts-ignore
    if (removeModal) removeModal();
    // remove event listeners only if signXClient was initialized
    if (signXClient) {
      signXClient.removeAllListeners(SIGN_X_LOGIN_ERROR);
      signXClient.removeAllListeners(SIGN_X_LOGIN_SUCCESS);
    }
  }
};

let signXBroadCastMessageBusy = false;
export const signXBroadCastMessage = async (
  msgs: TRX_MSG[],
  memo = '',
  fee: TRX_FEE_OPTION,
  feeDenom: string,
  chainInfo: KEPLR_CHAIN_INFO_TYPE,
  wallet: WALLET,
): Promise<string | null> => {
  if (signXBroadCastMessageBusy) return null;
  signXBroadCastMessageBusy = true;

  let removeModal: () => void;
  // callback for when modal is closed manually
  let onManualCloseModal = (clearSession = true) => {
    signXClient!.stopPolling('Transaction cancelled', SIGN_X_TRANSACT_ERROR, clearSession);
  };

  try {
    if (!chainInfo || !chainInfo.chainId) throw new Error('No chain info found');
    if (chainInfo.chainName !== 'ixo') throw new Error('SignX only works on ixo chain');

    if (!wallet.user) throw new Error('No user found to broadcast transaction');
    if (!signXClient) throw new Error('No signXClient found to broadcast transaction');

    const registry = createRegistry();
    const txBody = toHex(registry.encodeTxBody({ messages: msgs as any, memo }));

    // get transact data from client to start polling, display QR code if new session
    const data = await signXClient!.transact({
      address: wallet.user.address,
      did: wallet.user.did!,
      pubkey: toHex(wallet.user.pubKey),
      timestamp: new Date().toISOString(),
      transactions: [{ sequence: 1, txBodyHex: txBody }],
    });

    // if already active session(aka no sessionHash), start polling for next transaction that was just added
    if (!data?.sessionHash) {
      signXClient!.pollNextTransaction();
    }

    removeModal = renderModal(
      <SignXModal
        title='SignX Transaction'
        data={data}
        timeout={signXClient!.timeout}
        transactSequence={signXClient!.transactSequence}
      />,
      onManualCloseModal,
    );

    // wait for transaction to be broadcasted and SignX to emit success or fail event
    const eventData: any = await new Promise((resolve, reject) => {
      const handleSuccess = (data: any) => resolve(data);
      const handleError = (error: any) => reject(error);
      signXClient!.on(SIGN_X_TRANSACT_SUCCESS, handleSuccess);
      signXClient!.on(SIGN_X_TRANSACT_ERROR, handleError);
    });

    return eventData.data?.transactionHash;
  } catch (e) {
    console.error('ERROR::signXBroadCastMessage::', e);
    Toast.errorToast(`Transaction Failed`);
    return null;
  } finally {
    signXBroadCastMessageBusy = false;
    // @ts-ignore
    if (removeModal) removeModal();
    // @ts-ignore
    if (onManualCloseModal) onManualCloseModal(false);
    // remove event listeners only if signXClient exists
    if (signXClient) {
      signXClient.removeAllListeners(SIGN_X_TRANSACT_ERROR);
      signXClient.removeAllListeners(SIGN_X_TRANSACT_SUCCESS);
    }
  }
};
