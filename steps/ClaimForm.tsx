import { FC, useEffect, useRef, useState } from 'react';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import { StepDataType, STEPS } from 'types/steps';
import useChainContext from '@hooks/useChainContext';
import useWalletContext from '@hooks/useWalletContext';
import useClaimCollection, { CLAIM_COLLECTION_STEP } from '@hooks/useClaimCollection';
import LoaderMessage from '@components/LoaderMessage/LoaderMessage';
import IconText from '@components/IconText/IconText';
import { BID_BOT_URLS, CLAIM_BOT_URLS } from '@constants/urls';
import SurveyFormClaim from '@components/SurveyForm/SurveyFormClaim';
import SurveyFormBid from '@components/SurveyForm/SurveyFormBid';
import { Collection } from '@ixo/impactxclient-sdk/types/codegen/ixo/claims/v1beta1/claims';
import { generateExecTrx, generateSubmitTrx } from '@utils/transactions';
import { broadCastMessages } from '@utils/wallets';
import { CHAIN_NETWORK } from '@constants/chains';

type ClaimFormProps = {
  onSuccess: (data: StepDataType<STEPS.claim_form>) => void;
  data?: StepDataType<STEPS.claim_form>;
  header?: string;
};

const ClaimForm: FC<ClaimFormProps> = ({ onSuccess, data, header }) => {
  const {
    isLoading,
    collection,
    errorMessage,
    step: claimCollectionStep,
    bcoSurveyTemplate,
    vctSurveyTemplate,
    loadClaimCollection,
    loadGrants,
  } = useClaimCollection(data?.collectionId as unknown as string);

  return (
    <>
      <Header header={header} />

      {isLoading ? (
        <ClaimCollectionLoader step={claimCollectionStep} />
      ) : claimCollectionStep === CLAIM_COLLECTION_STEP.BCO_FORM ||
        claimCollectionStep === CLAIM_COLLECTION_STEP.BCO_PENDING ? (
        <ContributorBid
          collectionId={data?.collectionId as unknown as string}
          isPending={claimCollectionStep === CLAIM_COLLECTION_STEP.BCO_PENDING}
          refresh={async function () {
            const res = await loadGrants({ collectionId: data?.collectionId as unknown as string });
            if (res?.length) {
              loadClaimCollection({ collectionId: data?.collectionId as unknown as string });
            }
          }}
          surveyTemplate={bcoSurveyTemplate}
        />
      ) : claimCollectionStep === CLAIM_COLLECTION_STEP.VCT_FORM ? (
        <VerifiableClaim collection={collection!} surveyTemplate={vctSurveyTemplate} />
      ) : (
        <IconText title={'Something went wrong'} subTitle={errorMessage} imgSize={50} />
      )}
    </>
  );
};

export default ClaimForm;

interface VerifiableClaimProps {
  collection: Collection;
  surveyTemplate: any;
}
const VerifiableClaim: FC<VerifiableClaimProps> = ({ collection, surveyTemplate }) => {
  const { wallet } = useWalletContext();

  async function handleSubmit(data: any) {
    const baseUrl = CLAIM_BOT_URLS[CHAIN_NETWORK];
    if (!baseUrl) {
      throw new Error('Failed to load the claim bot URL');
    }
    const saveClaimResponse = await fetch(`${baseUrl}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wallet?.user?.matrix?.accessToken}`,
      },
      body: JSON.stringify({
        action: 'save-claim',
        flags: {
          collection: collection.id,
          data: typeof data === 'string' ? data : JSON.stringify(data),
        },
      }),
    });
    if (!saveClaimResponse.ok) {
      let data: any;
      try {
        data = await saveClaimResponse.json();
      } catch {
        throw new Error(`Failed to save claim - ${saveClaimResponse.statusText}`);
      }
      throw new Error(
        data?.data?.error ??
          data?.error ??
          data?.data?.message ??
          data?.message ??
          `Failed to save claim - ${saveClaimResponse.statusText}`,
      );
    }
    const saveClaimResponseData = await saveClaimResponse.json();
    console.log('saveClaimResponseData', saveClaimResponseData);
    const cid = saveClaimResponseData?.data?.cid;
    const submitTrx = generateSubmitTrx(
      {
        adminAddress: collection?.admin,
        agentAddress: wallet?.user?.address!,
        agentDid: wallet?.user?.did!,
        claimId: cid,
        collectionId: collection.id,
      },
      true,
    );
    const execTrx = generateExecTrx({
      grantee: wallet?.user?.address!,
      msgs: [submitTrx],
    });
    await broadCastMessages(wallet, [execTrx], undefined);
  }

  return (
    <>
      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        <SurveyFormClaim surveyTemplate={surveyTemplate} onSubmit={handleSubmit} />
      </main>

      <Footer onBackUrl='/' backLabel='Home' forwardLabel='Continue' />
    </>
  );
};

interface ContributorBidProps {
  collectionId: string;
  isPending: boolean;
  surveyTemplate: any;
  refresh: () => Promise<void>;
}
const ContributorBid: FC<ContributorBidProps> = ({ collectionId, isPending, surveyTemplate, refresh }) => {
  const [step, setStep] = useState<'prompt' | 'pending' | 'form' | 'error'>(isPending ? 'pending' : 'prompt');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const { chain } = useChainContext();
  const { wallet } = useWalletContext();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(
    function () {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (step === 'pending') {
        timeoutRef.current = setTimeout(function () {
          refresh();
        }, 5000);
      }

      return function () {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    },
    [refresh, step === 'pending'],
  );

  function handleContinueToForm() {
    try {
      if (!surveyTemplate) {
        throw new Error('Failed to load the contributor bid form');
      }
      setStep('form');
    } catch (error) {
      setErrorMessage((error as Error)?.message ?? 'An unknown error occurred');
      setStep('error');
    }
  }

  async function handleSubmit(data: any) {
    console.log('submit', data);
    const baseUrl = BID_BOT_URLS[chain?.chainNetwork as keyof typeof BID_BOT_URLS];
    if (!baseUrl) {
      throw new Error('Failed to load the bid bot URL');
    }
    const response = await fetch(`${baseUrl}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wallet?.user?.matrix?.accessToken}`,
      },
      body: JSON.stringify({
        action: 'submit-bid',
        flags: {
          collection: collectionId,
          value: typeof data === 'string' ? data : JSON.stringify(data),
          role: 'SA',
        },
      }),
    });
    console.log('response', response);
    if (!response.ok) {
      let errData;
      try {
        errData = await response.json();
      } catch (error) {
        throw new Error(`Failed to submit bid - ${response.statusText}`);
      }
      console.log('errorData', errData);
      throw new Error(
        errData?.data?.error ??
          errData?.error ??
          errData?.data?.message ??
          errData?.message ??
          `Failed to submit bid - ${response.statusText}`,
      );
    }
    const responseData = await response.json();
    console.log('responseData', responseData);
  }

  return (
    <>
      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        <div className={utilsStyles.spacer3} />
        {step === 'prompt' ? (
          <>
            <p>You don&apos;t have authorization to submit claims for collection {collectionId}.</p>
            <p>Would you like to submit a bid to become an agent?</p>
          </>
        ) : step === 'pending' ? (
          <LoaderMessage message='Your bid is pending evaluation...' />
        ) : step === 'form' ? (
          <SurveyFormBid surveyTemplate={surveyTemplate} onSubmit={handleSubmit} />
        ) : (
          <IconText title={'Something went wrong'} subTitle={errorMessage} imgSize={50} />
        )}
        <div className={utilsStyles.spacer3} />
      </main>

      {step === 'prompt' ? (
        <Footer onBackUrl='/' backLabel='Home' forwardLabel='Continue' onForward={handleContinueToForm} />
      ) : (
        <Footer onBackUrl='/' backLabel='Home' />
      )}
    </>
  );
};

interface ClaimCollectionLoaderProps {
  step: string;
}

const ClaimCollectionLoader: FC<ClaimCollectionLoaderProps> = ({ step }) => {
  return (
    <>
      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        <div className={utilsStyles.spacer3} />
        <LoaderMessage
          message={
            step === 'load_collection'
              ? 'Loading the collection...'
              : step === 'load_grants'
                ? 'Loading your grants...'
                : step === 'load_protocol'
                  ? 'Loading the protocol...'
                  : step === 'load_vct'
                    ? 'Loading the claim form...'
                    : step === 'load_bco'
                      ? 'Loading the contributor bid form...'
                      : step === 'load_bids'
                        ? 'Loading your bids...'
                        : 'Loading...'
          }
        />
        <div className={utilsStyles.spacer3} />
      </main>

      <Footer onBackUrl='/' backLabel='Home' forwardLabel='Continue' />
    </>
  );
};

// interface ClaimCollectionIdInputProps {
//   defaultCollectionId?: string;
//   errorMessage?: string;
//   onContinue: (value: string) => void;
// }

// const ClaimCollectionIdInput: FC<ClaimCollectionIdInputProps> = ({ defaultCollectionId, errorMessage, onContinue }) => {
//   const [value, setValue] = useState(defaultCollectionId || '');
//   const [error, setError] = useState(errorMessage || undefined);

//   const timeoutRef = useRef<NodeJS.Timeout | null>(null);

//   useEffect(
//     function () {
//       setError(errorMessage);
//     },
//     [errorMessage],
//   );

//   useEffect(
//     function () {
//       if (error) {
//         if (timeoutRef.current) {
//           clearTimeout(timeoutRef.current);
//         }
//         timeoutRef.current = setTimeout(function () {
//           setError(undefined);
//         }, 5000);
//       }
//     },
//     [error],
//   );

//   function handleContinue() {
//     if (!value?.length) {
//       setError('Collection ID is required');
//       return;
//     }
//     onContinue(value);
//   }

//   return (
//     <>
//       <p className={cls(styles.label, styles.titleWithSubtext)}>Enter the claim collection ID</p>
//       <Input name='collectionId' value={value} onChange={(e) => setValue(e.target.value)} />
//       <div style={{ marginBottom: 10, marginTop: 5 }}>
//         <p className={styles.errorMessage}>{error}</p>
//       </div>
//       <Button
//         label='continue'
//         onClick={handleContinue}
//         size={BUTTON_SIZE.medium}
//         bgColor={value?.length ? BUTTON_BG_COLOR.primary : BUTTON_BG_COLOR.disabled}
//         color={BUTTON_COLOR.white}
//       />
//     </>
//   );
// };
