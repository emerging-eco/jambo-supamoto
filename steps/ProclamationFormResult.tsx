import { FC } from 'react';
import cls from 'classnames';
import { useRouter } from 'next/router';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import { StepDataType, STEPS } from 'types/steps';

type ProclamationFormResultProps = {
  onSuccess: (data: StepDataType<STEPS.proclamation_form_result>) => void;
  data?: StepDataType<STEPS.proclamation_form_result>;
  header?: string;
};

const ProclamationFormResult: FC<ProclamationFormResultProps> = ({ onSuccess, data, header }) => {
  const router = useRouter();

  const handleDone = () => {
    // Navigate back to home page
    router.push('/');
  };

  const isSuccess = data?.success ?? false;
  const message = data?.message || (isSuccess ? 'Proclamation submitted successfully!' : 'Submission failed');
  const errorDetails = data?.errorDetails;

  return (
    <>
      <Header header={header} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        <div className={styles.resultContainer}>
          {isSuccess ? (
            <>
              <div className={styles.successIcon}>✓</div>
              <h2 className={styles.resultTitle}>Success!</h2>
              <p className={styles.resultMessage}>{message}</p>
              <p className={styles.resultDetails}>
                Your 1,000 Day Household proclamation has been recorded successfully.
              </p>
            </>
          ) : (
            <>
              <div className={styles.errorIcon}>✗</div>
              <h2 className={styles.resultTitle}>Submission Failed</h2>
              <p className={styles.resultMessage}>{message}</p>
              {errorDetails && <p className={styles.errorDetails}>{errorDetails}</p>}
              <p className={styles.resultDetails}>Please try again or contact support if the problem persists.</p>
            </>
          )}

          <button className={styles.doneButton} onClick={handleDone}>
            Done
          </button>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default ProclamationFormResult;
