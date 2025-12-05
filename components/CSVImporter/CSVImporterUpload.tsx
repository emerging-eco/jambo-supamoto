import { FC, useRef, useState } from 'react';
import cls from 'classnames';
import styles from './CSVImporter.module.scss';
import Button, { BUTTON_BG_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import utilsStyles from '@styles/utils.module.scss';

type CSVImporterUploadProps = {
  onFileLoad: (file: File) => void;
};

const CSVImporterUpload: FC<CSVImporterUploadProps> = ({ onFileLoad }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadOver, setIsUploadOver] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileLoad(file);
    }
  };

  const handleUploadDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUploadOver(true);
  };

  const handleUploadDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUploadOver(false);
  };

  const handleUploadDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUploadOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileLoad(file);
    }
  };

  return (
    <div className={styles.csvImporter}>
      <div className={utilsStyles.spacer2} />
      <input ref={fileInputRef} type='file' accept='.csv' onChange={handleFileSelect} style={{ display: 'none' }} />
      <div
        className={cls(styles.uploadBox, isUploadOver && styles.uploadBoxOver)}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleUploadDragOver}
        onDragEnter={handleUploadDragOver}
        onDragLeave={handleUploadDragLeave}
        onDrop={handleUploadDrop}
      >
        <p className={styles.uploadTitle}>Click to select a CSV file</p>
        <p className={styles.uploadHint}>.csv up to a few MB</p>
        <div className={utilsStyles.spacer1} />
        <Button
          label='Choose CSV File'
          size={BUTTON_SIZE.medium}
          bgColor={BUTTON_BG_COLOR.primary}
          color={BUTTON_COLOR.white}
          onClick={() => fileInputRef.current?.click()}
        />
      </div>
      <div className={utilsStyles.spacer2} />
    </div>
  );
};

export default CSVImporterUpload;
