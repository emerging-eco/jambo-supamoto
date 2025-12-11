import { FC, useState, useRef, useEffect, useMemo } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import styles from './CSVImporter.module.scss';
import Button, { BUTTON_BG_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import utilsStyles from '@styles/utils.module.scss';
import Input from '@components/Input/Input';
import DraggableChip from './DraggableChip';
import DroppableField from './DroppableField';
import { TransformMode, FieldMapping } from './types';

type CSVImporterMappingProps = {
  surveyFields: Array<{
    name: string;
    title: string;
    isRequired?: boolean;
    type?: string;
    inputType?: string;
    choices?: Array<{ value: string; text: string }> | string[];
  }>;
  headers: string[];
  mappingsByField: Record<string, FieldMapping>;
  headerSamples: Record<string, string[]>;
  onFieldMappingChange: (fieldName: string, updater: (prev: FieldMapping | undefined) => FieldMapping) => void;
  onClearMapping: (fieldName: string) => void;
  onCancel: () => void;
  onPreview: () => void;
};

/**
 * Normalizes choices to a consistent format (array of objects with value and text).
 * Handles both string arrays and object arrays.
 */
const normalizeChoices = (
  choices?: Array<{ value: string; text: string }> | string[],
): Array<{ value: string; text: string }> => {
  if (!choices || choices.length === 0) return [];

  // If first item is a string, treat all as strings
  if (typeof choices[0] === 'string') {
    return (choices as string[]).map((choice) => ({
      value: choice,
      text: choice,
    }));
  }

  // Otherwise, assume they're already objects
  return choices as Array<{ value: string; text: string }>;
};

/**
 * Determines the appropriate HTML input type based on the field's type and inputType properties.
 * This helps provide the correct input control for static values in CSV import mapping.
 */
const getInputTypeForField = (field: { type?: string; inputType?: string }): string => {
  // Check inputType first (more specific, e.g., 'number', 'email', 'date', etc.)
  if (field.inputType) {
    const inputType = field.inputType.toLowerCase();
    // Map common input types
    if (['number', 'numeric'].includes(inputType)) return 'number';
    if (['email'].includes(inputType)) return 'email';
    if (['date'].includes(inputType)) return 'date';
    if (['datetime', 'datetime-local'].includes(inputType)) return 'datetime-local';
    if (['time'].includes(inputType)) return 'time';
    if (['url'].includes(inputType)) return 'url';
    if (['tel', 'phone'].includes(inputType)) return 'tel';
    if (['password'].includes(inputType)) return 'password';
    if (['text'].includes(inputType)) return 'text';
  }

  // Check type property (SurveyJS question type)
  if (field.type) {
    const type = field.type.toLowerCase();
    // Map SurveyJS question types to input types
    if (['text', 'comment', 'multipletext'].includes(type)) return 'text';
    if (['number', 'expression'].includes(type)) return 'number';
    if (['boolean'].includes(type)) return 'checkbox';
    if (['dropdown', 'radiogroup', 'checkbox', 'tagbox'].includes(type)) return 'text';
    if (['date', 'datepicker'].includes(type)) return 'date';
    if (['datetime', 'datetimepicker'].includes(type)) return 'datetime-local';
    if (['time', 'timepicker'].includes(type)) return 'time';
    if (['email'].includes(type)) return 'email';
    if (['url'].includes(type)) return 'url';
  }

  // Default to text
  return 'text';
};

/**
 * Determines if the field expects a boolean value and returns appropriate props for checkbox input.
 */
const getBooleanInputProps = (field: { type?: string; inputType?: string }) => {
  const isBoolean = field.type?.toLowerCase() === 'boolean' || field.inputType?.toLowerCase() === 'boolean';
  return isBoolean;
};

/**
 * Determines if the field is a checkbox type with multiple choices.
 */
const isCheckboxWithChoices = (field: {
  type?: string;
  choices?: Array<{ value: string; text: string }> | string[];
}): boolean => {
  return field.type?.toLowerCase() === 'checkbox' && !!field.choices && field.choices.length > 0;
};

/**
 * Determines if the field is a radiogroup type with choices.
 */
const isRadiogroupWithChoices = (field: {
  type?: string;
  choices?: Array<{ value: string; text: string }> | string[];
}): boolean => {
  return field.type?.toLowerCase() === 'radiogroup' && !!field.choices && field.choices.length > 0;
};

/**
 * Determines if the field is a dropdown type with choices.
 */
const isDropdownWithChoices = (field: {
  type?: string;
  choices?: Array<{ value: string; text: string }> | string[];
}): boolean => {
  return field.type?.toLowerCase() === 'dropdown' && !!field.choices && field.choices.length > 0;
};

/**
 * Parses a JSON array string or comma-separated string into an array of values.
 */
const parseSelectedValues = (value: string | undefined): string[] => {
  if (!value) return [];
  try {
    // Try parsing as JSON array first
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // If not JSON, try comma-separated
    if (value.includes(',')) {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v);
    }
  }
  // Single value
  return value ? [value] : [];
};

/**
 * Converts an array of values to a JSON array string for storage.
 */
const stringifySelectedValues = (values: string[]): string => {
  return JSON.stringify(values);
};

/**
 * Custom multi-select dropdown component for checkbox fields
 */
const MultiSelectDropdown: FC<{
  choices: Array<{ value: string; text: string }>;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}> = ({ choices, selectedValues, onChange, placeholder = 'Select options...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    return `${selectedValues.length} selected`;
  };

  return (
    <div className={styles.multiSelectWrapper} ref={dropdownRef}>
      <button type='button' className={styles.multiSelectButton} onClick={() => setIsOpen(!isOpen)}>
        <span className={styles.multiSelectButtonText}>{getDisplayText()}</span>
        <span className={styles.multiSelectArrow}>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className={styles.multiSelectDropdown} onClick={(e) => e.stopPropagation()}>
          {choices.map((choice) => (
            <label key={choice.value} className={styles.multiSelectOption}>
              <input
                type='checkbox'
                checked={selectedValues.includes(choice.value)}
                onChange={() => toggleOption(choice.value)}
              />
              <span>{choice.text}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Custom single-select dropdown component for radiogroup fields
 */
const SingleSelectDropdown: FC<{
  choices: Array<{ value: string; text: string }>;
  selectedValue: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ choices, selectedValue, onChange, placeholder = 'Select option...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const radioGroupName = useMemo(() => `radio-group-${Math.random().toString(36).substr(2, 9)}`, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectOption = (value: string) => {
    onChange(value);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!selectedValue) return placeholder;
    const choice = choices.find((c) => c.value === selectedValue);
    return choice?.text || selectedValue;
  };

  return (
    <div className={styles.multiSelectWrapper} ref={dropdownRef}>
      <button type='button' className={styles.multiSelectButton} onClick={() => setIsOpen(!isOpen)}>
        <span className={styles.multiSelectButtonText}>{getDisplayText()}</span>
        <span className={styles.multiSelectArrow}>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className={styles.multiSelectDropdown} onClick={(e) => e.stopPropagation()}>
          {choices.map((choice) => (
            <label key={choice.value} className={styles.multiSelectOption}>
              <input
                type='radio'
                name={radioGroupName}
                checked={selectedValue === choice.value}
                onChange={() => selectOption(choice.value)}
              />
              <span>{choice.text}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
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

                  {fm?.mode === 'static' &&
                    (() => {
                      const inputType = getInputTypeForField(field);
                      const isBoolean = getBooleanInputProps(field);
                      const isCheckboxMulti = isCheckboxWithChoices(field);
                      const isRadiogroupSingle = isRadiogroupWithChoices(field);
                      const isDropdownSingle = isDropdownWithChoices(field);

                      if (isCheckboxMulti) {
                        const selectedValues = parseSelectedValues(fm.staticValue);
                        const normalizedChoices = normalizeChoices(field.choices);
                        return (
                          <div className={styles.stack}>
                            <label className={styles.inlineLabel}>Select one or more options:</label>
                            <MultiSelectDropdown
                              choices={normalizedChoices}
                              selectedValues={selectedValues}
                              onChange={(newSelected) => {
                                onFieldMappingChange(field.name, (prev) => ({
                                  ...(prev ?? { mode: 'static' }),
                                  staticValue: stringifySelectedValues(newSelected),
                                }));
                              }}
                              placeholder='Select options...'
                            />
                          </div>
                        );
                      }

                      if (isRadiogroupSingle || isDropdownSingle) {
                        const normalizedChoices = normalizeChoices(field.choices);
                        return (
                          <div className={styles.stack}>
                            <label className={styles.inlineLabel}>Select an option:</label>
                            <SingleSelectDropdown
                              choices={normalizedChoices}
                              selectedValue={fm.staticValue}
                              onChange={(value) => {
                                onFieldMappingChange(field.name, (prev) => ({
                                  ...(prev ?? { mode: 'static' }),
                                  staticValue: value,
                                }));
                              }}
                              placeholder='Select option...'
                            />
                          </div>
                        );
                      }

                      if (isBoolean) {
                        const isChecked = fm.staticValue === 'true';
                        return (
                          <div className={styles.booleanSwitchContainer}>
                            <span className={isChecked ? styles.booleanSwitchLabelBlurred : styles.booleanSwitchLabel}>
                              false
                            </span>
                            <label className={styles.booleanSwitch}>
                              <input
                                type='checkbox'
                                checked={isChecked}
                                onChange={(e) =>
                                  onFieldMappingChange(field.name, (prev) => ({
                                    ...(prev ?? { mode: 'static' }),
                                    staticValue: String(e.target.checked),
                                  }))
                                }
                              />
                              <span className={styles.booleanSwitchSlider}></span>
                            </label>
                            <span className={isChecked ? styles.booleanSwitchLabel : styles.booleanSwitchLabelBlurred}>
                              true
                            </span>
                          </div>
                        );
                      }

                      return (
                        <Input
                          type={inputType}
                          placeholder={
                            inputType === 'number'
                              ? 'Enter number'
                              : inputType === 'date'
                                ? 'Select date'
                                : inputType === 'email'
                                  ? 'Enter email'
                                  : 'Type value'
                          }
                          value={fm.staticValue ?? ''}
                          onChange={(e) =>
                            onFieldMappingChange(field.name, (prev) => ({
                              ...(prev ?? { mode: 'static' }),
                              staticValue: e.target.value,
                            }))
                          }
                        />
                      );
                    })()}

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
