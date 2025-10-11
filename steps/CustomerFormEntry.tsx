import { FC, useEffect } from 'react';
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

type CustomerFormEntryProps = {
  onSuccess: (data: StepDataType<STEPS.customer_form_entry>) => void;
  onBack?: () => void;
  data?: StepDataType<STEPS.customer_form_entry>;
  header?: string;
};

const SURVEY_URL = 'https://devmx.ixo.earth/_matrix/media/v3/download/devmx.ixo.earth/xpPfyzgHkigQPtXFuRRBLBwr';

const CustomerFormEntry: FC<CustomerFormEntryProps> = ({ onSuccess, onBack, data, header }) => {
  // Fetch survey from Matrix media URL
  const { surveyData, loading, error } = useSurveyData(SURVEY_URL);

  // Handle survey completion
  const handleComplete = (sender: Model, options: any) => {
    options.allowComplete = false; // Prevent default completion
    onSuccess({ surveyData: sender.data });
  };

  // Generate customer ID if not already present
  const customerId = data?.surveyData?.['ecs:customerId'] || `CUST-${Date.now()}`;

  // Create survey model with pre-filled data
  const model = useSurveyModel({
    surveyData,
    onComplete: handleComplete,
    initialData: {
      'ecs:customerId': customerId, // Pre-fill customer ID
      'schema:gender': 'Female', // Pre-fill gender to enable conditional options
      ...data?.surveyData, // Preserve any existing data
    },
    completeText: 'Continue',
  });

  // Make Customer ID field editable after model is created
  useEffect(() => {
    if (model) {
      const customerIdQuestion = model.getQuestionByName('ecs:customerId');
      if (customerIdQuestion) {
        customerIdQuestion.readOnly = false; // Allow editing
      }
    }
  }, [model]);

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

export default CustomerFormEntry;

