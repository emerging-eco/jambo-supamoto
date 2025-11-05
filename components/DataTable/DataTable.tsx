import { FC, useState, useMemo } from 'react';
import { Survey } from 'survey-react-ui';
import cls from 'classnames';
import styles from './DataTable.module.scss';
import Button, { BUTTON_BG_COLOR, BUTTON_COLOR, BUTTON_SIZE } from '@components/Button/Button';
import ButtonRound, { BUTTON_ROUND_COLOR, BUTTON_ROUND_SIZE } from '@components/ButtonRound/ButtonRound';
import Modal from '@components/Modal/Modal';
import LoaderMessage from '@components/LoaderMessage/LoaderMessage';
import utilsStyles from '@styles/utils.module.scss';
import EyeIcon from '@icons/eye.svg';
import SuccessIcon from '@icons/success.svg';
import CrossIcon from '@icons/cross.svg';
import SurveyFormClaim from '@components/SurveyForm/SurveyFormClaim';

type RowStatus = 'pending' | 'uploading' | 'success' | 'failed' | 'failed-twice';

type DataTableProps = {
  data: Record<string, any>[];
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  className?: string;
  columns?: string[]; // Optional: explicit column order. If not provided, will use keys from data
  surveyTemplate?: any;
  rowStatuses?: Record<number, RowStatus>;
  onRowSubmit?: (rowData: Record<string, any>, rowIndex: number) => Promise<void>;
  onRowDelete?: (rowIndex: number) => void;
  onSubmitAll?: (selectedRows?: Array<{ data: Record<string, any>; index: number }>) => Promise<void>;
  isSubmitting?: boolean;
  onImportAnother?: () => void;
  onClearData?: () => void;
  onExportSuccessful?: () => void;
  onExportFailed?: () => void;
};

const DataTable: FC<DataTableProps> = ({
  data,
  itemsPerPage = 15,
  className,
  onPageChange,
  columns: propColumns,
  surveyTemplate,
  rowStatuses,
  onRowSubmit,
  onRowDelete,
  onSubmitAll,
  isSubmitting = false,
  onImportAnother,
  onClearData,
  onExportSuccessful,
  onExportFailed,
}) => {
  // Temporary flag to hide action buttons/controls without removing code
  const SHOW_ACTIONS = false;
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [previewRow, setPreviewRow] = useState<{ data: Record<string, any>; index: number } | null>(null);
  const [submitConfirmRow, setSubmitConfirmRow] = useState<{ data: Record<string, any>; index: number } | null>(null);
  const [submitLoading, setSubmitLoading] = useState<{ data: Record<string, any>; index: number } | null>(null);
  const [deleteConfirmRow, setDeleteConfirmRow] = useState<number | null>(null);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

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

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      onPageChange?.(page);
    }
  };

  const handleColumnHeaderClick = (column: string) => {
    setExpandedColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(column)) {
        newSet.delete(column);
      } else {
        newSet.add(column);
      }
      return newSet;
    });
  };

  const getRowNumber = (rowIndex: number) => {
    return (currentPage - 1) * itemsPerPage + rowIndex + 1;
  };

  const isEmptyValue = (value: any): boolean => {
    return value === null || value === undefined || value === '';
  };

  const isColumnAllEmpty = (column: string): boolean => {
    return paginatedData.every((row) => isEmptyValue(row[column]));
  };

  const handlePreview = (row: Record<string, any>, rowIndex: number) => {
    const absoluteIndex = (currentPage - 1) * itemsPerPage + rowIndex;
    setPreviewRow({ data: row, index: absoluteIndex });
  };

  const handleSubmitClick = (row: Record<string, any>, rowIndex: number) => {
    const absoluteIndex = (currentPage - 1) * itemsPerPage + rowIndex;
    setSubmitConfirmRow({ data: row, index: absoluteIndex });
  };

  const handleSubmitConfirm = async () => {
    if (!submitConfirmRow || !onRowSubmit) return;
    setSubmitLoading(submitConfirmRow);
    setSubmitConfirmRow(null);
    try {
      await onRowSubmit(submitConfirmRow.data, submitConfirmRow.index);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitLoading(null);
    }
  };

  const handleDeleteClick = (rowIndex: number) => {
    const absoluteIndex = (currentPage - 1) * itemsPerPage + rowIndex;
    setDeleteConfirmRow(absoluteIndex);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmRow !== null && onRowDelete) {
      onRowDelete(deleteConfirmRow);
      // Adjust selected rows: remove deleted row and shift indices down for rows after it
      setSelectedRows((prev) => {
        const newSet = new Set<number>();
        prev.forEach((index) => {
          if (index === deleteConfirmRow) {
            // Skip deleted row
            return;
          } else if (index > deleteConfirmRow) {
            // Shift indices down by 1
            newSet.add(index - 1);
          } else {
            // Keep indices before deleted row
            newSet.add(index);
          }
        });
        return newSet;
      });
      setDeleteConfirmRow(null);
      // Reset to first page if we deleted the last item on current page
      if (paginatedData.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  const handleRowNumberClick = (absoluteIndex: number) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(absoluteIndex)) {
        newSet.delete(absoluteIndex);
      } else {
        newSet.add(absoluteIndex);
      }
      return newSet;
    });
  };

  const handleSubmitAll = async () => {
    if (!onSubmitAll) return;
    const selectedRowsData =
      selectedRows.size > 0
        ? Array.from(selectedRows)
            .filter((index) => index >= 0 && index < data.length)
            .map((index) => ({
              data: data[index],
              index,
            }))
            .sort((a, b) => a.index - b.index)
        : undefined;

    try {
      await onSubmitAll(selectedRowsData);
      if (selectedRowsData) {
        setSelectedRows(new Set()); // Clear selection after successful submit
      }
    } catch (error) {
      console.error('Submit all error:', error);
    }
  };

  const getStatusDisplay = (absoluteIndex: number) => {
    const status = rowStatuses?.[absoluteIndex];
    if (!status) return null;
    switch (status) {
      case 'success':
        return <span style={{ color: 'green', fontWeight: 500 }}>✓ Success</span>;
      case 'failed':
        return <span style={{ color: 'orange', fontWeight: 500 }}>⚠ Failed</span>;
      case 'failed-twice':
        return <span style={{ color: 'red', fontWeight: 500 }}>✗ Failed Twice</span>;
      case 'uploading':
        return <span style={{ color: 'blue', fontWeight: 500 }}>↻ Uploading...</span>;
      case 'pending':
        return <span style={{ color: '#666', fontWeight: 500 }}>○ Pending</span>;
      default:
        return null;
    }
  };

  const isRowSelected = (absoluteIndex: number): boolean => {
    return selectedRows.has(absoluteIndex);
  };

  const handleSelectAllOnPage = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, data.length);
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      const allSelectedOnPage = paginatedData.every((_, rowIndex) => {
        const absoluteIndex = startIndex + rowIndex;
        return newSet.has(absoluteIndex);
      });

      if (allSelectedOnPage) {
        // Deselect all on current page
        for (let i = startIndex; i < endIndex; i++) {
          newSet.delete(i);
        }
      } else {
        // Select all on current page
        for (let i = startIndex; i < endIndex; i++) {
          newSet.add(i);
        }
      }
      return newSet;
    });
  };

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
              <th
                className={cls(styles.headerCell, styles.rowNumberHeader)}
                onClick={handleSelectAllOnPage}
                style={{ cursor: 'pointer' }}
              >
                #
              </th>
              {rowStatuses && (
                <th className={cls(styles.headerCell)} style={{ minWidth: '120px' }}>
                  Status
                </th>
              )}
              {columns.map((column) => {
                const isAllEmpty = isColumnAllEmpty(column);
                const isExpanded = expandedColumns.has(column);
                return (
                  <th
                    key={column}
                    className={cls(
                      styles.headerCell,
                      isExpanded && styles.headerCellExpanded,
                      !isExpanded && isAllEmpty && styles.headerCellAllEmpty,
                    )}
                    onClick={() => handleColumnHeaderClick(column)}
                    style={{ cursor: 'pointer' }}
                  >
                    {column}
                  </th>
                );
              })}
              {SHOW_ACTIONS && surveyTemplate && <th className={cls(styles.headerCell, styles.actionsHeader)}></th>}
              {SHOW_ACTIONS && onRowSubmit && <th className={cls(styles.headerCell, styles.actionsHeader)}></th>}
              {SHOW_ACTIONS && onRowDelete && <th className={cls(styles.headerCell, styles.actionsHeader)}></th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIndex) => {
              const absoluteIndex = (currentPage - 1) * itemsPerPage + rowIndex;
              const isSelected = isRowSelected(absoluteIndex);
              return (
                <tr key={rowIndex} className={cls(styles.tableRow, isSelected && styles.tableRowSelected)}>
                  <td
                    className={cls(styles.tableCell, styles.rowNumberCell, isSelected && styles.rowNumberCellSelected)}
                    onClick={() => handleRowNumberClick(absoluteIndex)}
                  >
                    {getRowNumber(rowIndex)}
                  </td>
                  {rowStatuses && (
                    <td className={cls(styles.tableCell)} style={{ fontSize: '12px' }}>
                      {getStatusDisplay(absoluteIndex)}
                    </td>
                  )}
                  {columns.map((column) => {
                    const value = row[column];
                    const isEmpty = isEmptyValue(value);
                    const isExpanded = expandedColumns.has(column);
                    const isAllEmpty = isColumnAllEmpty(column);
                    return (
                      <td
                        key={column}
                        className={cls(
                          styles.tableCell,
                          isExpanded && styles.tableCellExpanded,
                          !isExpanded && isAllEmpty && styles.tableCellAllEmpty,
                          isEmpty && styles.tableCellEmpty,
                        )}
                      >
                        {isEmpty ? <span className={styles.emptyValue}>-</span> : value}
                      </td>
                    );
                  })}
                  {SHOW_ACTIONS && surveyTemplate && (
                    <td className={cls(styles.tableCell, styles.actionsCell)}>
                      <ButtonRound
                        size={BUTTON_ROUND_SIZE.small}
                        color={BUTTON_ROUND_COLOR.primary}
                        onClick={() => handlePreview(row, rowIndex)}
                        title='Preview'
                      >
                        <EyeIcon width={16} height={16} />
                      </ButtonRound>
                    </td>
                  )}
                  {SHOW_ACTIONS && onRowSubmit && (
                    <td className={cls(styles.tableCell, styles.actionsCell)}>
                      <ButtonRound
                        size={BUTTON_ROUND_SIZE.small}
                        color={BUTTON_ROUND_COLOR.success}
                        onClick={() => handleSubmitClick(row, rowIndex)}
                        title='Submit'
                      >
                        <SuccessIcon width={16} height={16} />
                      </ButtonRound>
                    </td>
                  )}
                  {SHOW_ACTIONS && onRowDelete && (
                    <td className={cls(styles.tableCell, styles.actionsCell)}>
                      <ButtonRound
                        size={BUTTON_ROUND_SIZE.small}
                        color={BUTTON_ROUND_COLOR.error}
                        onClick={() => handleDeleteClick(rowIndex)}
                        title='Delete'
                      >
                        <CrossIcon width={16} height={16} />
                      </ButtonRound>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(onSubmitAll || onImportAnother || onClearData || onExportSuccessful || onExportFailed) && (
        <div className={styles.controlsContainer}>
          <div className={styles.controlsRow}>
            {onSubmitAll && (
              <Button
                label={
                  selectedRows.size > 0
                    ? `Submit ${selectedRows.size} ${selectedRows.size === 1 ? 'row' : 'rows'}`
                    : 'Submit all rows'
                }
                size={BUTTON_SIZE.medium}
                bgColor={BUTTON_BG_COLOR.primary}
                color={BUTTON_COLOR.white}
                onClick={handleSubmitAll}
                disabled={isSubmitting || (selectedRows.size === 0 && data.length === 0)}
              />
            )}
            {onExportSuccessful && (
              <Button
                label='Export Successful'
                size={BUTTON_SIZE.medium}
                bgColor={BUTTON_BG_COLOR.primary}
                color={BUTTON_COLOR.white}
                onClick={onExportSuccessful}
              />
            )}
            {onExportFailed && (
              <Button
                label='Export Failed/Pending'
                size={BUTTON_SIZE.medium}
                bgColor={BUTTON_BG_COLOR.white}
                color={BUTTON_COLOR.primary}
                onClick={onExportFailed}
              />
            )}
            {onImportAnother && (
              <Button
                label='Import Another CSV'
                size={BUTTON_SIZE.medium}
                bgColor={BUTTON_BG_COLOR.primary}
                color={BUTTON_COLOR.white}
                onClick={onImportAnother}
              />
            )}
            {onClearData && (
              <Button
                label='Clear Data'
                size={BUTTON_SIZE.medium}
                bgColor={BUTTON_BG_COLOR.lightGrey}
                color={BUTTON_COLOR.primary}
                onClick={onClearData}
              />
            )}
          </div>
        </div>
      )}

      {previewRow && surveyTemplate && (
        <PreviewModal
          surveyTemplate={surveyTemplate}
          initialData={previewRow.data}
          onClose={() => setPreviewRow(null)}
        />
      )}

      {submitConfirmRow && (
        <Modal onClose={() => setSubmitConfirmRow(null)} title='Confirm Submit'>
          <div className={utilsStyles.columnJustifyCenter}>
            <div className={utilsStyles.spacer2} />
            <p>Are you sure you want to submit this row?</p>
            <div className={utilsStyles.spacer2} />
            <div className={styles.confirmButtons}>
              <Button
                label='Cancel'
                size={BUTTON_SIZE.medium}
                bgColor={BUTTON_BG_COLOR.lightGrey}
                color={BUTTON_COLOR.primary}
                onClick={() => setSubmitConfirmRow(null)}
              />
              <Button
                label='Confirm'
                size={BUTTON_SIZE.medium}
                bgColor={BUTTON_BG_COLOR.primary}
                color={BUTTON_COLOR.white}
                onClick={handleSubmitConfirm}
              />
            </div>
            <div className={utilsStyles.spacer2} />
          </div>
        </Modal>
      )}

      {submitLoading && (
        <Modal onClose={() => {}} title='Submitting...' className={styles.loadingModal}>
          <div className={utilsStyles.columnJustifyCenter}>
            <LoaderMessage message='Submitting row data...' />
          </div>
        </Modal>
      )}

      {isSubmitting && (
        <Modal onClose={() => {}} title='Submitting...' className={styles.loadingModal}>
          <div className={utilsStyles.columnJustifyCenter}>
            <LoaderMessage
              message={
                selectedRows.size > 0
                  ? `Submitting ${selectedRows.size} ${selectedRows.size === 1 ? 'row' : 'rows'}...`
                  : 'Submitting all rows...'
              }
            />
          </div>
        </Modal>
      )}

      {deleteConfirmRow !== null && (
        <Modal onClose={() => setDeleteConfirmRow(null)} title='Confirm Delete'>
          <div className={utilsStyles.columnJustifyCenter}>
            <div className={utilsStyles.spacer2} />
            <p>Are you sure you want to delete this row? This action cannot be undone.</p>
            <div className={utilsStyles.spacer2} />
            <div className={styles.confirmButtons}>
              <Button
                label='Cancel'
                size={BUTTON_SIZE.medium}
                bgColor={BUTTON_BG_COLOR.lightGrey}
                color={BUTTON_COLOR.primary}
                onClick={() => setDeleteConfirmRow(null)}
              />
              <Button
                label='Delete'
                size={BUTTON_SIZE.medium}
                bgColor={BUTTON_BG_COLOR.error}
                color={BUTTON_COLOR.white}
                onClick={handleDeleteConfirm}
              />
            </div>
            <div className={utilsStyles.spacer2} />
          </div>
        </Modal>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            label='Previous'
            size={BUTTON_SIZE.small}
            bgColor={BUTTON_BG_COLOR.lightGrey}
            color={BUTTON_COLOR.primary}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          />
          <span className={styles.pageInfo}>
            Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, data.length)} of{' '}
            {data.length}
          </span>
          <Button
            label='Next'
            size={BUTTON_SIZE.small}
            bgColor={BUTTON_BG_COLOR.lightGrey}
            color={BUTTON_COLOR.primary}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          />
        </div>
      )}
    </div>
  );
};

type PreviewModalProps = {
  surveyTemplate: any;
  initialData: Record<string, any>;
  onClose: () => void;
};

const PreviewModal: FC<PreviewModalProps> = ({ surveyTemplate, initialData, onClose }) => {
  return (
    <Modal onClose={onClose} title='Preview Row Data' className={styles.previewModal}>
      <SurveyFormClaim surveyTemplate={surveyTemplate} data={initialData} />
    </Modal>
  );
};

export default DataTable;
