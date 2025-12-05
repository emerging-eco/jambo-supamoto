import { FC, useState, useMemo } from 'react';
import { CSVImporterProps, CSVStep, FieldMapping } from './types';
import { parseCSV, applyTransform } from './utils';
import CSVImporterUpload from './CSVImporterUpload';
import CSVImporterUploadPreview from './CSVImporterUploadPreview';
import CSVImporterMapping from './CSVImporterMapping';
import CSVImporterPreview from './CSVImporterPreview';

const CSVImporter: FC<CSVImporterProps> = ({ surveyFields, onImport, onCancel }) => {
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [mappingsByField, setMappingsByField] = useState<Record<string, FieldMapping>>({});
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [step, setStep] = useState<CSVStep>('upload');

  // Common derived data (do not place hooks inside conditional branches)
  const mappedDataRows = useMemo(() => (hasHeaders ? csvData.slice(1) : csvData), [csvData, hasHeaders]);
  const headerSamplesGlobal: Record<string, string[]> = useMemo(() => {
    if (headers.length === 0) return {};
    const samples: Record<string, string[]> = {};
    headers.forEach((h, idx) => {
      const key = h || `Column ${idx + 1}`;
      samples[key] = mappedDataRows.slice(0, 3).map((r) => (r?.[idx] ?? '').toString());
    });
    return samples;
  }, [headers, mappedDataRows]);

  const loadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length > 0) {
        setCsvData(rows);
        setHeaders(rows[0]);
        setFileName(file.name);
        setStep('uploadPreview');
      }
    };
    reader.readAsText(file);
  };

  const setFieldMapping = (fieldName: string, updater: (prev: FieldMapping | undefined) => FieldMapping) => {
    setMappingsByField((prev) => ({ ...prev, [fieldName]: updater(prev[fieldName]) }));
  };

  const handlePreview = () => {
    setStep('preview');
  };

  const handleImport = () => {
    const dataRows = hasHeaders ? csvData.slice(1) : csvData;
    const mappedData: Record<string, any>[] = [];
    const headerMap: Record<string, number> = {};
    headers.forEach((h, i) => (headerMap[h || `Column ${i + 1}`] = i));

    dataRows.forEach((row) => {
      const mappedRow: Record<string, any> = {};
      surveyFields.forEach((field) => {
        mappedRow[field.name] = applyTransform(field.name, row, headerMap, mappingsByField);
      });
      mappedData.push(mappedRow);
    });

    // Pass original CSV data for failed/pending export
    const originalHeaders = headers;
    const originalRows = csvData;
    onImport(mappedData, { headers: originalHeaders, rows: originalRows, hasHeaders });
  };

  const previewData = useMemo(() => {
    if (step !== 'preview') return [];
    const dataRows = hasHeaders ? csvData.slice(1) : csvData;
    const headerMap: Record<string, number> = {};
    headers.forEach((h, i) => (headerMap[h || `Column ${i + 1}`] = i));
    return dataRows.slice(0, 5).map((row) => {
      const mappedRow: Record<string, any> = {};
      surveyFields.forEach((field) => {
        mappedRow[field.name] = applyTransform(field.name, row, headerMap, mappingsByField);
      });
      return mappedRow;
    });
  }, [step, csvData, headers, hasHeaders, mappingsByField, surveyFields]);

  if (step === 'upload') {
    return <CSVImporterUpload onFileLoad={loadFile} />;
  }

  if (step === 'uploadPreview') {
    return (
      <CSVImporterUploadPreview
        csvData={csvData}
        headers={headers}
        hasHeaders={hasHeaders}
        fileName={fileName}
        onHasHeadersChange={setHasHeaders}
        onBack={() => setStep('upload')}
        onContinue={() => setStep('mapping')}
      />
    );
  }

  if (step === 'mapping') {
    return (
      <CSVImporterMapping
        surveyFields={surveyFields}
        headers={headers}
        mappingsByField={mappingsByField}
        headerSamples={headerSamplesGlobal}
        onFieldMappingChange={setFieldMapping}
        onClearMapping={(fieldName) => {
          setMappingsByField((prev) => {
            const next = { ...prev };
            delete next[fieldName];
            return next;
          });
        }}
        onCancel={onCancel}
        onPreview={handlePreview}
      />
    );
  }

  // Preview step
  return (
    <CSVImporterPreview
      surveyFields={surveyFields}
      previewData={previewData}
      totalRows={hasHeaders ? csvData.length - 1 : csvData.length}
      onBack={() => setStep('mapping')}
      onImport={handleImport}
    />
  );
};

export default CSVImporter;
