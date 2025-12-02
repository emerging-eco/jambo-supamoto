import type { AppProps } from 'next/app';
import 'react-toastify/dist/ReactToastify.css';

import '@styles/globals.scss';
import '@styles/variables.scss';
// import '@styles/survey.scss';
import { ToastContainer } from '@components/Toast/Toast';
import { WalletProvider } from '@contexts/wallet';
import { ChainProvider } from '@contexts/chain';
import { ThemeProvider } from '@contexts/theme';
// Import signX and mnemonic to ensure window._signX and window._mnemonic are initialized
import '@utils/signX';
import '@utils/mnemonic';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <ChainProvider>
        <WalletProvider>
          <ToastContainer />
          <Component {...pageProps} />
        </WalletProvider>
      </ChainProvider>
    </ThemeProvider>
  );
}

export default MyApp;
