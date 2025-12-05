import { FC } from 'react';
import { useDraggable } from '@dnd-kit/core';
import styles from './CSVImporter.module.scss';

type DraggableChipProps = {
  id: string;
  label: string;
  samples: string[];
};

const DraggableChip: FC<DraggableChipProps> = ({ id, label, samples }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} className={styles.csvChipCard} style={style} {...listeners} {...attributes}>
      <div className={styles.csvChipHeader}>{label}</div>
      <div className={styles.csvChipBody}>
        {samples.map((s, i) => (
          <div key={i} className={styles.csvChipSample}>
            {s || '-'}
          </div>
        ))}
        <div className={styles.csvChipSample}>...</div>
      </div>
    </div>
  );
};

export default DraggableChip;
