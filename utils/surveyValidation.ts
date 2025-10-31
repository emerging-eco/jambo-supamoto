import { Model } from 'survey-core';

/**
 * Validates data against a SurveyJS template without rendering the form
 * @param surveyTemplate The SurveyJS template/schema
 * @param data The data to validate
 * @returns Object containing isValid boolean and errors array
 */
export function validateSurveyData(
  surveyTemplate: any,
  data: Record<string, any>,
): { isValid: boolean; errors: Array<{ questionName: string; errorText: string }> } {
  try {
    // Create a Model instance without rendering
    const survey = new Model(surveyTemplate);

    // Set the data to validate
    survey.data = data;

    // Run validation
    const isValid = survey.validate();

    // Extract errors if validation failed
    const errors: Array<{ questionName: string; errorText: string }> = [];
    if (!isValid) {
      survey.getAllErrors().forEach((error: any) => {
        errors.push({
          questionName: error.locTitle?.text || error.question?.name || 'unknown',
          errorText: error.getText(),
        });
      });
    }

    return { isValid, errors };
  } catch (error) {
    console.error('Survey validation error:', error);
    return {
      isValid: false,
      errors: [
        {
          questionName: 'validation_error',
          errorText: error instanceof Error ? error.message : 'Failed to validate data',
        },
      ],
    };
  }
}

/**
 * Validates multiple rows of data against a SurveyJS template
 * @param surveyTemplate The SurveyJS template/schema
 * @param rows Array of data rows to validate
 * @returns Array of validation results with row index
 */
export function validateSurveyDataBatch(
  surveyTemplate: any,
  rows: Array<Record<string, any>>,
): Array<{ rowIndex: number; isValid: boolean; errors: Array<{ questionName: string; errorText: string }> }> {
  return rows.map((data, index) => {
    const validation = validateSurveyData(surveyTemplate, data);
    return {
      rowIndex: index,
      ...validation,
    };
  });
}
