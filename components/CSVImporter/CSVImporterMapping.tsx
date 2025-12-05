import { FC } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import styles from './CSVImporter.module.scss';
import Button, { BUTTON_BG_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import utilsStyles from '@styles/utils.module.scss';
import Input from '@components/Input/Input';
import DraggableChip from './DraggableChip';
import DroppableField from './DroppableField';
import { TransformMode, FieldMapping } from './types';

type CSVImporterMappingProps = {
  surveyFields: Array<{ name: string; title: string; isRequired?: boolean }>;
  headers: string[];
  mappingsByField: Record<string, FieldMapping>;
  headerSamples: Record<string, string[]>;
  onFieldMappingChange: (fieldName: string, updater: (prev: FieldMapping | undefined) => FieldMapping) => void;
  onClearMapping: (fieldName: string) => void;
  onCancel: () => void;
  onPreview: () => void;
};

const CSVImporterMapping: FC<CSVImporterMappingProps> = ({
  surveyFields,
  headers,
  mappingsByField,
  headerSamples,
  onFieldMappingChange,
  onClearMapping,
  onCancel,
  onPreview,
}) => {
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active || !over) return;
    const csvColumn = String(active.id);
    if (!over.id.toString().startsWith('drop-')) return;
    const fieldName = over.id.toString().replace('drop-', '');
    onFieldMappingChange(fieldName, (prev) => {
      if (!prev) {
        return { mode: 'csv', source: csvColumn };
      }
      if (prev.mode === 'concat') {
        const nextSources = Array.from(new Set([...(prev.sources ?? []), csvColumn]));
        return { ...prev, sources: nextSources };
      }
      if (prev.mode === 'csv' && prev.source) {
        const nextSources = Array.from(new Set([prev.source, csvColumn]));
        return { mode: 'concat', sources: nextSources, delimiter: prev.delimiter ?? ' ' };
      }
      return { ...prev, source: csvColumn, mode: 'csv' };
    });
  };

  const anyMapped = surveyFields.some((f) => !!mappingsByField[f.name]);
  const updateMode = (field: string, mode: TransformMode) => {
    onFieldMappingChange(field, () => ({ mode }) as FieldMapping);
  };

  const handleRemoveChip = (fieldName: string, source: string) => {
    const fm = mappingsByField[fieldName];
    if (!fm) return;

    if (fm.mode === 'csv' && fm.source === source) {
      onFieldMappingChange(fieldName, () => ({ mode: 'csv' }) as FieldMapping);
    } else if (fm.mode === 'concat') {
      onFieldMappingChange(fieldName, (prev) => {
        const cur = prev ?? { mode: 'concat', sources: [] };
        const nextSources = (cur.sources ?? []).filter((x) => x !== source);
        if (nextSources.length === 1) {
          return { mode: 'csv', source: nextSources[0] } as FieldMapping;
        }
        if (nextSources.length === 0) {
          return { mode: 'concat', sources: [] } as FieldMapping;
        }
        return { ...cur, sources: nextSources } as FieldMapping;
      });
    }
  };

  return (
    <div className={styles.csvImporter}>
      <div className={utilsStyles.spacer2} />
      <p className={styles.mappingTitle}>Drag CSV columns into fields or choose a transform mode</p>
      <DndContext onDragEnd={onDragEnd}>
        <div className={styles.csvChipsContainer}>
          {headers.map((h, i) => (
            <DraggableChip
              key={h || `col-${i}`}
              id={h || `Column ${i + 1}`}
              label={h || `Column ${i + 1}`}
              samples={headerSamples[h || `Column ${i + 1}`] ?? []}
            />
          ))}
        </div>

        <div className={styles.fieldsGrid}>
          {surveyFields.map((field) => {
            const fm = mappingsByField[field.name];
            return (
              <div key={field.name} className={styles.fieldCard}>
                <div className={styles.fieldHeader}>
                  <span className={styles.fieldTitle}>
                    {field.title}
                    {field.isRequired && <span className={styles.requiredIndicator}>*</span>}
                  </span>
                </div>

                <div className={styles.fieldBody}>
                  {/* Controls row always visible so users can switch modes even after choosing one */}
                  <div className={styles.dropControlsRow}>
                    <span className={styles.dropHintInline}>
                      {!fm?.mode || fm.mode === 'csv'
                        ? 'Drag CSV column(s) here'
                        : fm.mode === 'static'
                          ? 'Type 1 value for all rows'
                          : fm.mode === 'concat'
                            ? 'Concatenate CSV column(s) here'
                            : fm.mode === 'split'
                              ? 'Split CSV column(s) here'
                              : fm.mode === 'map'
                                ? 'Map CSV column(s) to values'
                                : ''}
                    </span>

                    <select
                      className={styles.modeSelectInline}
                      value={fm?.mode ?? 'csv'}
                      onChange={(e) => updateMode(field.name, e.target.value as TransformMode)}
                    >
                      <option value='csv'>CSV</option>
                      <option value='static'>Static</option>
                      <option value='concat'>Concat</option>
                      <option value='split'>Split</option>
                      <option value='map'>Map</option>
                    </select>
                    {fm && (
                      <Button
                        label='Clear'
                        size={BUTTON_SIZE.small}
                        bgColor={BUTTON_BG_COLOR.lightGrey}
                        color={BUTTON_COLOR.primary}
                        onClick={() => onClearMapping(field.name)}
                      />
                    )}
                  </div>

                  {(fm?.mode === undefined || fm?.mode === 'csv' || fm?.mode === 'concat') && (
                    <DroppableField fieldName={field.name} mapping={fm} onRemoveChip={handleRemoveChip} />
                  )}

                  {fm?.mode === 'static' && (
                    <Input
                      placeholder='Type value'
                      value={fm.staticValue ?? ''}
                      onChange={(e) =>
                        onFieldMappingChange(field.name, (prev) => ({
                          ...(prev ?? { mode: 'static' }),
                          staticValue: e.target.value,
                        }))
                      }
                    />
                  )}

                  {fm?.mode === 'concat' && (
                    <div className={styles.row}>
                      <label className={styles.inlineLabel}>Delimiter</label>
                      <input
                        className={styles.input}
                        placeholder='e.g. space, comma, -'
                        value={fm.delimiter ?? ''}
                        onChange={(e) =>
                          onFieldMappingChange(field.name, (prev) => ({
                            ...(prev ?? { mode: 'concat' }),
                            delimiter: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}

                  {fm?.mode === 'split' && (
                    <div className={styles.stack}>
                      <label className={styles.inlineLabel}>Source</label>
                      <select
                        className={styles.select}
                        value={fm.splitSource ?? ''}
                        onChange={(e) =>
                          onFieldMappingChange(field.name, (prev) => ({
                            ...(prev ?? { mode: 'split' }),
                            splitSource: e.target.value,
                          }))
                        }
                      >
                        <option value=''>Select column</option>
                        {headers.map((h, i) => (
                          <option key={h || `col-${i}`} value={h || `Column ${i + 1}`}>
                            {h || `Column ${i + 1}`}
                          </option>
                        ))}
                      </select>
                      <label className={styles.inlineLabel}>Delimiter</label>
                      <input
                        className={styles.input}
                        placeholder='e.g. , or space'
                        value={fm.splitDelimiter ?? ''}
                        onChange={(e) =>
                          onFieldMappingChange(field.name, (prev) => ({
                            ...(prev ?? { mode: 'split' }),
                            splitDelimiter: e.target.value,
                          }))
                        }
                      />
                      <label className={styles.inlineLabel}>Part Index</label>
                      <input
                        type='number'
                        min={0}
                        className={styles.input}
                        value={fm.splitIndex ?? 0}
                        onChange={(e) =>
                          onFieldMappingChange(field.name, (prev) => ({
                            ...(prev ?? { mode: 'split' }),
                            splitIndex: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  )}

                  {fm?.mode === 'map' && (
                    <div className={styles.stack}>
                      <label className={styles.inlineLabel}>Source</label>
                      <select
                        className={styles.select}
                        value={fm.mapSource ?? ''}
                        onChange={(e) =>
                          onFieldMappingChange(field.name, (prev) => ({
                            ...(prev ?? { mode: 'map' }),
                            mapSource: e.target.value,
                          }))
                        }
                      >
                        <option value=''>Select column</option>
                        {headers.map((h, i) => (
                          <option key={h || `col-${i}`} value={h || `Column ${i + 1}`}>
                            {h || `Column ${i + 1}`}
                          </option>
                        ))}
                      </select>
                      <div className={styles.mapPairs}>
                        {(fm.mapPairs ?? [{ from: '', to: '' }]).map((pair, idx) => (
                          <div key={idx} className={styles.mapRow}>
                            <input
                              className={styles.input}
                              placeholder='CSV value'
                              value={pair.from}
                              onChange={(e) =>
                                onFieldMappingChange(field.name, (prev) => {
                                  const next = {
                                    ...(prev ?? { mode: 'map' }),
                                    mapPairs: [...(prev?.mapPairs ?? [])],
                                  } as FieldMapping;
                                  next.mapPairs![idx] = { ...next.mapPairs![idx], from: e.target.value };
                                  return next;
                                })
                              }
                            />
                            <input
                              className={styles.input}
                              placeholder='Mapped value'
                              value={pair.to}
                              onChange={(e) =>
                                onFieldMappingChange(field.name, (prev) => {
                                  const next = {
                                    ...(prev ?? { mode: 'map' }),
                                    mapPairs: [...(prev?.mapPairs ?? [])],
                                  } as FieldMapping;
                                  next.mapPairs![idx] = { ...next.mapPairs![idx], to: e.target.value };
                                  return next;
                                })
                              }
                            />
                          </div>
                        ))}
                        <div className={styles.buttonRow}>
                          <Button
                            label='Add mapping'
                            size={BUTTON_SIZE.small}
                            bgColor={BUTTON_BG_COLOR.lightGrey}
                            color={BUTTON_COLOR.primary}
                            onClick={() =>
                              onFieldMappingChange(field.name, (prev) => ({
                                ...(prev ?? { mode: 'map' }),
                                mapPairs: [...(prev?.mapPairs ?? []), { from: '', to: '' }],
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DndContext>

      <div className={utilsStyles.spacer2} />
      <div className={styles.buttonRow}>
        <Button
          label='Cancel'
          size={BUTTON_SIZE.medium}
          bgColor={BUTTON_BG_COLOR.lightGrey}
          color={BUTTON_COLOR.primary}
          onClick={onCancel}
        />
        <Button
          label='Preview'
          size={BUTTON_SIZE.medium}
          bgColor={BUTTON_BG_COLOR.primary}
          color={BUTTON_COLOR.white}
          onClick={onPreview}
          disabled={!anyMapped}
        />
      </div>
      <div className={utilsStyles.spacer2} />
    </div>
  );
};

export default CSVImporterMapping;
