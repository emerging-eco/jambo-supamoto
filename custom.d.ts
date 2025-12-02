declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

import { Window as KeplrWindow } from '@keplr-wallet/types';
import { OperaInterchain } from '@utils/opera';
import { USER } from 'types/user';
import { WALLET } from 'types/wallet';
import { TRX_MSG } from 'types/transactions';

declare global {
  interface Window extends KeplrWindow {}
  interface Window extends OperaInterchain {}
  interface Window {
    _mnemonic?: {
      initializeMnemonic: (walletUser?: USER) => Promise<USER | undefined>;
      mnemonicBroadCastMessage: (msgs: TRX_MSG[], memo: string, wallet: WALLET) => Promise<string | null>;
    };
    _signX?: {
      initializeSignX: (walletUser?: USER) => Promise<USER | undefined>;
      signXBroadCastMessage: (msgs: TRX_MSG[], memo: string, wallet: WALLET) => Promise<string | null>;
    };
  }
}
