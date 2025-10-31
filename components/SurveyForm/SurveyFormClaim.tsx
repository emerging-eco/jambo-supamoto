import { useState, useMemo, useCallback } from 'react';
import type { NextPage } from 'next';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';

import LoaderMessage from '@components/LoaderMessage/LoaderMessage';
import IconText from '@components/IconText/IconText';
import useSurveyTheme from '@hooks/useSurveyTheme';

type SurveyFormClaimProps = {
  surveyTemplate: any;
  data?: any;
  onSubmit?: (data: any) => Promise<void>;
};

const SurveyFormClaim: NextPage<SurveyFormClaimProps> = ({ surveyTemplate, data, onSubmit }) => {
  const [surveyLoading, setSurveyLoading] = useState<boolean | undefined>(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState<boolean | undefined>(false);

  const theme = useSurveyTheme();

  const handleSubmit = useCallback(async function (answer: any) {
    setSubmitting(true);
    try {
      if (!onSubmit) {
        throw new Error('Submission functionality is required');
      }
      await onSubmit(answer);
      return true;
    } catch (e: any) {
      console.error(e);
      setError('Failed to submit claim. ' + typeof e === 'string' ? e : e.message);
      setSubmitting(false);
      return false;
    }
  }, []);

  const survey = useMemo(
    function () {
      if (!surveyTemplate) {
        return undefined;
      }

      const survey = new Model(surveyTemplate);
      survey.applyTheme(theme);
      survey.allowCompleteSurveyAutomatic = false;

      if (data) {
        survey.data = data;
      }

      function preventComplete(sender: any, options: any) {
        options.allowComplete = false;
        postResults(sender);
      }

      async function postResults(sender: any) {
        survey.onCompleting.remove(preventComplete);

        survey.completeText = 'Submitting...';
        const response = await handleSubmit(sender.data);
        if (response) {
          sender.doComplete();
        } else {
          survey.completeText = 'Try again';
          survey.onCompleting.add(preventComplete);
        }
      }

      survey.onCompleting.add(preventComplete);
      survey.completeText = 'Submit';

      setTimeout(() => setSurveyLoading(false), 100);
      return survey;
    },
    [surveyTemplate],
  );

  if (surveyLoading) return <LoaderMessage message='Rendering claim form...' />;

  if (error) return <IconText title='Something went wrong' subTitle={error} imgSize={50} />;

  if (submitting) return <LoaderMessage message='Submitting claim...' />;

  if (!surveyTemplate)
    return <IconText title='Something went wrong' subTitle='Unable to render claim survey' imgSize={50} />;

  if (!survey) return <IconText title='Something went wrong' subTitle='Unable to render claim survey' imgSize={50} />;

  return <Survey model={survey} />;
};

export default SurveyFormClaim;
