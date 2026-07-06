import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { Search, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import styles from './DataTable.module.css';
import { DocumentData } from '@/lib/types';

interface DataTableProps {
  data: DocumentData[];
  onRowClick?: (row: DocumentData) => void;
}

export default function DataTable({ data, onRowClick }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns: ColumnDef<DocumentData>[] = [
    {
      accessorKey: 'pdfName',
      header: 'PDF Name',
      cell: (info) => <span className={styles.pdfName}>{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'surveyNumbers',
      header: 'Survey Number',
      cell: (info) => {
        const numbers = info.getValue() as string[];
        return <span>{numbers && numbers.length > 0 ? numbers.join(', ') : '-'}</span>;
      },
      filterFn: (row, columnId, filterValue) => {
        const numbers = row.getValue(columnId) as string[];
        if (!numbers) return false;
        return numbers.some(num => num.toLowerCase().includes(filterValue.toLowerCase()));
      }
    },
    {
      accessorKey: 'village',
      header: 'Village',
    },
    {
      accessorKey: 'taluk',
      header: 'Taluk',
    },
    {
      accessorKey: 'district',
      header: 'District',
    },
    {
      id: 'open',
      header: 'Open',
      cell: (info) => (
        <button 
          className={styles.openButton}
          onClick={(e) => {
            e.stopPropagation(); // prevent row click if needed
            if (onRowClick) onRowClick(info.row.original);
          }}
          title="Open Document"
        >
          <Eye size={18} />
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Custom global filter function to only search in Survey Numbers and Village Name
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const village = (row.getValue('village') as string || '').toLowerCase();
      const surveyNumbers = row.getValue('surveyNumbers') as string[] || [];
      
      const matchesVillage = village.includes(search);
      const matchesSurvey = surveyNumbers.some(num => num.toLowerCase().includes(search));
      
      return matchesVillage || matchesSurvey;
    }
  });

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search Survey Number or Village..."
            className={styles.searchInput}
          />
        </div>
      </div>
      
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th 
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={header.column.getCanSort() ? styles.sortableHeader : ''}
                  >
                    <div className={styles.headerContent}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: <ChevronUp size={14} className={styles.sortIcon} />,
                        desc: <ChevronDown size={14} className={styles.sortIcon} />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr 
                  key={row.id} 
                  className={styles.tableRow}
                  onClick={() => onRowClick && onRowClick(row.original)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className={styles.emptyState}>
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className={styles.pagination}>
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className={styles.pageButton}
        >
          Previous
        </button>
        <span className={styles.pageInfo}>
          Page {table.getState().pagination.pageIndex + 1} of{' '}
          {table.getPageCount() || 1}
        </span>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className={styles.pageButton}
        >
          Next
        </button>
      </div>
    </div>
  );
}
