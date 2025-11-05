import { fromHex, toHex } from '@cosmjs/encoding';
import { createRegistry, createSigningClient } from '@ixo//impactxclient-sdk';
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
import config from '@constants/config.json';
import { SIGN_X_RELAYERS } from '@constants/urls';
import { CHAIN_ID, CHAIN_NETWORK, CHAIN_RPC_URL } from '@constants/chains';
import LoginWithMnemonic from '@components/Auth/LoginWithMnemonic';
import { AccountData, OfflineSigner } from '@cosmjs/proto-signing';
import { assertIsDeliverTxSuccess, DeliverTxResponse, StdFee } from '@cosmjs/stargate';
import { delay } from './timestamp';
import Button, { BUTTON_BG_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';

type SigningClient = Awaited<ReturnType<typeof createSigningClient>>;
let signingClient: undefined | SigningClient;
export const hasMnemonicSigningClient = () => !!signingClient;

// Continuous approval flag for batch flows
// Class-based continuous approval session
export interface MnemonicApprovalSession {
  sign: (msgs: TRX_MSG[], memo: string | undefined, wallet: WALLET) => Promise<string | null>;
  stop: () => void;
  isContinuous: () => boolean;
}

export const createMnemonicApprovalSession = (): MnemonicApprovalSession => {
  let continuous = false;
  let stopped = false;

  return {
    isContinuous: () => continuous,
    stop: () => {
      continuous = false;
      stopped = true;
    },
    sign: async (msgs: TRX_MSG[], memo: string | undefined, wallet: WALLET) => {
      if (stopped) throw new Error('Session stopped');
      return await mnemonicBroadCastMessageInternal(msgs, memo ?? '', wallet, {
        onApproveAll: () => {
          continuous = true;
        },
        shouldSkipApproval: () => continuous,
        onAnyError: () => {
          continuous = false;
        },
      });
    },
  };
};

let mnemonicInitializing = false;
export const initializeMnemonic = async (walletUser?: USER): Promise<USER | undefined> => {
  if (mnemonicInitializing) {
    console.log('Mnemonic already initializing');
    return;
  }
  mnemonicInitializing = true;

  let removeModal: () => void;
  try {
    // if user already has an address or pubkey, return
    if (walletUser?.address || walletUser?.pubKey) {
      const account = await (signingClient as SigningClient)?.getAccount(walletUser.address);
      return walletUser;
    }

    // callback for when modal is closed manually
    const onManualCloseModalFactory = (reject: (reason?: any) => void) => () => {
      signingClient = undefined;
      reject(new Error('Login cancelled'));
    };

    // Wait for the mnemonic login component to finish and return details
    const result: any = await new Promise((resolve, reject) => {
      // Render the modal and pass resolve/reject via callbacks
      removeModal = renderModal(
        <LoginWithMnemonic onClose={() => reject(new Error('Login cancelled'))} onLogin={(data) => resolve(data)} />,
        onManualCloseModalFactory(reject),
        'Mnemonic',
      );
    });

    // Initialize signing client from the ephemeral offline signer, then drop wallet reference
    try {
      signingClient = await createSigningClient(CHAIN_RPC_URL, result?.wallet as unknown as OfflineSigner);
    } catch (e) {
      console.error('Failed to initialize signing client:', e);
      throw e;
    } finally {
      // Ensure mnemonic/offline signer is not retained beyond this point
      try {
        if (result && 'wallet' in result) {
          result.wallet = undefined;
        }
      } catch {}
    }

    // Build USER from result and include matrix details from login
    return {
      name: result?.address,
      address: result?.address,
      pubKey: result?.wallet?.baseAccount?.pubkey,
      did: result?.did,
      algo: 'secp256k1',
      chainId: CHAIN_ID,
      matrix: result?.matrix,
    } as USER;
  } catch (e) {
    console.error('ERROR::initializeMnemonic::', e);
    const event = new Event(EVENT_LISTENER_TYPE.wallet_logout);
    window.dispatchEvent(event);
  } finally {
    mnemonicInitializing = false;
    // @ts-ignore
    if (removeModal) removeModal();
    // remove event listeners
    // signXClient?.removeAllListeners?.(SIGN_X_LOGIN_ERROR);
    // signXClient?.removeAllListeners?.(SIGN_X_LOGIN_SUCCESS);
  }
};

let mnemonicBroadCastMessageBusy = false;
export const mnemonicBroadCastMessage = async (msgs: TRX_MSG[], memo = '', wallet: WALLET): Promise<string | null> => {
  return mnemonicBroadCastMessageInternal(msgs, memo, wallet);
};

type InternalOptions = {
  // If returns true, skip showing approval modal
  shouldSkipApproval?: () => boolean;
  // Called when user selects "Approve all transactions"
  onApproveAll?: () => void;
  // Called on any error to reset external flags
  onAnyError?: () => void;
};

const mnemonicBroadCastMessageInternal = async (
  msgs: TRX_MSG[],
  memo = '',
  wallet: WALLET,
  internalOptions?: InternalOptions,
): Promise<string | null> => {
  if (mnemonicBroadCastMessageBusy) return null;
  mnemonicBroadCastMessageBusy = true;

  let removeModal: () => void;

  const ApproveContent = ({
    onApprove,
    onReject,
    onApproveAll,
    showApproveAll,
  }: {
    onApprove: () => void;
    onReject: () => void;
    onApproveAll?: () => void;
    showApproveAll?: boolean;
  }) => (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <h3>Approve Transaction</h3>
      <p>Please confirm you want to sign and broadcast this transaction.</p>
      {showApproveAll && (
        <p style={{ fontSize: 12, color: '#6c757d' }}>
          Enabling continuous signing will sign subsequent transactions in this session without additional approval. You
          can stop it anytime by rejecting a transaction or if an error occurs.
        </p>
      )}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
        {/** Reject */}
        {
          // @ts-ignore
        }
        <Button
          label={'Reject'}
          onClick={onReject}
          size={BUTTON_SIZE.medium}
          bgColor={BUTTON_BG_COLOR.lightGrey}
          color={BUTTON_COLOR.primary}
        />
        {showApproveAll && (
          // @ts-ignore
          <Button
            label={'Approve all transactions'}
            onClick={onApproveAll}
            size={BUTTON_SIZE.medium}
            bgColor={BUTTON_BG_COLOR.white}
            color={BUTTON_COLOR.primary}
          />
        )}
        {/** Approve */}
        {
          // @ts-ignore
        }
        <Button
          label={'Approve'}
          onClick={onApprove}
          size={BUTTON_SIZE.medium}
          bgColor={BUTTON_BG_COLOR.primary}
          color={BUTTON_COLOR.white}
        />
      </div>
    </div>
  );

  const LoaderContent = ({ message }: { message: string }) => (
    <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
      <p>{message}</p>
    </div>
  );

  try {
    if (!wallet.user) throw new Error('No user found to broadcast transaction');
    if (!signingClient) throw new Error('Mnemonic signing client not initialized');

    // Skip modal if external controller indicates so
    if (!(internalOptions?.shouldSkipApproval && internalOptions?.shouldSkipApproval())) {
      const approved: 'approve' | 'approveAll' | 'reject' = await new Promise((resolve) => {
        const onApprove = () => resolve('approve');
        const onReject = () => resolve('reject');
        const onApproveAll = () => resolve('approveAll');
        // @ts-ignore
        removeModal = renderModal(
          // @ts-ignore
          <ApproveContent
            onApprove={onApprove}
            onReject={onReject}
            onApproveAll={onApproveAll}
            showApproveAll={!!internalOptions?.onApproveAll}
          />,
          () => resolve('reject'),
          'Mnemonic Transaction',
        );
      });

      if (approved === 'reject') {
        // @ts-ignore
        if (removeModal) removeModal();
        internalOptions?.onAnyError?.();
        throw new Error('User rejected');
      }
      if (approved === 'approveAll' && internalOptions?.onApproveAll) {
        internalOptions.onApproveAll();
      }
      // @ts-ignore
      if (removeModal) removeModal();
    }

    // proceed to loader

    // Show loader
    // @ts-ignore
    if (removeModal) removeModal();
    removeModal = renderModal(
      // @ts-ignore
      <LoaderContent message={'Signing and broadcasting transaction...'} />,
      () => void 0,
      'Processing',
    );

    const fromAddress = wallet.user.address;
    const simGas = await signingClient.simulate(fromAddress, msgs as any, memo);
    const gasUsed = simGas > 50000 ? simGas : (msgs ?? []).length * 500000;
    const gas = gasUsed * 1.7;
    const gasOptions = calculateTrxGasOptions(gas);
    const stdFee: StdFee = {
      amount: [{ denom: 'uixo', amount: String(Math.round(gasOptions.average)) }],
      gas: String(Math.round(gas)),
    } as any;

    const result = await signingClient.signAndBroadcast(fromAddress, msgs as any, stdFee, memo, undefined);
    // @ts-ignore
    if (removeModal) removeModal();
    return (result as any)?.transactionHash ?? null;
  } catch (e) {
    console.error('ERROR::mnemonicBroadCastMessage::', e);
    // @ts-ignore
    if (removeModal) removeModal();
    Toast.errorToast(`Transaction Failed`);
    internalOptions?.onAnyError?.();
    return null;
  } finally {
    mnemonicBroadCastMessageBusy = false;
  }
};

const calculateTrxGasOptions = (gasUsed: number) => {
  const gasPriceStep = {
    low: 0.02,
    average: 0.035,
    high: 0.045,
  };
  const gas = gasUsed < 0.01 ? 0.01 : gasUsed;
  const gasOptions = {
    low: gas * gasPriceStep.low,
    average: gas * gasPriceStep.average,
    high: gas * gasPriceStep.high,
  };

  return gasOptions;
};
/**
 * Signs and broadcasts a transaction with a mnemonic
 * @param offlineSigner - The offline signer
 * @param messages - The messages to sign and broadcast
 * @param memo - The memo for the transaction
 * @param feegrantGranter - The granter for the transaction
 * @returns The deliver tx response
 */
export const signAndBroadcastWithMnemonic = async ({
  offlineSigner,
  messages,
  memo = 'Signing with Mnemonic Demo',
  feegrantGranter,
}: {
  offlineSigner: OfflineSigner;
  messages: any[];
  memo?: string;
  feegrantGranter?: string;
}): Promise<DeliverTxResponse> => {
  const signingClient = await createSigningClient(CHAIN_RPC_URL, offlineSigner);
  const accounts = await offlineSigner.getAccounts();
  const { address } = (accounts[0] ?? {}) as AccountData;

  const simGas = await signingClient.simulate(address, messages, memo);
  const gasUsed = simGas > 50000 ? simGas : (messages ?? []).length * 500000;
  const gas = gasUsed * 1.7;
  const gasOptions = calculateTrxGasOptions(gas);
  const fee: StdFee = {
    amount: [
      {
        denom: 'uixo',
        amount: String(Math.round(gasOptions.average)),
      },
    ],
    gas: String(Math.round(gas)),
    granter: feegrantGranter,
  };
  const result = await signingClient.signAndBroadcast(address, messages, fee, memo, undefined);
  assertIsDeliverTxSuccess(result);
  return result;
};
