import { FC, useCallback } from 'react';
import { Survey } from 'survey-react-ui';
import { Model } from 'survey-core';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import styles from '@styles/stepsPages.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import { StepDataType, STEPS } from 'types/steps';
import useSurveyModel from '@hooks/useSurveyModel';
import useSurveyData from '@hooks/useSurveyData';

type ProclamationFormEntryProps = {
  onSuccess: (data: StepDataType<STEPS.proclamation_form_entry>) => void;
  onBack?: () => void;
  data?: StepDataType<STEPS.proclamation_form_entry>;
  header?: string;
};

const SURVEY_URL = 'https://devmx.ixo.earth/_matrix/media/v3/download/devmx.ixo.earth/UWRpYxNSeMJeRmAgBIIFNkCq';

const ProclamationFormEntry: FC<ProclamationFormEntryProps> = ({ onSuccess, onBack, data, header }) => {
  // Fetch survey from Matrix media URL
  const { surveyData, loading, error } = useSurveyData(SURVEY_URL);

  // Handle survey completion - memoized to prevent re-creation
  const handleComplete = useCallback(
    (sender: Model, options: any) => {
      options.allowComplete = false; // Prevent default completion
      onSuccess({ surveyData: sender.data });
    },
    [onSuccess],
  );

  // Create survey model
  const model = useSurveyModel({
    surveyData,
    onComplete: handleComplete,
    initialData: data?.surveyData,
    completeText: 'Continue',
  });

  // Loading state
  if (loading) {
    return (
      <>
        <Header header={header} />
        <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
          <p className={styles.stepTitle}>Loading survey...</p>
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
          <p className={styles.stepTitle}>Error loading survey</p>
          <p className={styles.label}>{error}</p>
        </main>
        <Footer onBack={onBack} onBackUrl={onBack ? undefined : ''} />
      </>
    );
  }

  // No model yet
  if (!model) return null;

  return (
    <>
      <Header header={header} />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter, styles.stepContainer)}>
        <Survey model={model} />
      </main>

      <Footer onBack={onBack} onBackUrl={onBack ? undefined : ''} />
    </>
  );
};

export default ProclamationFormEntry;
