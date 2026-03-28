import type { CSSProperties, ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  className?: string
  render?: (row: T) => ReactNode
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyLabel?: string
  rowClassName?: string
  variant?: 'default' | 'row-block'
  desktopMinWidthClass?: string
  mobileShowHeaders?: boolean
  desktopScrollMode?: 'auto' | 'always'
  desktopHeightClass?: string
  stickyHeader?: boolean
}

const Table = <T,>({
  columns,
  data,
  emptyLabel = 'Sin registros',
  rowClassName = '',
  variant = 'default',
  desktopMinWidthClass = 'min-w-full',
  mobileShowHeaders = true,
  desktopScrollMode = 'auto',
  desktopHeightClass = '',
  stickyHeader = false,
}: TableProps<T>) => {
  const isRowBlock = variant === 'row-block'
  const desktopScrollClass =
    desktopScrollMode === 'always' ? 'overflow-x-scroll overflow-y-scroll' : 'overflow-x-auto overflow-y-auto'
  const renderValue = (column: Column<T>, row: T) => {
    return column.render ? column.render(row) : (row as Record<string, ReactNode>)[column.key]
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-soft">
      <div className="md:hidden">
        {data.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">{emptyLabel}</div>
        ) : (
          <div className={isRowBlock ? 'space-y-2 p-2' : 'divide-y divide-slate-100'}>
            {data.map((row, index) => (
              <div
                key={index}
                className={`space-y-2 p-3 ${isRowBlock ? 'rounded-2xl border border-slate-200/80 bg-white shadow-sm' : ''} ${rowClassName}`}
              >
                {columns.map((column) =>
                  mobileShowHeaders ? (
                    <div key={column.key} className="flex items-start justify-between gap-4">
                      <span className="shrink-0 text-xs font-semibold uppercase text-slate-400">{column.header}</span>
                      <div className="break-words text-right text-sm text-slate-700">{renderValue(column, row)}</div>
                    </div>
                  ) : (
                    <div key={column.key} className="break-words text-sm text-slate-700">
                      {renderValue(column, row)}
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className={`hidden md:block ${desktopScrollClass} ${desktopHeightClass}`}
        style={desktopScrollMode === 'always' ? ({ scrollbarGutter: 'stable both-edges' } as CSSProperties) : undefined}
      >
        <table
          className={`${desktopMinWidthClass} w-full text-left text-sm ${
            isRowBlock ? 'border-separate [border-spacing:0_8px]' : 'border-collapse'
          }`}
        >
          <thead className={`bg-slate-100 text-xs uppercase tracking-wide text-slate-500 ${stickyHeader ? 'sticky top-0 z-20' : ''}`}>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`px-4 py-3 ${column.className ?? ''}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-500">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index} className={`${isRowBlock ? '' : 'border-t border-slate-200/70'} ${rowClassName}`}>
                  {columns.map((column, columnIndex) => (
                    <td
                      key={column.key}
                      className={
                        `${column.className ?? ''} ` +
                        (isRowBlock
                          ? `bg-slate-50 px-4 py-3 border-y border-slate-300 ${
                              columnIndex === 0 ? 'rounded-l-2xl border-l' : ''
                            } ${columnIndex === columns.length - 1 ? 'rounded-r-2xl border-r' : ''}`
                          : 'px-4 py-3')
                      }
                    >
                      {renderValue(column, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Table
