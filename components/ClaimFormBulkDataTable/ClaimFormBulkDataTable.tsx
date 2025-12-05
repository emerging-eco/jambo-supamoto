import { FC, useState, useMemo, useEffect } from 'react';
import cls from 'classnames';
import styles from './ClaimFormBulkDataTable.module.scss';
import Button, { BUTTON_BG_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import Loader from '@components/Loader/Loader';

export type RowStatus = 'default' | 'submitting' | 'success' | 'error';

// Legacy status types from ClaimFormBulk for compatibility
type LegacyRowStatus = 'pending' | 'uploading' | 'success' | 'failed' | 'failed-twice';

type ClaimFormBulkDataTableProps = {
  data: Record<string, any>[];
  columns?: string[];
  className?: string;
  rowStatuses?: Record<number, RowStatus | LegacyRowStatus>;
};

const ClaimFormBulkDataTable: FC<ClaimFormBulkDataTableProps> = ({
  data,
  columns: propColumns,
  className,
  rowStatuses,
}) => {
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const columns = useMemo(() => {
    if (propColumns && propColumns.length > 0) {
      return propColumns;
    }
    if (data.length === 0) return [];
    // Get all unique keys from all data rows
    const allKeys = new Set<string>();
    data.forEach((row) => {
      Object.keys(row).forEach((key) => allKeys.add(key));
    });
    return Array.from(allKeys);
  }, [data, propColumns]);

  const totalPages = Math.ceil(data.length / rowsPerPage);

  // Reset to page 1 when rowsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  const displayedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, rowsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const isEmptyValue = (value: any): boolean => {
    return value === null || value === undefined || value === '';
  };

  const formatHeader = (header: string): string => {
    const colonIndex = header.indexOf(':');
    if (colonIndex !== -1) {
      return header.substring(colonIndex + 1).trim();
    }
    return header;
  };

  const mapStatus = (status: RowStatus | LegacyRowStatus | undefined): RowStatus => {
    if (!status) return 'default';
    switch (status) {
      case 'pending':
        return 'default';
      case 'uploading':
        return 'submitting';
      case 'success':
        return 'success';
      case 'failed':
      case 'failed-twice':
        return 'error';
      default:
        return status as RowStatus;
    }
  };

  const rowCountOptions = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  if (data.length === 0) {
    return (
      <div className={cls(styles.tableContainer, className)}>
        <p className={styles.emptyMessage}>No data to display</p>
      </div>
    );
  }

  return (
    <div className={cls(styles.tableContainer, className)}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={cls(styles.headerCell, styles.rowNumberHeader)}>#</th>
              {columns.map((column) => (
                <th key={column} className={styles.headerCell}>
                  {formatHeader(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedData.map((row, rowIndex) => {
              const absoluteRowNumber = (currentPage - 1) * rowsPerPage + rowIndex + 1;
              const absoluteIndex = (currentPage - 1) * rowsPerPage + rowIndex;
              const status = mapStatus(rowStatuses?.[absoluteIndex]);

              const renderRowNumberCell = () => {
                switch (status) {
                  case 'submitting':
                    return (
                      <div className={styles.loaderContainer}>
                        <Loader size={16} />
                      </div>
                    );
                  case 'success':
                    return <span className={cls(styles.rowNumber, styles.rowNumberSuccess)}>{absoluteRowNumber}</span>;
                  case 'error':
                    return <span className={cls(styles.rowNumber, styles.rowNumberError)}>{absoluteRowNumber}</span>;
                  default:
                    return <span className={styles.rowNumber}>{absoluteRowNumber}</span>;
                }
              };

              return (
                <tr key={rowIndex} className={styles.tableRow}>
                  <td className={cls(styles.tableCell, styles.rowNumberCell)}>{renderRowNumberCell()}</td>
                  {columns.map((column) => {
                    const value = row[column];
                    const isEmpty = isEmptyValue(value);
                    return (
                      <td key={column} className={cls(styles.tableCell, isEmpty && styles.tableCellEmpty)}>
                        {isEmpty ? <span className={styles.emptyValue}>-</span> : String(value)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.rowCountSelector}>
        <label className={styles.rowCountLabel}>
          Rows per page:
          <select
            className={styles.rowCountSelect}
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            {rowCountOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.paginationSection}>
          {totalPages > 1 && (
            <Button
              label='Previous'
              size={BUTTON_SIZE.small}
              bgColor={BUTTON_BG_COLOR.lightGrey}
              color={BUTTON_COLOR.primary}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            />
          )}
          <span className={styles.rowCountInfo}>
            Showing {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, data.length)} of{' '}
            {data.length} rows
          </span>
          {totalPages > 1 && (
            <Button
              label='Next'
              size={BUTTON_SIZE.small}
              bgColor={BUTTON_BG_COLOR.lightGrey}
              color={BUTTON_COLOR.primary}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaimFormBulkDataTable;
