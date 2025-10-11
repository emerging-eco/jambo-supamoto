import { useEffect, useState } from 'react';
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

    // Add completion handler
    if (onComplete) {
      surveyModel.onCompleting.add(onComplete);
    }

    setModel(surveyModel);

    // Cleanup
    return () => {
      if (onComplete) {
        surveyModel.onCompleting.remove(onComplete);
      }
    };
  }, [surveyData, onComplete, initialData, mode, completeText, theme]);

  return model;
}

