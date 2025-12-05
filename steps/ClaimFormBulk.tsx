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
import SurveyFormBid from '@components/SurveyForm/SurveyFormBid';
import { Collection } from '@ixo/impactxclient-sdk/types/codegen/ixo/claims/v1beta1/claims';
import { generateExecTrx, generateSubmitTrx } from '@utils/transactions';
import { broadCastMessages } from '@utils/wallets';
import Button, { BUTTON_BG_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
// import DataTable from '@components/DataTable/DataTable'; // Old table - kept for reference
import ClaimFormBulkDataTable from '@components/ClaimFormBulkDataTable/ClaimFormBulkDataTable';
import ClaimFormBulkSubmissionSummary from '@components/ClaimFormBulkSubmissionSummary/ClaimFormBulkSubmissionSummary';
import CSVImporter from '@components/CSVImporter/CSVImporter';
import useWindowDimensions from '@hooks/useWindowDimensions';
import { TRX_MSG } from 'types/transactions';
import { delay } from '@utils/timestamp';
import { MATRIX_BID_BOT_URL, MATRIX_CLAIM_BOT_URL } from '@constants/env';

type ClaimFormBulkProps = {
  onSuccess: (data: StepDataType<STEPS.claim_form_bulk>) => void;
  data?: StepDataType<STEPS.claim_form_bulk>;
  header?: string;
};

const ClaimFormBulk: FC<ClaimFormBulkProps> = ({ onSuccess, data, header }) => {
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
        <BulkClaims title={header ?? 'Upload CSV'} collection={collection!} surveyTemplate={vctSurveyTemplate} />
      ) : (
        <IconText title={'Something went wrong'} subTitle={errorMessage} imgSize={50} />
      )}
    </>
  );
};

export default ClaimFormBulk;

interface BulkClaimsProps {
  collection: Collection;
  surveyTemplate: any;
  title: string;
}
type RowStatus = 'pending' | 'uploading' | 'submitting' | 'success' | 'failed' | 'failed-twice' | 'error';

const BulkClaims: FC<BulkClaimsProps> = ({ collection, surveyTemplate, title }) => {
  const { wallet } = useWalletContext();
  const { chain } = useChainContext();
  const { width } = useWindowDimensions();

  const [isOpen, setIsOpen] = useState(true);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [originalCsv, setOriginalCsv] = useState<{ headers: string[]; rows: string[][]; hasHeaders: boolean } | null>(
    null,
  );
  const [originalRowIndexMap, setOriginalRowIndexMap] = useState<number[]>([]); // Maps csvData[i] to originalCsv.rows[j] index
  const [rowStatuses, setRowStatuses] = useState<Record<number, RowStatus>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function uploadClaimData(data: any) {
    const baseUrl = MATRIX_CLAIM_BOT_URL;
    if (!baseUrl) {
      throw new Error('Failed to load the claim bot URL');
    }
    await delay(500);
    return Math.random().toString(36).substring(2, 15);
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
      let errorData: any;
      try {
        errorData = await saveClaimResponse.json();
      } catch {
        throw new Error(`Failed to save claim - ${saveClaimResponse.statusText}`);
      }
      throw new Error(
        errorData?.data?.error ??
          errorData?.error ??
          errorData?.data?.message ??
          errorData?.message ??
          `Failed to save claim - ${saveClaimResponse.statusText}`,
      );
    }
    const saveClaimResponseData = await saveClaimResponse.json();
    return saveClaimResponseData?.data?.cid;
  }

  async function signAndBroadcast(execTrx: any): Promise<string | null> {
    if (!wallet) {
      throw new Error('Wallet not available');
    }
    // Broadcast transaction (auto-approve feature is always available for mnemonic transactions)
    return await broadCastMessages(wallet, [execTrx], undefined);
  }

  async function handleBatchSubmission() {
    if (isSubmitting || csvData.length === 0) return;

    setIsSubmitting(true);
    setSubmissionComplete(false);
    setErrorMessage(null);

    const BATCH_SIZE = 2;
    const rowsToSubmit = csvData
      .map((data, idx) => ({ index: idx, data }))
      .filter(({ index }) => rowStatuses[index] !== 'success');

    try {
      // Process in batches of 2
      for (let i = 0; i < rowsToSubmit.length; i += BATCH_SIZE) {
        const batch = rowsToSubmit.slice(i, i + BATCH_SIZE);
        const batchIndices = batch.map((r) => r.index);

        try {
          // Step 1: Upload each claim to matrix claim bot (sequentially)
          const cids: string[] = [];
          for (const row of batch) {
            setRowStatuses((prev) => ({ ...prev, [row.index]: 'uploading' }));
            const cid = await uploadClaimData(row.data);
            cids.push(cid);
          }

          // Step 2: Generate transactions for each claim (sequentially)
          const submitMsgs: TRX_MSG[] = [];
          for (let j = 0; j < batch.length; j++) {
            const row = batch[j];
            const cid = cids[j];
            setRowStatuses((prev) => ({ ...prev, [row.index]: 'submitting' }));
            submitMsgs.push(
              generateSubmitTrx(
                {
                  adminAddress: collection?.admin,
                  agentAddress: wallet?.user?.address!,
                  agentDid: wallet?.user?.did!,
                  claimId: cid,
                  collectionId: collection.id,
                },
                true,
              ),
            );
          }

          // Step 3: Sign and broadcast both transactions together
          const execTrx = generateExecTrx({
            grantee: wallet?.user?.address!,
            msgs: submitMsgs as any[],
          });

          const transactionHash = await signAndBroadcast(execTrx);
          if (!transactionHash) {
            throw new Error('Transaction failed - no transaction hash returned');
          }

          // Step 4: Update status to success for this batch
          batchIndices.forEach((idx) => {
            setRowStatuses((prev) => ({ ...prev, [idx]: 'success' }));
          });
        } catch (error) {
          // If batch fails, update status to error and stop processing
          console.error('Batch submission failed:', error);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
          setErrorMessage(errorMsg);
          batchIndices.forEach((idx) => {
            setRowStatuses((prev) => ({ ...prev, [idx]: 'failed' }));
          });
          // Stop processing - don't continue to next batch
          break;
        }
      }
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
      setSubmissionComplete(true);
    }
  }

  function exportToCSVTableFormat(rows: any[], filename: string) {
    if (rows.length === 0) return;

    const columns =
      surveyTemplate?.pages
        ?.flatMap((page: any) => page?.elements)
        ?.filter((element: any) => !!element?.name)
        ?.map((element: any) => element.name) ?? [];

    const headers = columns.join(',');
    const csvRows = rows.map((row) => {
      return columns.map((col: string) => {
        const value = row[col] ?? '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
    });

    const csvContent = [headers, ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportToCSVOriginalFormat(indices: number[], filename: string) {
    if (!originalCsv || indices.length === 0) return;

    // originalCsv.rows[0] is headers (if hasHeaders), originalCsv.rows[1..N] are data rows
    // Use originalRowIndexMap to map csvData indices to original CSV row indices
    const headers = originalCsv.headers.join(',');
    const csvRows = indices
      .filter((idx) => idx >= 0 && idx < csvData.length && idx < originalRowIndexMap.length)
      .map((csvIdx) => {
        const originalRowIdx = originalRowIndexMap[csvIdx];
        if (originalRowIdx < 0 || originalRowIdx >= originalCsv.rows.length) return null;
        return originalCsv.rows[originalRowIdx];
      })
      .filter((row): row is string[] => row !== null)
      .map((row) => {
        return row.map((cell) => {
          const value = String(cell ?? '');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
      });

    const csvContent = [headers, ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExportSuccessful() {
    const successfulRows = csvData.filter((_, idx) => rowStatuses[idx] === 'success');
    exportToCSVTableFormat(successfulRows, `successful_claims_${new Date().toISOString().split('T')[0]}.csv`);
  }

  function handleExportFailed() {
    const failedIndices = csvData
      .map((_, idx) => idx)
      .filter(
        (idx) => rowStatuses[idx] === 'failed' || rowStatuses[idx] === 'failed-twice' || rowStatuses[idx] === 'error',
      );
    exportToCSVOriginalFormat(failedIndices, `failed_claims_${new Date().toISOString().split('T')[0]}.csv`);
  }

  function handleExportPending() {
    const pendingIndices = csvData
      .map((_, idx) => idx)
      .filter(
        (idx) =>
          !rowStatuses[idx] ||
          rowStatuses[idx] === 'pending' ||
          (rowStatuses[idx] !== 'success' &&
            rowStatuses[idx] !== 'failed' &&
            rowStatuses[idx] !== 'failed-twice' &&
            rowStatuses[idx] !== 'error'),
      );
    exportToCSVOriginalFormat(pendingIndices, `pending_claims_${new Date().toISOString().split('T')[0]}.csv`);
  }

  // Calculate counts for summary overlay
  const succeededCount = csvData.filter((_, idx) => rowStatuses[idx] === 'success').length;
  const failedCount = csvData.filter(
    (_, idx) => rowStatuses[idx] === 'failed' || rowStatuses[idx] === 'failed-twice' || rowStatuses[idx] === 'error',
  ).length;
  const pendingCount = csvData.length - succeededCount - failedCount;

  return (
    <>
      <main
        className={cls(
          utilsStyles.main,
          utilsStyles.columnJustifyCenter,
          styles.stepContainer,
          csvData.length > 0 && styles.fullWidthStepContainer,
        )}
      >
        {/* <SurveyFormClaim surveyTemplate={surveyTemplate} onSubmit={handleSubmit} /> */}
        {width !== null && width < 1000 ? (
          <>
            <div className={utilsStyles.spacer2} />
            <p className={utilsStyles.textCenter}>
              For this page, please use a computer with a screen width of at least 1000px.
            </p>
            <div className={utilsStyles.spacer2} />
          </>
        ) : isOpen ? (
          <>
            <CSVImporter
              surveyFields={
                surveyTemplate?.pages
                  ?.flatMap((page: any) => page?.elements)
                  // Only include elements that have a valid name; unnamed elements break mapping checks
                  ?.filter((element: any) => !!element?.name)
                  ?.map((element: any) => ({
                    name: element.name,
                    title: element.title || element.name,
                    isRequired: element.isRequired === true,
                  })) ?? []
              }
              onImport={(data, originalCsvData) => {
                setCsvData(data);
                setOriginalCsv(originalCsvData || null);
                // Initialize index map: csvData[i] maps to originalCsv.rows indices
                // If hasHeaders: csvData[i] -> originalCsv.rows[i+1] (skip header row at 0)
                // If !hasHeaders: csvData[i] -> originalCsv.rows[i] (no header row)
                if (originalCsvData) {
                  const offset = originalCsvData.hasHeaders ? 1 : 0;
                  setOriginalRowIndexMap(data.map((_, idx) => idx + offset));
                } else {
                  setOriginalRowIndexMap([]);
                }
                setRowStatuses({});
                setSubmissionComplete(false);
                setIsOpen(false);
              }}
              onCancel={() => setIsOpen(false)}
            />
          </>
        ) : csvData.length > 0 ? (
          <>
            <div className={utilsStyles.spacer2} />

            <div className={styles.fullWidthContainer}>
              {/* New simplified ClaimFormBulkDataTable */}
              <ClaimFormBulkDataTable
                data={csvData}
                columns={
                  surveyTemplate?.pages
                    ?.flatMap((page: any) => page?.elements)
                    ?.map((element: any) => element.name)
                    ?.filter((name: string) => name) ?? undefined
                }
                rowStatuses={rowStatuses}
              />
            </div>
            <div className={utilsStyles.spacer2} />
          </>
        ) : (
          <Button
            label='Import CSV'
            size={BUTTON_SIZE.medium}
            bgColor={BUTTON_BG_COLOR.primary}
            color={BUTTON_COLOR.white}
            onClick={() => setIsOpen(true)}
          />
        )}
      </main>

      <Footer
        onBackUrl='/'
        backLabel='Home'
        forwardLabel='Continue'
        onForward={csvData.length > 0 && !isSubmitting ? handleBatchSubmission : undefined}
      />

      {submissionComplete && (
        <ClaimFormBulkSubmissionSummary
          totalRows={csvData.length}
          succeededCount={succeededCount}
          failedCount={failedCount}
          pendingCount={pendingCount}
          errorMessage={errorMessage}
          onExportSuccessful={handleExportSuccessful}
          onExportFailed={handleExportFailed}
          onExportPending={handleExportPending}
          onClose={() => {
            setSubmissionComplete(false);
            setErrorMessage(null);
          }}
        />
      )}
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
    const baseUrl = MATRIX_BID_BOT_URL;
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
    if (!response.ok) {
      let errData;
      try {
        errData = await response.json();
      } catch (error) {
        throw new Error(`Failed to submit bid - ${response.statusText}`);
      }
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
