import { FC } from 'react';
import cls from 'classnames';
import styles from './CSVImporter.module.scss';
import Button, { BUTTON_BG_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import utilsStyles from '@styles/utils.module.scss';

type CSVImporterUploadPreviewProps = {
  csvData: string[][];
  headers: string[];
  hasHeaders: boolean;
  fileName: string | undefined;
  onHasHeadersChange: (hasHeaders: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
};

const CSVImporterUploadPreview: FC<CSVImporterUploadPreviewProps> = ({
  csvData,
  headers,
  hasHeaders,
  fileName,
  onHasHeadersChange,
  onBack,
  onContinue,
}) => {
  const dataRows = csvData;
  const previewHeaders = hasHeaders ? headers : headers.map((_, i) => `Column ${i + 1}`);
  const previewRows = (hasHeaders ? dataRows.slice(1) : dataRows).slice(0, 5);

  // Infer column types from first up to 20 data rows
  const sampleRows = (hasHeaders ? dataRows.slice(1) : dataRows).slice(0, 20);
  const types: Record<string, 'number' | 'date' | 'text'> = {};
  previewHeaders.forEach((h, idx) => {
    let numCount = 0;
    let dateCount = 0;
    let nonEmpty = 0;
    for (const r of sampleRows) {
      const v = r[idx];
      if (v == null || String(v).trim() === '') continue;
      nonEmpty++;
      const s = String(v).trim();
      // number detection
      if (!isNaN(Number(s))) {
        numCount++;
      } else {
        // date detection (ISO or parseable)
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
          dateCount++;
        }
      }
    }
    let decided: 'number' | 'date' | 'text' = 'text';
    if (nonEmpty > 0) {
      if (numCount / nonEmpty >= 0.7) decided = 'number';
      else if (dateCount / nonEmpty >= 0.7) decided = 'date';
    }
    types[h] = decided;
  });

  return (
    <div className={styles.csvImporter}>
      <div className={utilsStyles.spacer2} />
      <p className={styles.previewTitle}>{fileName ?? 'File'} (preview)</p>
      <div className={styles.previewTable}>
        <table>
          <thead>
            <tr>
              {previewHeaders.map((h, i) => (
                <th key={i}>
                  {h || `Column ${i + 1}`}
                  <br />
                  <span
                    className={cls(
                      styles.typeBadge,
                      types[h] === 'number' && styles.typeNumber,
                      types[h] === 'date' && styles.typeDate,
                    )}
                  >
                    {types[h]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>{cell ?? '-'}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td>...</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className={utilsStyles.spacer1} />
      <div className={utilsStyles.spacer2} />
      <div className={styles.buttonRow}>
        <Button
          label='Choose another file'
          size={BUTTON_SIZE.medium}
          bgColor={BUTTON_BG_COLOR.lightGrey}
          color={BUTTON_COLOR.primary}
          onClick={onBack}
        />
        <div className={styles.fullFlex} />
        <div className={styles.headersNotice}>
          <label className={styles.checkboxLabelStrong}>
            <input type='checkbox' checked={hasHeaders} onChange={(e) => onHasHeadersChange(e.target.checked)} />
            CSV file has headers
          </label>
        </div>
        <Button
          label='Continue'
          size={BUTTON_SIZE.medium}
          bgColor={BUTTON_BG_COLOR.primary}
          color={BUTTON_COLOR.white}
          onClick={onContinue}
        />
      </div>
      <div className={utilsStyles.spacer2} />
    </div>
  );
};

export default CSVImporterUploadPreview;
