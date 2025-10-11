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

type CustomerFormReviewProps = {
  onSuccess: (data: StepDataType<STEPS.customer_form_review>) => void;
  onBack?: () => void;
  formData: Record<string, any>;
  header?: string;
};

const SURVEY_URL = 'https://devmx.ixo.earth/_matrix/media/v3/download/devmx.ixo.earth/xpPfyzgHkigQPtXFuRRBLBwr';

const CustomerFormReview: FC<CustomerFormReviewProps> = ({ onSuccess, onBack, formData, header }) => {
  const [submitting, setSubmitting] = useState(false);
  const { wallet } = useContext(WalletContext);

  // Fetch same survey structure for display
  const { surveyData, loading, error } = useSurveyData(SURVEY_URL);

  // Create read-only survey model
  const model = useSurveyModel({
    surveyData,
    initialData: formData,
    mode: 'display', // Read-only mode
  });

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      // Get Matrix access token from wallet
      const matrixAccessToken = wallet.user?.matrixAccessToken;

      if (!matrixAccessToken) {
        throw new Error('Matrix access token not found. Please sign in again.');
      }

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

      const result = await response.json();

      onSuccess({
        confirmed: true,
        apiResponse: result,
        success: response.ok,
      });
    } catch (error: any) {
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

