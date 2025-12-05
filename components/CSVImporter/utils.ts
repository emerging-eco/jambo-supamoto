import { FieldMapping } from './types';

export const parseCSV = (text: string): string[][] => {
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

export const applyTransform = (
  field: string,
  row: string[],
  headerMap: Record<string, number>,
  mappingsByField: Record<string, FieldMapping>,
): any => {
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
