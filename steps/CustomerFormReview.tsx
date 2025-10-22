import { FC, useState, useContext } from 'react';
import { Survey } from 'survey-react-ui';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import { StepDataType, STEPS } from 'types/steps';
import useSurveyModel from '@hooks/useSurveyModel';
import useSurveyData from '@hooks/useSurveyData';
import { WalletContext } from '@contexts/wallet';
import { ChainContext } from '@contexts/chain';
import { secret } from '@utils/secrets';
import { cosmos, ixo } from '@ixo/impactxclient-sdk';
import { DeliverTxResponse } from '@cosmjs/stargate';
import { createQueryClient } from '@ixo/impactxclient-sdk';
import { signXBroadCastMessage } from '@utils/signX';
import { initStargateClient, sendTransaction } from '@utils/client';
import { TRX_FEE_OPTION } from 'types/transactions';
import { getChainRpcUrl } from '@constants/rpc';

type CustomerFormReviewProps = {
  onSuccess: (data: StepDataType<STEPS.customer_form_review>) => void;
  onBack?: () => void;
  formData: Record<string, any>;
  header?: string;
};

const SURVEY_URL = 'https://devmx.ixo.earth/_matrix/media/v3/download/devmx.ixo.earth/HJhNWZWdMIdKEysvAKJWDEQU';

const CustomerFormReview: FC<CustomerFormReviewProps> = ({ onSuccess, onBack, formData, header }) => {
  const [submitting, setSubmitting] = useState(false);
  const { wallet } = useContext(WalletContext);
  const { chain, chainInfo } = useContext(ChainContext);

  // Fetch same survey structure for display
  const { surveyData, loading, error } = useSurveyData(SURVEY_URL);

  // Create read-only survey model
  const model = useSurveyModel({
    surveyData,
    initialData: formData,
    mode: 'display', // Read-only mode
  });

  const performSubmission = async () => {
    console.log('Performing blockchain claim submission...');
    setSubmitting(true);

    try {
      // 1. Get Matrix access token for claim bot
      const matrixAccessToken = secret.accessToken;
      if (!matrixAccessToken) {
        throw new Error('Matrix access token not found. Please authenticate with Matrix first.');
      }

      console.log('Matrix token available:', !!matrixAccessToken);
      console.log('Form data:', formData);

      // 2. Get customer collection ID from environment
      const collectionId = process.env.NEXT_PUBLIC_CUSTOMER_COLLECTION_ID;
      if (!collectionId) {
        throw new Error(
          'Customer Collection ID not configured. Please set NEXT_PUBLIC_CUSTOMER_COLLECTION_ID environment variable.',
        );
      }

      console.log('Customer Collection ID:', collectionId);

      // 3. Fetch collection details from blockchain
      // Use RPC URL based on current chain network
      const rpcUrl = getChainRpcUrl(chain?.chainNetwork);
      console.log('Using RPC URL:', rpcUrl);
      const queryClient = await createQueryClient(rpcUrl);
      const collectionResponse = await queryClient.ixo.claims.v1beta1.collection({
        id: collectionId,
      });
      const collection = collectionResponse.collection;

      if (!collection?.id) {
        throw new Error('Collection not found on blockchain');
      }

      console.log('Collection found:', collection.id);

      // 4. Generate claim ID
      // Use timestamp-based ID for uniqueness
      const claimId = `claim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('Generated claim ID:', claimId);

      // 5. Create MsgSubmitClaim with form data as claim
      const msgSubmitClaimValue = {
        adminAddress: collection.admin as string,
        agentAddress: wallet?.user?.address as string,
        agentDid: wallet?.user?.did as string,
        claimId: claimId,
        collectionId: collectionId,
        claim: JSON.stringify(formData), // Include form data as the claim
        useIntent: false,
        amount: [],
        cw20Payment: [],
        cw1155Payment: [],
      };

      console.log('MsgSubmitClaim value:', msgSubmitClaimValue);

      // 6. Wrap in MsgExec for authz
      const message = {
        typeUrl: '/cosmos.authz.v1beta1.MsgExec',
        value: cosmos.authz.v1beta1.MsgExec.fromPartial({
          grantee: wallet?.user?.address,
          msgs: [
            {
              typeUrl: '/ixo.claims.v1beta1.MsgSubmitClaim',
              value: ixo.claims.v1beta1.MsgSubmitClaim.encode(msgSubmitClaimValue).finish(),
            },
          ] as any[],
        }),
      };

      console.log('Message created, preparing to sign and broadcast...');

      // 7. Sign and broadcast based on wallet type
      let txHash: string | null = null;

      if (wallet?.walletType === 'signX') {
        console.log('Using SignX wallet for broadcasting...');
        txHash = await signXBroadCastMessage(
          [message],
          'Submit Customer Claim',
          'average' as TRX_FEE_OPTION,
          'uixo',
          chainInfo!,
          wallet,
        );
      } else {
        console.log('Using Keplr/Opera wallet for broadcasting...');
        // Keplr/Opera wallet - use sendTransaction
        const offlineSigner = await (window as any).keplr?.getOfflineSigner(chain?.chainId);
        if (!offlineSigner) {
          throw new Error('No offline signer found. Please ensure your wallet is connected.');
        }

        const client = await initStargateClient(rpcUrl, offlineSigner);

        const result = await sendTransaction(client, wallet?.user?.address as string, {
          msgs: [message],
          chain_id: chain?.chainId as string,
          memo: 'Submit Customer Claim',
          fee: 'average' as TRX_FEE_OPTION,
          feeDenom: 'uixo',
        });

        txHash = result.transactionHash;
      }

      if (!txHash) {
        throw new Error('Transaction failed - no transaction hash returned');
      }

      console.log('Transaction successful! Hash:', txHash);

      // 8. Success - pass transaction hash to result step
      onSuccess({
        confirmed: true,
        apiResponse: { transactionHash: txHash, claimId },
        success: true,
      });
    } catch (error: any) {
      console.error('Blockchain submission error:', error);
      onSuccess({
        confirmed: true,
        apiResponse: null,
        success: false,
        error: error.message || 'An error occurred during blockchain submission',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    console.log('Submit button clicked!');

    // Check if wallet is connected
    if (!wallet?.user?.address) {
      onSuccess({
        confirmed: true,
        apiResponse: null,
        success: false,
        error: 'Wallet not connected. Please connect your wallet.',
      });
      return;
    }

    // Check if Matrix token exists (needed for claim bot)
    const matrixAccessToken = secret.accessToken;
    if (!matrixAccessToken) {
      onSuccess({
        confirmed: true,
        apiResponse: null,
        success: false,
        error: 'Matrix authentication required. Please authenticate with Matrix first.',
      });
      return;
    }

    // Proceed with blockchain submission
    await performSubmission();
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Header header={header} />
        <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
          <p className={styles.stepTitle}>Loading review...</p>
        </main>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Header header={header} />
        <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
          <p className={styles.stepTitle}>Error loading review</p>
          <p className={styles.label}>{error}</p>
        </main>
        <Footer onBack={onBack} onBackUrl={onBack ? undefined : ''} />
      </>
    );
  }

  if (!model) return null;

  return (
    <>
      <Header header={header} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        <div className={styles.stepTitle}>Review Your Information</div>
        <p className={styles.label} style={{ textAlign: 'center', marginBottom: '20px' }}>
          Please review the details below. Click "Back" to make changes or "Submit" to continue.
        </p>
        <Survey model={model} />
      </main>

      <Footer
        onBack={submitting ? null : onBack}
        onBackUrl={onBack ? undefined : ''}
        onCorrect={submitting ? null : handleSubmit}
        correctLabel={submitting ? 'Submitting...' : 'Submit'}
      />
    </>
  );
};

export default CustomerFormReview;
