export type TransformMode = 'csv' | 'static' | 'concat' | 'split' | 'map';

export type FieldMapping = {
  mode: TransformMode;
  source?: string; // csv
  staticValue?: string; // static
  sources?: string[]; // concat
  delimiter?: string; // concat
  splitSource?: string; // split
  splitDelimiter?: string; // split
  splitIndex?: number; // split
  mapSource?: string; // map
  mapPairs?: Array<{ from: string; to: string }>; // map
};

export type CSVImporterProps = {
  surveyFields: Array<{
    name: string;
    title: string;
    isRequired?: boolean;
    type?: string;
    inputType?: string;
    choices?: Array<{ value: string; text: string }> | string[];
  }>;
  onImport: (
    data: Record<string, any>[],
    originalCsv?: { headers: string[]; rows: string[][]; hasHeaders: boolean },
  ) => void;
  onCancel: () => void;
};

export type CSVStep = 'upload' | 'uploadPreview' | 'mapping' | 'preview';
