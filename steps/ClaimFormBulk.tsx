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
import DataTable from '@components/DataTable/DataTable';
import CSVImporter from '@components/CSVImporter/CSVImporter';
import useWindowDimensions from '@hooks/useWindowDimensions';
import { TRX_MSG } from 'types/transactions';
import { delay } from '@utils/timestamp';
import { MATRIX_BID_BOT_URL } from '@constants/env';

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
type RowStatus = 'pending' | 'uploading' | 'success' | 'failed' | 'failed-twice';

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
  const [submissionStopped, setSubmissionStopped] = useState(false);

  async function uploadClaimData(data: any) {
    await delay(100);
    return Math.random().toString(36).substring(2, 15);
    // const baseUrl = CLAIM_BOT_URLS[CHAIN_NETWORK];
    // if (!baseUrl) {
    //   throw new Error('Failed to load the claim bot URL');
    // }
    // const saveClaimResponse = await fetch(`${baseUrl}/action`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     Authorization: `Bearer ${wallet?.user?.matrix?.accessToken}`,
    //   },
    //   body: JSON.stringify({
    //     action: 'save-claim',
    //     flags: {
    //       collection: collection.id,
    //       data: typeof data === 'string' ? data : JSON.stringify(data),
    //     },
    //   }),
    // });
    // if (!saveClaimResponse.ok) {
    //   let errorData: any;
    //   try {
    //     errorData = await saveClaimResponse.json();
    //   } catch {
    //     throw new Error(`Failed to save claim - ${saveClaimResponse.statusText}`);
    //   }
    //   throw new Error(
    //     errorData?.data?.error ??
    //       errorData?.error ??
    //       errorData?.data?.message ??
    //       errorData?.message ??
    //       `Failed to save claim - ${saveClaimResponse.statusText}`,
    //   );
    // }
    // const saveClaimResponseData = await saveClaimResponse.json();
    // return saveClaimResponseData?.data?.cid;
  }

  // const mnemonicSessionRef = useRef<MnemonicApprovalSession | null>(null);

  // Lazy initialization of mnemonic session to avoid circular dependency
  // const getMnemonicSession = async () => {
  //   if (!mnemonicSessionRef.current) {
  //     const { createMnemonicApprovalSession } = await import('@utils/mnemonic');
  //     mnemonicSessionRef.current = createMnemonicApprovalSession();
  //   }
  //   return mnemonicSessionRef.current;
  // };

  async function submitChunk(chunkRows: Array<{ index: number; data: any }>) {
    const submitMsgs: TRX_MSG[] = [];

    // Upload all claims in chunk first
    for (const row of chunkRows) {
      try {
        setRowStatuses((prev) => ({ ...prev, [row.index]: 'uploading' }));
        const cid = await uploadClaimData(row.data);
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
      } catch (error) {
        console.error(`Failed to upload claim for row ${row.index}:`, error);
        setRowStatuses((prev) => ({ ...prev, [row.index]: 'failed' }));
        throw error;
      }
    }

    // Broadcast transaction with all submit messages
    const execTrx = generateExecTrx({
      grantee: wallet?.user?.address!,
      msgs: submitMsgs as any[],
    });

    // if (wallet?.walletType === WALLET_TYPE.mnemonic) {
    //   // const mnemonicSession = await getMnemonicSession();
    //   // await mnemonicSession.sign([execTrx], undefined, wallet);
    // } else {
    await broadCastMessages(wallet, [execTrx], undefined);
    // }
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
        (idx) =>
          rowStatuses[idx] === 'failed' ||
          rowStatuses[idx] === 'failed-twice' ||
          !rowStatuses[idx] ||
          rowStatuses[idx] === 'pending',
      );
    exportToCSVOriginalFormat(failedIndices, `failed_pending_claims_${new Date().toISOString().split('T')[0]}.csv`);
  }

  async function handleSubmitAll(selectedRows?: Array<{ data: Record<string, any>; index: number }>) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmissionStopped(false);

    const rowsToSubmit =
      selectedRows?.map((r) => ({ index: r.index, data: r.data })) ??
      csvData.map((data, idx) => ({ index: idx, data })).filter(({ index }) => rowStatuses[index] !== 'success');

    // Initialize pending rows
    rowsToSubmit.forEach(({ index }) => {
      if (!rowStatuses[index] || rowStatuses[index] === 'pending') {
        setRowStatuses((prev) => ({ ...prev, [index]: 'pending' }));
      }
    });

    const CHUNK_SIZE = 15;

    // Local failure tracking to avoid stale state reads
    const failureCounts = new Map<number, number>();
    let stopProcessing = false;

    // Process chunks
    for (let i = 0; i < rowsToSubmit.length; i += CHUNK_SIZE) {
      if (stopProcessing) break;

      const chunk = rowsToSubmit.slice(i, i + CHUNK_SIZE);
      const chunkIndices = chunk.map((r) => r.index);

      try {
        await submitChunk(chunk);
        chunkIndices.forEach((idx) => {
          setRowStatuses((prev) => ({ ...prev, [idx]: 'success' }));
        });
      } catch (error: any) {
        console.error('Chunk submission failed:', error);
        // If user rejected signing, stop immediately and mark rows as failed-twice
        if (error && (error.message === 'User rejected' || String(error).includes('User rejected'))) {
          chunkIndices.forEach((idx) => {
            failureCounts.set(idx, 2);
            setRowStatuses((prev) => ({ ...prev, [idx]: 'failed-twice' }));
          });
          stopProcessing = true;
          try {
            // mnemonicSessionRef.current?.stop();
          } catch {}
          break;
        }
        // Mark failed and count failures
        chunkIndices.forEach((idx) => {
          const nextCount = (failureCounts.get(idx) ?? 0) + 1;
          failureCounts.set(idx, nextCount);
          if (nextCount >= 2) {
            stopProcessing = true;
            setRowStatuses((prev) => ({ ...prev, [idx]: 'failed-twice' }));
          } else {
            setRowStatuses((prev) => ({ ...prev, [idx]: 'failed' }));
          }
        });

        if (stopProcessing) break;

        // Retry failed rows individually (only those that failed once)
        for (const row of chunk) {
          if (stopProcessing) break;
          if ((failureCounts.get(row.index) ?? 0) === 1) {
            try {
              await submitChunk([row]);
              setRowStatuses((prev) => ({ ...prev, [row.index]: 'success' }));
              failureCounts.delete(row.index);
            } catch (retryError: any) {
              console.error(`Retry failed for row ${row.index}:`, retryError);
              // If user rejected signing, stop immediately
              if (
                retryError &&
                (retryError.message === 'User rejected' || String(retryError).includes('User rejected'))
              ) {
                setRowStatuses((prev) => ({ ...prev, [row.index]: 'failed-twice' }));
                stopProcessing = true;
                break;
              }
              const nextCount = (failureCounts.get(row.index) ?? 1) + 1;
              failureCounts.set(row.index, nextCount);
              setRowStatuses((prev) => ({ ...prev, [row.index]: 'failed-twice' }));
              stopProcessing = true;
              try {
                // mnemonicSessionRef.current?.stop();
              } catch {}
              break;
            }
          }
        }
      }
    }

    if (stopProcessing) setSubmissionStopped(true);
    setIsSubmitting(false);
  }

  const onClose = () => {
    setIsOpen(false);
  };

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
                setSubmissionStopped(false);
                setIsOpen(false);
              }}
              onCancel={() => setIsOpen(false)}
            />
          </>
        ) : csvData.length > 0 ? (
          <>
            <div className={utilsStyles.spacer2} />
            {submissionStopped && (
              <div style={{ padding: '12px', marginBottom: '12px', background: '#fff3cd', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontWeight: 500 }}>Submission stopped due to repeated failures.</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Button
                    label='Export Successful'
                    size={BUTTON_SIZE.small}
                    bgColor={BUTTON_BG_COLOR.primary}
                    color={BUTTON_COLOR.white}
                    onClick={handleExportSuccessful}
                  />
                  <Button
                    label='Export Failed/Pending'
                    size={BUTTON_SIZE.small}
                    bgColor={BUTTON_BG_COLOR.white}
                    color={BUTTON_COLOR.primary}
                    onClick={handleExportFailed}
                  />
                </div>
              </div>
            )}
            <div className={styles.fullWidthContainer}>
              <DataTable
                data={csvData}
                itemsPerPage={15}
                columns={
                  surveyTemplate?.pages
                    ?.flatMap((page: any) => page?.elements)
                    ?.map((element: any) => element.name)
                    ?.filter((name: string) => name) ?? undefined
                }
                surveyTemplate={surveyTemplate}
                rowStatuses={rowStatuses}
                onRowSubmit={async (rowData, rowIndex) => {
                  if (rowStatuses[rowIndex] === 'success') return;
                  try {
                    await submitChunk([{ index: rowIndex, data: rowData }]);
                    setRowStatuses((prev) => ({ ...prev, [rowIndex]: 'success' }));
                  } catch (error) {
                    setRowStatuses((prev) => {
                      const current = prev[rowIndex];
                      if (current === 'failed') {
                        return { ...prev, [rowIndex]: 'failed-twice' };
                      }
                      return { ...prev, [rowIndex]: 'failed' };
                    });
                    throw error;
                  }
                }}
                onRowDelete={(rowIndex) => {
                  setCsvData((prev) => prev.filter((_, index: number) => index !== rowIndex));
                  setOriginalRowIndexMap((prev) => prev.filter((_, index) => index !== rowIndex));
                  setRowStatuses((prev) => {
                    const next = { ...prev };
                    delete next[rowIndex];
                    const reindexed: Record<number, RowStatus> = {};
                    Object.keys(next).forEach((key) => {
                      const idx = parseInt(key);
                      if (idx > rowIndex) {
                        reindexed[idx - 1] = next[idx];
                      } else {
                        reindexed[idx] = next[idx];
                      }
                    });
                    return reindexed;
                  });
                }}
                onSubmitAll={handleSubmitAll}
                isSubmitting={isSubmitting}
                onImportAnother={() => {
                  setIsOpen(true);
                  setRowStatuses({});
                  setSubmissionStopped(false);
                  setOriginalCsv(null);
                  setOriginalRowIndexMap([]);
                }}
                onClearData={() => {
                  setCsvData([]);
                  setRowStatuses({});
                  setSubmissionStopped(false);
                  setOriginalCsv(null);
                  setOriginalRowIndexMap([]);
                }}
                onExportSuccessful={handleExportSuccessful}
                onExportFailed={handleExportFailed}
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
