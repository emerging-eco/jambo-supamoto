import { useState, useMemo, useCallback, useEffect } from 'react';
import type { NextPage } from 'next';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';

import LoaderMessage from '@components/LoaderMessage/LoaderMessage';
import IconText from '@components/IconText/IconText';
import useSurveyTheme from '@hooks/useSurveyTheme';
import Modal from '@components/Modal/Modal';
import Input from '@components/Input/Input';
import Button, { BUTTON_SIZE, BUTTON_BG_COLOR, BUTTON_COLOR } from '@components/Button/Button';

type SurveyFormClaimProps = {
  surveyTemplate: any;
  data?: any;
  onSubmit?: (data: any) => Promise<void>;
};

const SurveyFormClaim: NextPage<SurveyFormClaimProps> = ({ surveyTemplate, data, onSubmit }) => {
  const [surveyLoading, setSurveyLoading] = useState<boolean | undefined>(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState<boolean | undefined>(false);
  const [showCustomerIdModal, setShowCustomerIdModal] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerIdError, setCustomerIdError] = useState<string | undefined>(undefined);
  const [surveyData, setSurveyData] = useState<any>(data);

  const theme = useSurveyTheme();

  // Check if surveyTemplate has ecs:customerId field
  const hasCustomerIdField = useMemo(() => {
    if (!surveyTemplate) return false;

    // Check in pages
    const elements =
      surveyTemplate?.pages?.flatMap((page: any) => page?.elements || []) || surveyTemplate?.elements || [];

    return elements.some((element: any) => element?.name === 'ecs:customerId');
  }, [surveyTemplate]);

  // Validate customer ID format: C + 8 uppercase hex characters
  const validateCustomerId = (value: string): boolean => {
    const pattern = /^C[0-9A-F]{8}$/;
    return pattern.test(value);
  };

  const handleCustomerIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    // Only allow C followed by hex characters
    if (value === '' || (value.startsWith('C') && /^C[0-9A-F]*$/.test(value))) {
      setCustomerId(value);
      setCustomerIdError(undefined);
    }
  };

  const handleCustomerIdContinue = () => {
    if (!customerId.trim()) {
      setCustomerIdError('Customer ID is required');
      return;
    }
    if (!validateCustomerId(customerId)) {
      setCustomerIdError('Customer ID must be in format: C followed by 8 uppercase hex characters (e.g., C12345678)');
      return;
    }
    // Inject customerId into survey data
    setSurveyData((prev: any) => ({
      ...prev,
      'ecs:customerId': customerId,
    }));
    setShowCustomerIdModal(false);
    // Finish loading if still loading
    if (surveyLoading) {
      setTimeout(() => setSurveyLoading(false), 100);
    }
  };

  // Show modal when surveyTemplate has customerId field and customerId is not already in data
  useEffect(() => {
    if (hasCustomerIdField && !surveyData?.['ecs:customerId']) {
      setShowCustomerIdModal(true);
    }
  }, [hasCustomerIdField, surveyData]);

  const handleSubmit = useCallback(
    async function (answer: any) {
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
    },
    [onSubmit],
  );

  const survey = useMemo(
    function () {
      if (!surveyTemplate) {
        return undefined;
      }

      const survey = new Model(surveyTemplate);
      survey.applyTheme(theme);
      survey.allowCompleteSurveyAutomatic = false;

      if (surveyData) {
        survey.data = surveyData;
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

      // Finish loading normally - the modal will show if needed
      setTimeout(() => setSurveyLoading(false), 100);
      return survey;
    },
    [surveyTemplate, surveyData, theme, handleSubmit],
  );

  const generateCustomerId = useCallback(async () => {
    try {
      // Get high-precision timestamp (milliseconds + microseconds from performance.now)
      const timestamp = Date.now();
      const performanceTime = typeof performance !== 'undefined' ? performance.now() : 0;
      const combinedTime = `${timestamp}-${performanceTime}`;

      // Use Web Crypto API to hash the timestamp
      const encoder = new TextEncoder();
      const data = encoder.encode(combinedTime);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();

      // Take first 8 characters of hash
      const hashPrefix = hashHex.substring(0, 8);

      return `C${hashPrefix}`;
    } catch (error) {
      // Fallback: use timestamp + random for browsers that don't support crypto.subtle
      const timestamp = Date.now().toString(16).toUpperCase().padStart(8, '0').substring(0, 8);
      const random = Math.floor(Math.random() * 0xffffffff)
        .toString(16)
        .toUpperCase()
        .padStart(8, '0')
        .substring(0, 8);
      // Combine and take first 8
      const combined = (timestamp + random).substring(0, 8);
      return `C${combined}`;
    }
  }, []);

  const handleGenerateCustomerId = useCallback(async () => {
    const generatedId = await generateCustomerId();
    setCustomerId(generatedId);
    setCustomerIdError(undefined);
  }, [generateCustomerId]);

  // Update survey data when customerId is set
  useEffect(() => {
    if (survey && surveyData) {
      survey.data = surveyData;
    }
  }, [survey, surveyData]);

  if (surveyLoading && !showCustomerIdModal) return <LoaderMessage message='Rendering claim form...' />;

  if (error) return <IconText title='Something went wrong' subTitle={error} imgSize={50} />;

  if (submitting) return <LoaderMessage message='Submitting claim...' />;

  if (!surveyTemplate)
    return <IconText title='Something went wrong' subTitle='Unable to render claim survey' imgSize={50} />;

  if (!survey) return <IconText title='Something went wrong' subTitle='Unable to render claim survey' imgSize={50} />;

  return (
    <>
      {showCustomerIdModal && (
        <>
          <style>{`
            .customer-id-modal .closeCross {
              display: none !important;
            }
          `}</style>
          <Modal onClose={() => {}} title='Enter Customer ID' className='customer-id-modal'>
            <div style={{ padding: '20px' }}>
              <p style={{ marginBottom: '15px' }}>
                Please enter the Customer ID or{' '}
                <span style={{ color: 'blue', cursor: 'pointer' }} onClick={handleGenerateCustomerId}>
                  generate a new one.
                </span>
              </p>
              <Input
                label='Customer ID'
                value={customerId}
                onChange={handleCustomerIdChange}
                placeholder='C12345678'
                maxLength={9}
                style={{ marginBottom: '10px', width: '100%' }}
              />
              {customerIdError && (
                <p style={{ color: 'red', fontSize: '14px', marginBottom: '15px' }}>{customerIdError}</p>
              )}
              <Button
                label='Continue'
                onClick={handleCustomerIdContinue}
                size={BUTTON_SIZE.medium}
                bgColor={
                  customerId && validateCustomerId(customerId) ? BUTTON_BG_COLOR.primary : BUTTON_BG_COLOR.disabled
                }
                color={BUTTON_COLOR.white}
              />
            </div>
          </Modal>
        </>
      )}
      <Survey model={survey} />
    </>
  );
};

export default SurveyFormClaim;
