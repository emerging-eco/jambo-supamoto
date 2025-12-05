import { FC } from 'react';
import styles from './CSVImporter.module.scss';
import Button, { BUTTON_BG_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import utilsStyles from '@styles/utils.module.scss';

type CSVImporterPreviewProps = {
  surveyFields: Array<{ name: string; title: string; isRequired?: boolean }>;
  previewData: Record<string, any>[];
  totalRows: number;
  onBack: () => void;
  onImport: () => void;
};

const CSVImporterPreview: FC<CSVImporterPreviewProps> = ({
  surveyFields,
  previewData,
  totalRows,
  onBack,
  onImport,
}) => {
  return (
    <div className={styles.csvImporter}>
      <div className={utilsStyles.spacer2} />
      <p className={styles.previewTitle}>Preview (showing first 5 rows):</p>
      <div className={styles.previewTable}>
        <table>
          <thead>
            <tr>
              {surveyFields.map((field) => (
                <th key={field.name}>{field.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {surveyFields.map((field) => (
                  <td key={field.name}>{row[field.name] ?? '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={utilsStyles.spacer2} />
      <p className={styles.rowCount}>Total rows to import: {totalRows}</p>
      <div className={utilsStyles.spacer2} />
      <div className={styles.buttonRow}>
        <Button
          label='Back'
          size={BUTTON_SIZE.medium}
          bgColor={BUTTON_BG_COLOR.lightGrey}
          color={BUTTON_COLOR.primary}
          onClick={onBack}
        />
        <Button
          label='Import'
          size={BUTTON_SIZE.medium}
          bgColor={BUTTON_BG_COLOR.primary}
          color={BUTTON_COLOR.white}
          onClick={onImport}
        />
      </div>
      <div className={utilsStyles.spacer2} />
    </div>
  );
};

export default CSVImporterPreview;
