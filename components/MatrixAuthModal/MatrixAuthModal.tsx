import { FC, useState, useEffect } from 'react';
import cls from 'classnames';
import { useMatrixAuth } from '@hooks/useMatrixAuth';
import styles from './MatrixAuthModal.module.scss';

type MatrixAuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  walletType: string;
  chainId: string;
  address: string;
};

const MatrixAuthModal: FC<MatrixAuthModalProps> = ({ isOpen, onClose, onSuccess, walletType, chainId, address }) => {
  const { authenticateWithWalletSignature, loading, error } = useMatrixAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAuthError(null);
      setAuthSuccess(false);
    }
  }, [isOpen]);

  // Auto-close on success after a short delay
  useEffect(() => {
    if (authSuccess) {
      const timer = setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [authSuccess, onSuccess, onClose]);

  const handleAuthenticate = async () => {
    setAuthError(null);

    try {
      await authenticateWithWalletSignature(walletType, chainId, address);
      setAuthSuccess(true);
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Matrix Authentication Required</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label='Close'>
            ×
          </button>
        </div>

        <div className={styles.content}>
          {authSuccess ? (
            <div className={styles.successMessage}>
              <div className={styles.successIcon}>✓</div>
              <p>Authentication successful!</p>
              <p className={styles.subtext}>Proceeding with submission...</p>
            </div>
          ) : (
            <>
              <p className={styles.description}>
                To submit your claim, you need to authenticate with the Matrix server. This is a one-time process that
                securely links your wallet to the Matrix network.
              </p>

              <div className={styles.infoBox}>
                <h3>What happens next:</h3>
                <ol>
                  <li>You&apos;ll be asked to sign a message with your wallet</li>
                  <li>This signature is used to create your Matrix credentials</li>
                  <li>Your credentials are securely stored for future use</li>
                  <li>No sensitive information leaves your device</li>
                </ol>
              </div>

              {authError && (
                <div className={styles.errorMessage}>
                  <strong>Error:</strong> {authError}
                </div>
              )}

              {error && !authError && (
                <div className={styles.errorMessage}>
                  <strong>Error:</strong> {error}
                </div>
              )}

              <div className={styles.actions}>
                <button className={styles.cancelButton} onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button className={styles.authenticateButton} onClick={handleAuthenticate} disabled={loading}>
                  {loading ? 'Authenticating...' : 'Authenticate with Wallet'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatrixAuthModal;
