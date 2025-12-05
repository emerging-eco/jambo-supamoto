import { useState } from 'react';
import type { NextPage } from 'next';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import Head from '@components/Head/Head';
import AmountAndDenom from '@components/AmountAndDenom/AmountAndDenom';
import Input from '@components/Input/Input';
import Loader from '@components/Loader/Loader';
import IconText from '@components/IconText/IconText';
import Success from '@icons/success.svg';
import SadFace from '@icons/sad_face.svg';
import useWalletContext from '@hooks/useWalletContext';
import { generateBankSendTrx } from '@utils/transactions';
import { getMicroAmount } from '@utils/encoding';
import { broadCastMessages, shortenAddress } from '@utils/wallets';
import config from '@constants/config.json';
import { toast } from 'react-toastify';
import { delay } from '@utils/timestamp';

const Test: NextPage = () => {
  const { wallet } = useWalletContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [successHash, setSuccessHash] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const handleTransaction = async (): Promise<void> => {
    if (!wallet.user) {
      setError('No wallet user found');
      return;
    }

    try {
      setLoading(true);
      setError(undefined);
      setSuccessHash(undefined);

      const userAddress = wallet.user.address;
      const amount = '0.1'; // 0.1 ixo
      const microAmount = getMicroAmount(amount, 6); // Convert to uixo (100000 uixo)

      // Create transaction message
      const msg = generateBankSendTrx({
        fromAddress: userAddress,
        toAddress: userAddress, // Send to self
        denom: 'uixo',
        amount: microAmount,
      });

      // Broadcast transaction
      const hash = await broadCastMessages(wallet, [msg], 'Trx 1');
      if (hash) {
        toast.success(`Transaction successful (${hash})`);
      } else {
        throw new Error('Transaction failed - no hash returned');
      }

      // Broadcast transaction
      const hash2 = await broadCastMessages(wallet, [msg], 'Trx 2');
      if (hash2) {
        toast.success(`Transaction successful (${hash2})`);
      } else {
        throw new Error('Transaction failed - no hash returned');
      }

      await delay(1000);

      // Broadcast transaction
      const hash3 = await broadCastMessages(wallet, [msg], 'Trx 3');
      if (hash3) {
        toast.success(`Transaction successful (${hash3})`);
      } else {
        throw new Error('Transaction failed - no hash returned');
      }

      const hash4 = await broadCastMessages(wallet, [msg], 'Trx 4');
      if (hash4) {
        toast.success(`Transaction successful (${hash4})`);
      } else {
        throw new Error('Transaction failed - no hash returned');
      }

      const hash5 = await broadCastMessages(wallet, [msg], 'Trx 5');
      if (hash5) {
        toast.success(`Transaction successful (${hash5})`);
      } else {
        throw new Error('Transaction failed - no hash returned');
      }

      await delay(2000);

      const hash6 = await broadCastMessages(wallet, [msg], 'Trx 6');
      if (hash6) {
        toast.success(`Transaction successful (${hash6})`);
      } else {
        throw new Error('Transaction failed - no hash returned');
      }

      setSuccessHash(hash);
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.user) {
    return (
      <>
        <Head title='Test Transaction' description='Test transaction page' />
        <Header />
        <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter)}>
          <IconText title='No Wallet' subTitle='Please connect your wallet first' Img={SadFace} imgSize={50} />
        </main>
        <Footer showAccountButton showActionsButton />
      </>
    );
  }

  const userAddress = wallet.user.address;
  const amount = 0.1;

  return (
    <>
      <Head title='Test Transaction' description='Test transaction page' />

      <Header />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter)}>
        <div className={utilsStyles.spacer3Flex} />

        {loading ? (
          <Loader />
        ) : successHash ? (
          <IconText
            title='Transaction Successful!'
            subTitle={`Transaction Hash: ${shortenAddress(successHash)}`}
            Img={Success}
            imgSize={50}
          />
        ) : error ? (
          <IconText title='Transaction Failed' subTitle={error} Img={SadFace} imgSize={50} />
        ) : (
          <form
            className={utilsStyles.columnAlignCenter}
            style={{ maxWidth: '400px', width: '100%' }}
            autoComplete='none'
          >
            <p className={utilsStyles.label}>I am sending</p>
            <AmountAndDenom amount={amount} denom='ixo' microUnits={0} />
            <br />
            <p className={utilsStyles.label}>from address:</p>
            <Input
              name='fromAddress'
              value={shortenAddress(userAddress)}
              align='center'
              disabled
              readOnly
              style={{ width: '100%', maxWidth: '400px' }}
            />
            <br />
            <p className={utilsStyles.label}>to address:</p>
            <Input
              name='toAddress'
              value={shortenAddress(userAddress)}
              align='center'
              disabled
              readOnly
              style={{ width: '100%', maxWidth: '400px' }}
            />
            <br />
            <p className={utilsStyles.label}>memo:</p>
            <Input
              name='memo'
              value='Test transaction'
              align='center'
              disabled
              readOnly
              style={{ width: '100%', maxWidth: '400px' }}
            />
          </form>
        )}

        <div className={utilsStyles.spacer3Flex} />
      </main>

      <Footer
        onForward={loading || successHash ? null : handleTransaction}
        showAccountButton={!!successHash}
        showActionsButton={!!successHash}
      />
    </>
  );
};

export default Test;
