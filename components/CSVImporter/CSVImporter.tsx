import { FC, useState, useRef, useMemo } from 'react';
import cls from 'classnames';
import styles from './CSVImporter.module.scss';
import Button, { BUTTON_BG_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import utilsStyles from '@styles/utils.module.scss';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import Input from '@components/Input/Input';

type CSVImporterProps = {
  surveyFields: Array<{ name: string; title: string }>;
  onImport: (
    data: Record<string, any>[],
    originalCsv?: { headers: string[]; rows: string[][]; hasHeaders: boolean },
  ) => void;
  onCancel: () => void;
};

type TransformMode = 'csv' | 'static' | 'concat' | 'split' | 'map';

type FieldMapping = {
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

const CSVImporter: FC<CSVImporterProps> = ({ surveyFields, onImport, onCancel }) => {
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [mappingsByField, setMappingsByField] = useState<Record<string, FieldMapping>>({});
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [step, setStep] = useState<'upload' | 'uploadPreview' | 'mapping' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadOver, setIsUploadOver] = useState(false);

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

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n after \r
        }
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField.trim());
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
        }
      } else {
        currentField += char;
      }
    }

    // Add last field and row
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
    }

    return rows;
  };

  const loadFile = (file: File | undefined | null) => {
    if (!file) return;
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    loadFile(event.target.files?.[0]);
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
    loadFile(file);
  };

  const setFieldMapping = (fieldName: string, updater: (prev: FieldMapping | undefined) => FieldMapping) => {
    setMappingsByField((prev) => ({ ...prev, [fieldName]: updater(prev[fieldName]) }));
  };

  const handlePreview = () => {
    setStep('preview');
  };

  const applyTransform = (field: string, row: string[], headerMap: Record<string, number>): any => {
    const fm = mappingsByField[field];
    if (!fm) return null;
    switch (fm.mode) {
      case 'csv': {
        if (!fm.source) return null;
        const idx = headerMap[fm.source];
        return idx != null ? (row[idx] ?? null) : null;
      }
      case 'static':
        return fm.staticValue ?? null;
      case 'concat': {
        const parts = (fm.sources ?? []).map((src) => {
          const idx = headerMap[src];
          return idx != null ? (row[idx] ?? '') : '';
        });
        return parts.join(fm.delimiter ?? '');
      }
      case 'split': {
        if (!fm.splitSource) return null;
        const idx = headerMap[fm.splitSource];
        const val = idx != null ? (row[idx] ?? '') : '';
        const pieces = String(val).split(fm.splitDelimiter ?? ' ');
        return pieces[fm.splitIndex ?? 0] ?? '';
      }
      case 'map': {
        const dict: Record<string, string> = {};
        (fm.mapPairs ?? []).forEach((p) => (dict[p.from] = p.to));
        const idx = fm.mapSource ? headerMap[fm.mapSource] : undefined;
        const srcVal = idx != null ? (row[idx] ?? '') : '';
        return dict[String(srcVal)] ?? srcVal ?? null;
      }
      default:
        return null;
    }
  };

  const handleImport = () => {
    const dataRows = hasHeaders ? csvData.slice(1) : csvData;
    const mappedData: Record<string, any>[] = [];
    const headerMap: Record<string, number> = {};
    headers.forEach((h, i) => (headerMap[h || `Column ${i + 1}`] = i));

    dataRows.forEach((row) => {
      const mappedRow: Record<string, any> = {};
      surveyFields.forEach((field) => {
        mappedRow[field.name] = applyTransform(field.name, row, headerMap);
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
        mappedRow[field.name] = applyTransform(field.name, row, headerMap);
      });
      return mappedRow;
    });
  }, [step, csvData, headers, hasHeaders, mappingsByField, surveyFields]);

  if (step === 'upload') {
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
  }

  if (step === 'uploadPreview') {
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
    // do not set state here to avoid re-render loops; use local 'types'

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
            onClick={() => setStep('upload')}
          />
          <div className={styles.fullFlex} />
          <div className={styles.headersNotice}>
            <label className={styles.checkboxLabelStrong}>
              <input type='checkbox' checked={hasHeaders} onChange={(e) => setHasHeaders(e.target.checked)} />
              CSV file has headers
            </label>
          </div>
          <Button
            label='Continue'
            size={BUTTON_SIZE.large}
            bgColor={BUTTON_BG_COLOR.primary}
            color={BUTTON_COLOR.white}
            onClick={() => setStep('mapping')}
          />
        </div>
        <div className={utilsStyles.spacer2} />
      </div>
    );
  }

  if (step === 'mapping') {
    // Build sample values per header for more informative chips (computed globally)
    const headerSamples = headerSamplesGlobal;

    const DraggableChip: FC<{ id: string; label: string }> = ({ id, label }) => {
      const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
      const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
      return (
        <div ref={setNodeRef} className={styles.csvChipCard} style={style} {...listeners} {...attributes}>
          <div className={styles.csvChipHeader}>{label}</div>
          <div className={styles.csvChipBody}>
            {(headerSamples[label] ?? []).map((s, i) => (
              <div key={i} className={styles.csvChipSample}>
                {s || '-'}
              </div>
            ))}
            <div className={styles.csvChipSample}>...</div>
          </div>
        </div>
      );
    };

    const DroppableField: FC<{ fieldName: string }> = ({ fieldName }) => {
      const { setNodeRef, isOver } = useDroppable({ id: `drop-${fieldName}` });
      const fm = mappingsByField[fieldName];
      return (
        <div ref={setNodeRef} className={cls(styles.fieldDropZone, isOver && styles.fieldDropZoneOver)}>
          <div className={styles.assignedChipsRow}>
            {fm?.mode === 'csv' && fm.source && (
              <span className={styles.assignedChip}>
                {fm.source}
                <button
                  className={styles.removeChip}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFieldMapping(fieldName, () => ({ mode: 'csv' }) as FieldMapping);
                  }}
                >
                  ×
                </button>
              </span>
            )}
            {fm?.mode === 'concat' &&
              (fm.sources ?? []).map((s) => (
                <span key={s} className={styles.assignedChip}>
                  {s}
                  <button
                    className={styles.removeChip}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFieldMapping(fieldName, (prev) => {
                        const cur = prev ?? { mode: 'concat', sources: [] };
                        const nextSources = (cur.sources ?? []).filter((x) => x !== s);
                        if (nextSources.length === 1) {
                          return { mode: 'csv', source: nextSources[0] } as FieldMapping;
                        }
                        if (nextSources.length === 0) {
                          return { mode: 'concat', sources: [] } as FieldMapping;
                        }
                        return { ...cur, sources: nextSources } as FieldMapping;
                      });
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

    const onDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (!active || !over) return;
      const csvColumn = String(active.id);
      if (!over.id.toString().startsWith('drop-')) return;
      const fieldName = over.id.toString().replace('drop-', '');
      setFieldMapping(fieldName, (prev) => {
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
      setFieldMapping(field, () => ({ mode }) as FieldMapping);
    };

    return (
      <div className={styles.csvImporter}>
        <div className={utilsStyles.spacer2} />
        <p className={styles.mappingTitle}>Drag CSV columns into fields or choose a transform mode</p>
        <DndContext onDragEnd={onDragEnd}>
          <div className={styles.csvChipsContainer}>
            {headers.map((h, i) => (
              <DraggableChip key={h || `col-${i}`} id={h || `Column ${i + 1}`} label={h || `Column ${i + 1}`} />
            ))}
          </div>

          <div className={styles.fieldsGrid}>
            {surveyFields.map((field) => {
              const fm = mappingsByField[field.name];
              return (
                <div key={field.name} className={styles.fieldCard}>
                  <div className={styles.fieldHeader}>
                    <span className={styles.fieldTitle}>{field.title}</span>
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
                          onClick={() =>
                            setMappingsByField((prev) => {
                              const next = { ...prev } as Record<string, FieldMapping>;
                              delete next[field.name];
                              return next;
                            })
                          }
                        />
                      )}
                    </div>

                    {(fm?.mode === undefined || fm?.mode === 'csv' || fm?.mode === 'concat') && (
                      <DroppableField fieldName={field.name} />
                    )}

                    {fm?.mode === 'static' && (
                      <Input
                        // className={styles.input}
                        placeholder='Type value'
                        value={fm.staticValue ?? ''}
                        onChange={(e) =>
                          setFieldMapping(field.name, (prev) => ({
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
                            setFieldMapping(field.name, (prev) => ({
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
                            setFieldMapping(field.name, (prev) => ({
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
                            setFieldMapping(field.name, (prev) => ({
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
                            setFieldMapping(field.name, (prev) => ({
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
                            setFieldMapping(field.name, (prev) => ({
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
                                  setFieldMapping(field.name, (prev) => {
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
                                  setFieldMapping(field.name, (prev) => {
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
                                setFieldMapping(field.name, (prev) => ({
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
            onClick={handleImport}
            disabled={!anyMapped}
          />
        </div>
        <div className={utilsStyles.spacer2} />
      </div>
    );
  }

  // Preview step
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
      <p className={styles.rowCount}>Total rows to import: {hasHeaders ? csvData.length - 1 : csvData.length}</p>
      <div className={utilsStyles.spacer2} />
      <div className={styles.buttonRow}>
        <Button
          label='Back'
          size={BUTTON_SIZE.medium}
          bgColor={BUTTON_BG_COLOR.lightGrey}
          color={BUTTON_COLOR.primary}
          onClick={() => setStep('mapping')}
        />
        <Button
          label='Import'
          size={BUTTON_SIZE.medium}
          bgColor={BUTTON_BG_COLOR.primary}
          color={BUTTON_COLOR.white}
          onClick={handleImport}
        />
      </div>
      <div className={utilsStyles.spacer2} />
    </div>
  );
};

export default CSVImporter;
