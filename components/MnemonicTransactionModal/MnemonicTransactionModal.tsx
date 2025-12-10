import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';

import Button, { BUTTON_BG_COLOR, BUTTON_BORDER_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import LoaderMessage from '@components/LoaderMessage/LoaderMessage';
import ToggleSwitch from '@components/ToggleSwitch/ToggleSwitch';
import { TRX_MSG } from 'types/transactions';
import { getCSSVariable } from '@utils/styles';

import styles from './MnemonicTransactionModal.module.scss';

type MnemonicTransactionModalProps = {
  msgs: TRX_MSG[];
  memo: string;
  onApprove: () => Promise<string>;
  onDecline: () => void;
  onComplete: (transactionHash: string) => void;
  onError: (error: Error) => void;
  isMultiTrxActive?: boolean;
  onApproveAll?: () => void;
  onStopAutoApprove?: () => void;
};

type ModalState = 'initial' | 'loading' | 'success' | 'error';

const MnemonicTransactionModal = ({
  msgs,
  memo,
  onApprove,
  onDecline,
  onComplete,
  onError,
  isMultiTrxActive = false,
  onApproveAll,
  onStopAutoApprove,
}: MnemonicTransactionModalProps) => {
  const [state, setState] = useState<ModalState>('initial');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [autoApproveEnabled, setAutoApproveEnabled] = useState<boolean>(false);
  const [isCountdownPlaying, setIsCountdownPlaying] = useState<boolean>(false);
  const [remainingTime, setRemainingTime] = useState<number>(4);
  const autoApproveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleApprove = useCallback(async () => {
    setState('loading');
    setErrorMessage(undefined);

    // If auto-approve toggle is enabled, enable auto-approve for subsequent transactions
    if (autoApproveEnabled && onApproveAll) {
      onApproveAll();
    }

    try {
      const transactionHash = await onApprove();
      setState('success');
      setTimeout(() => {
        onComplete(transactionHash);
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transaction failed';
      setErrorMessage(message);
      setState('error');
      setTimeout(() => {
        const err = error instanceof Error ? error : new Error(message);
        onError(err);
      }, 1000);
    }
  }, [onApprove, onComplete, onError, autoApproveEnabled, onApproveAll]);

  const handleReject = () => {
    // Clear any timers on reject
    if (autoApproveTimerRef.current) {
      clearTimeout(autoApproveTimerRef.current);
      autoApproveTimerRef.current = null;
    }
    setIsCountdownPlaying(false);
    setRemainingTime(4);
    onDecline();
  };

  const handleToggleAutoApprove = (e: ChangeEvent<HTMLInputElement>) => {
    setAutoApproveEnabled(e.target.checked);
  };

  const handleStopAutoApprove = () => {
    // Clear timers and reset countdown
    if (autoApproveTimerRef.current) {
      clearTimeout(autoApproveTimerRef.current);
      autoApproveTimerRef.current = null;
    }
    setIsCountdownPlaying(false);
    setRemainingTime(4);
    setAutoApproveEnabled(false); // Reset the toggle
    if (onStopAutoApprove) {
      onStopAutoApprove();
    }
    // Note: After stopping, isMultiTrxActive prop will still be true until next transaction,
    // but we use isCountdownPlaying to control UI visibility
  };

  // Handle auto-approval countdown when isMultiTrxActive is true
  useEffect(() => {
    if (isMultiTrxActive && state === 'initial') {
      // Start 4-second countdown
      setRemainingTime(4);
      setIsCountdownPlaying(true);

      // Auto-approve after 4 seconds
      autoApproveTimerRef.current = setTimeout(() => {
        if (autoApproveTimerRef.current) {
          autoApproveTimerRef.current = null;
        }
        setIsCountdownPlaying(false);
        setRemainingTime(4);
        handleApprove();
      }, 4000);

      // Cleanup on unmount
      return () => {
        if (autoApproveTimerRef.current) {
          clearTimeout(autoApproveTimerRef.current);
          autoApproveTimerRef.current = null;
        }
        setIsCountdownPlaying(false);
        setRemainingTime(4);
      };
    }
  }, [isMultiTrxActive, state, handleApprove]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoApproveTimerRef.current) {
        clearTimeout(autoApproveTimerRef.current);
      }
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className={styles.container}>
        <LoaderMessage message='Broadcasting transaction...' />
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className={styles.container}>
        <div className={styles.successMessage}>
          <p className={styles.successText}>Transaction successful!</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>
          <p className={styles.errorText}>{errorMessage || 'Transaction failed'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Tab Panels */}
      <div className={styles.tabPanel}>
        <p className={styles.memoLabel}>Data</p>
        <div className={styles.dataPanel}>
          <pre className={styles.dataDisplay}>{JSON.stringify(msgs, null, 2)}</pre>
        </div>
      </div>

      {/* Memo Section */}
      {memo && (
        <div className={styles.memoSection}>
          <p className={styles.memoLabel}>Memo</p>
          <p className={styles.memoText}>{memo}</p>
        </div>
      )}

      {/* Auto-approve toggle row - always show */}
      <div className={styles.autoApproveRow}>
        <div className={styles.autoApproveContent}>
          <div className={styles.autoApproveHeader}>
            <p className={styles.autoApproveTitle}>Auto-approve</p>
          </div>
          {isCountdownPlaying ? (
            <p className={styles.autoApproveDescription}>
              Automatically approving the transaction in {remainingTime} second{remainingTime !== 1 ? 's' : ''}. You can
              stop auto-approve at any time.
            </p>
          ) : (
            <p className={styles.autoApproveDescription}>
              Automatically approve subsequent transactions. You will be able to stop auto-approve at any time.
            </p>
          )}
        </div>
        {isCountdownPlaying ? (
          <div className={styles.countdownTimerWrapper}>
            <CountdownCircleTimer
              isPlaying={isCountdownPlaying}
              duration={4}
              colors={[getCSSVariable('--primary-color') || ('#004777' as any), '#F7B801', '#A30000']}
              colorsTime={[4, 2, 0]}
              size={50}
              strokeWidth={4}
              onUpdate={(remainingTime) => {
                setRemainingTime(remainingTime);
              }}
              onComplete={() => {
                setIsCountdownPlaying(false);
                setRemainingTime(4);
                return { shouldRepeat: false };
              }}
            >
              {({ remainingTime, color }) => (
                <div className={styles.countdownTimerContent} style={{ color: color }}>
                  <div className={styles.countdownTimerValue}>{remainingTime}</div>
                </div>
              )}
            </CountdownCircleTimer>
          </div>
        ) : (
          <ToggleSwitch name='autoApprove' toggled={autoApproveEnabled} onToggle={handleToggleAutoApprove} />
        )}
      </div>

      <div className={styles.actions}>
        {isCountdownPlaying ? (
          // Show only Stop button during countdown
          <Button
            label='Stop'
            size={BUTTON_SIZE.medium}
            bgColor={BUTTON_BG_COLOR.lightGrey}
            borderColor={BUTTON_BORDER_COLOR.lightGrey}
            onClick={handleStopAutoApprove}
            className={styles.actionButton}
            textCentered
          />
        ) : (
          // Show normal buttons (Reject and Approve) when not in countdown
          <>
            <Button
              label='Reject'
              size={BUTTON_SIZE.medium}
              bgColor={BUTTON_BG_COLOR.lightGrey}
              borderColor={BUTTON_BORDER_COLOR.lightGrey}
              onClick={handleReject}
              className={styles.actionButton}
              textCentered
            />
            <Button
              label='Approve'
              size={BUTTON_SIZE.medium}
              bgColor={BUTTON_BG_COLOR.primary}
              color={BUTTON_COLOR.white}
              onClick={handleApprove}
              className={styles.actionButton}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default MnemonicTransactionModal;
