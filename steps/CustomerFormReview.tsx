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
import MatrixAuthModal from '@components/MatrixAuthModal/MatrixAuthModal';
import { authenticateSignXWithMatrix } from '@utils/matrix';

type CustomerFormReviewProps = {
  onSuccess: (data: StepDataType<STEPS.customer_form_review>) => void;
  onBack?: () => void;
  formData: Record<string, any>;
  header?: string;
};

const SURVEY_URL = 'https://devmx.ixo.earth/_matrix/media/v3/download/devmx.ixo.earth/xpPfyzgHkigQPtXFuRRBLBwr';

const CustomerFormReview: FC<CustomerFormReviewProps> = ({ onSuccess, onBack, formData, header }) => {
  const [submitting, setSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { wallet } = useContext(WalletContext);
  const { chain } = useContext(ChainContext);

  // Fetch same survey structure for display
  const { surveyData, loading, error } = useSurveyData(SURVEY_URL);

  // Create read-only survey model
  const model = useSurveyModel({
    surveyData,
    initialData: formData,
    mode: 'display', // Read-only mode
  });

  const performSubmission = async () => {
    console.log('Performing submission...'); // Debug log
    setSubmitting(true);

    try {
      // Get Matrix access token from secure storage
      const matrixAccessToken = secret.accessToken;

      console.log('Matrix token available:', !!matrixAccessToken); // Debug log
      console.log('Form data:', formData); // Debug log

      if (!matrixAccessToken) {
        throw new Error('Matrix access token not found. Please authenticate with Matrix first.');
      }

      console.log('Making API request...'); // Debug log

      const response = await fetch('https://supamoto.claims.bot.testmx.ixo.earth/action', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${matrixAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit-existing-customer-claim',
          flags: formData,
        }),
      });

      console.log('API response status:', response.status); // Debug log

      const result = await response.json();

      console.log('API response data:', result); // Debug log

      onSuccess({
        confirmed: true,
        apiResponse: result,
        success: response.ok,
      });
    } catch (error: any) {
      console.error('Submission error:', error); // Debug log
      onSuccess({
        confirmed: true,
        apiResponse: null,
        success: false,
        error: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    console.log('Submit button clicked!'); // Debug log

    // Check if Matrix token exists
    const matrixAccessToken = secret.accessToken;

    if (!matrixAccessToken) {
      console.log('No Matrix token found'); // Debug log

      // Handle SignX wallet authentication automatically
      if (wallet?.walletType === 'signX') {
        console.log('SignX wallet detected - authenticating with address-based credentials...');

        if (!wallet.user?.address) {
          console.error('SignX wallet has no address');
          onSuccess({
            confirmed: true,
            apiResponse: null,
            success: false,
            error: 'Wallet address not found. Please reconnect your wallet.',
          });
          return;
        }

        try {
          // Authenticate SignX user with Matrix using their address
          await authenticateSignXWithMatrix(wallet.user.address);
          console.log('SignX Matrix authentication successful, proceeding with submission...');

          // Proceed with submission after successful authentication
          await performSubmission();
        } catch (error: any) {
          console.error('SignX Matrix authentication failed:', error);
          onSuccess({
            confirmed: true,
            apiResponse: null,
            success: false,
            error: `Matrix authentication failed: ${error.message}`,
          });
        }
        return;
      }

      // For Keplr/Opera wallets, show the authentication modal
      console.log('Showing Matrix auth modal for wallet type:', wallet?.walletType);
      setShowAuthModal(true);
      return;
    }

    // Token exists, proceed with submission
    await performSubmission();
  };

  const handleAuthSuccess = async () => {
    console.log('Matrix authentication successful, retrying submission...'); // Debug log
    setShowAuthModal(false);
    // Retry submission after successful authentication
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

      {/* Matrix Authentication Modal */}
      {wallet?.user && wallet?.walletType && chain?.chainId && (
        <MatrixAuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          walletType={wallet.walletType}
          chainId={chain.chainId}
          address={wallet.user.address}
        />
      )}
    </>
  );
};

export default CustomerFormReview;

