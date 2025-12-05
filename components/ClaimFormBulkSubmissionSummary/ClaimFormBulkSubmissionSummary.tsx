import { FC } from 'react';
import cls from 'classnames';
import styles from './ClaimFormBulkSubmissionSummary.module.scss';
import DownloadIcon from '@icons/download.svg';

type ClaimFormBulkSubmissionSummaryProps = {
  totalRows: number;
  succeededCount: number;
  failedCount: number;
  pendingCount: number;
  errorMessage?: string | null;
  onExportSuccessful: () => void;
  onExportFailed: () => void;
  onExportPending: () => void;
  onClose?: () => void;
};

const ClaimFormBulkSubmissionSummary: FC<ClaimFormBulkSubmissionSummaryProps> = ({
  totalRows,
  succeededCount,
  failedCount,
  pendingCount,
  errorMessage,
  onExportSuccessful,
  onExportFailed,
  onExportPending,
  onClose,
}) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.summaryCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>Submission Summary</h2>
          {onClose && (
            <button className={styles.closeButton} onClick={onClose} aria-label='Close'>
              ×
            </button>
          )}
        </div>

        {errorMessage && (
          <div className={styles.errorMessage}>
            <strong>Error:</strong> {errorMessage}
          </div>
        )}

        <div className={styles.statsRow}>
          <div
            className={cls(styles.statBox, styles.statSuccess, succeededCount === 0 && styles.statDisabled)}
            onClick={succeededCount > 0 ? onExportSuccessful : undefined}
          >
            <div className={styles.statNumber}>{succeededCount}</div>
            <div className={styles.statLabelRow}>
              <span className={styles.statLabel}>Succeeded</span>
              <DownloadIcon className={styles.downloadIcon} width={16} height={16} />
            </div>
          </div>

          <div className={styles.divider} />

          <div
            className={cls(styles.statBox, styles.statFailed, failedCount === 0 && styles.statDisabled)}
            onClick={failedCount > 0 ? onExportFailed : undefined}
          >
            <div className={styles.statNumber}>{failedCount}</div>
            <div className={styles.statLabelRow}>
              <span className={styles.statLabel}>Failed</span>
              <DownloadIcon className={styles.downloadIcon} width={16} height={16} />
            </div>
          </div>

          <div className={styles.divider} />

          <div
            className={cls(styles.statBox, styles.statPending, pendingCount === 0 && styles.statDisabled)}
            onClick={pendingCount > 0 ? onExportPending : undefined}
          >
            <div className={styles.statNumber}>{pendingCount}</div>
            <div className={styles.statLabelRow}>
              <span className={styles.statLabel}>Pending</span>
              <DownloadIcon className={styles.downloadIcon} width={16} height={16} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimFormBulkSubmissionSummary;
