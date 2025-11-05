import { useEffect, useState, useRef } from 'react';
import { Model } from 'survey-core';
import surveyDefaultConfig from '@constants/surveyConfig';
import useSurveyTheme from './useSurveyTheme';

type SurveyData = {
  pages?: any[];
  elements?: any[];
  calculatedValues?: any[];
  triggers?: any[];
  title?: string;
  [key: string]: any;
};

type UseSurveyModelOptions = {
  surveyData: SurveyData | null;
  onComplete?: (sender: Model, options: any) => void;
  initialData?: Record<string, any>;
  mode?: 'edit' | 'display';
  completeText?: string;
};

export default function useSurveyModel({
  surveyData,
  onComplete,
  initialData,
  mode = 'edit',
  completeText = 'Submit',
}: UseSurveyModelOptions) {
  const theme = useSurveyTheme();
  const [model, setModel] = useState<Model | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep the onComplete ref up to date without triggering re-renders
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!surveyData) return;

    // Create survey model
    const surveyModel = new Model({
      ...surveyData,
      completeText,
      ...surveyDefaultConfig,
      showPreviewBeforeComplete: false, // Disable preview to prevent flickering
    });

    // Apply theme
    surveyModel.applyTheme(theme);

    // Set mode (edit or display)
    if (mode === 'display') {
      surveyModel.mode = 'display';
    }

    // Set initial data
    if (initialData) {
      surveyModel.data = initialData;
    }

    // Add completion handler using ref to avoid dependency on onComplete
    const completionHandler = (sender: Model, options: any) => {
      if (onCompleteRef.current) {
        onCompleteRef.current(sender, options);
      }
    };

    surveyModel.onCompleting.add(completionHandler);

    setModel(surveyModel);

    // Cleanup
    return () => {
      surveyModel.onCompleting.remove(completionHandler);
    };
    // Only re-create model when surveyData, mode, completeText, or theme changes
    // initialData is intentionally excluded to prevent re-creation when data updates
  }, [surveyData, mode, completeText, theme]);

  // Update model data when initialData changes without recreating the entire model
  useEffect(() => {
    if (model && initialData) {
      model.data = initialData;
    }
  }, [model, initialData]);

  return model;
}
