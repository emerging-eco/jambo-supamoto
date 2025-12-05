import { FC } from 'react';
import cls from 'classnames';
import { useDroppable } from '@dnd-kit/core';
import styles from './CSVImporter.module.scss';
import { FieldMapping } from './types';

type DroppableFieldProps = {
  fieldName: string;
  mapping: FieldMapping | undefined;
  onRemoveChip: (fieldName: string, source: string) => void;
};

const DroppableField: FC<DroppableFieldProps> = ({ fieldName, mapping, onRemoveChip }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `drop-${fieldName}` });

  return (
    <div ref={setNodeRef} className={cls(styles.fieldDropZone, isOver && styles.fieldDropZoneOver)}>
      <div className={styles.assignedChipsRow}>
        {mapping?.mode === 'csv' && mapping.source && (
          <span className={styles.assignedChip}>
            {mapping.source}
            <button
              className={styles.removeChip}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveChip(fieldName, mapping.source!);
              }}
            >
              ×
            </button>
          </span>
        )}
        {mapping?.mode === 'concat' &&
          (mapping.sources ?? []).map((s) => (
            <span key={s} className={styles.assignedChip}>
              {s}
              <button
                className={styles.removeChip}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveChip(fieldName, s);
                }}
              >
                ×
              </button>
            </span>
          ))}
      </div>
    </div>
  );
};

export default DroppableField;
