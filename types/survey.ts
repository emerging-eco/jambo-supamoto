export interface ISurveyPage {
  name?: string;
  title?: string;
  elements: ISurveyElement[];
}

export interface ISurveyElement {
  type: string;
  name: string;
  title?: string;
  isRequired?: boolean;
  choices?: string[] | { value: string; text: string }[];
  inputType?: string;
  placeholder?: string;
  description?: string;
  validators?: any[];
  visibleIf?: string;
  enableIf?: string;
  defaultValue?: any;
}

export interface ISurveyData {
  pages?: ISurveyPage[];
  elements?: ISurveyElement[];
  calculatedValues?: any[];
  triggers?: any[];
  title?: string;
}

export interface ISurveyTheme {
  cssVariables: Record<string, string>;
  themeName: string;
  colorPalette: 'light' | 'dark';
  showQuestionNumbers: 'off' | 'on' | 'onPage';
  isPanelless: boolean;
}

