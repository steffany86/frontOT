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
  hideHeader?: boolean
  desktopMinWidthClass?: string
  mobileShowHeaders?: boolean
  mobileRowBlockMode?: 'table' | 'cards'
  desktopScrollMode?: 'auto' | 'always'
  desktopHeightClass?: string
  stickyHeader?: boolean
  density?: 'normal' | 'compact'
}

const Table = <T,>({
  columns,
  data,
  emptyLabel = 'Sin registros',
  rowClassName = '',
  variant = 'default',
  hideHeader = false,
  desktopMinWidthClass = 'min-w-full',
  mobileShowHeaders = true,
  mobileRowBlockMode = 'table',
  desktopScrollMode = 'auto',
  desktopHeightClass = '',
  stickyHeader = false,
  density = 'normal',
}: TableProps<T>) => {
  const isRowBlock = variant === 'row-block'
  const isCompact = density === 'compact'
  const desktopScrollClass =
    desktopScrollMode === 'always' ? 'overflow-x-scroll overflow-y-scroll' : 'overflow-x-auto overflow-y-auto'

  const isActionColumn = (column: Column<T>): boolean => /accion|acciones/i.test(column.header)
  const renderValue = (column: Column<T>, row: T) => {
    return column.render ? column.render(row) : (row as Record<string, ReactNode>)[column.key]
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-soft">
      <div className="md:hidden">
        {data.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">{emptyLabel}</div>
        ) : isRowBlock && mobileRowBlockMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-xs">
              {!hideHeader ? (
                <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} className={`border-b border-slate-200 px-3 py-2 text-left ${column.className ?? ''}`}>
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className={rowClassName}>
                    {columns.map((column) => (
                      <td key={column.key} className={`border-b border-slate-200 px-3 py-2 align-top text-slate-700 ${column.className ?? ''}`}>
                        {renderValue(column, row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={isRowBlock ? 'space-y-2 p-2' : 'divide-y divide-slate-100'}>
            {data.map((row, index) => (
              <div
                key={index}
                className={`p-2.5 ${isRowBlock ? 'rounded-2xl border border-brand-100/80 bg-white shadow-sm' : ''} ${rowClassName}`}
              >
                {isRowBlock ? (
                  <>
                    {(() => {
                      const visibleColumns = columns.filter((column) => !isActionColumn(column))

                      return (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                          {visibleColumns.map((column) => (
                            <div key={column.key} className="px-2.5 py-1.5">
                              {mobileShowHeaders ? (
                                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{column.header}</span>
                              ) : null}
                              <div className="mt-0.5 break-words text-left text-sm text-slate-700">{renderValue(column, row)}</div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}

                    {columns.some((column) => isActionColumn(column)) ? (
                      <div className="mt-2 [&>div>button]:w-full [&>div>button]:justify-center">
                        {columns
                          .filter((column) => isActionColumn(column))
                          .map((column) => (
                            <div key={column.key}>{renderValue(column, row)}</div>
                          ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    {columns
                      .filter((column) => !isActionColumn(column))
                      .map((column) =>
                        mobileShowHeaders ? (
                          <div key={column.key} className="grid grid-cols-[minmax(96px,40%)_1fr] items-start gap-3">
                            <span className="text-xs font-semibold text-slate-500">{column.header}</span>
                            <div className="break-words text-right text-sm font-medium text-slate-700">{renderValue(column, row)}</div>
                          </div>
                        ) : (
                          <div key={column.key} className="break-words text-sm text-slate-700">
                            {renderValue(column, row)}
                          </div>
                        )
                      )}

                    {columns.some((column) => isActionColumn(column)) ? (
                      <div className="space-y-2 border-t border-slate-200/80 pt-2 [&>div>button]:w-full [&>div>button]:justify-center">
                        {columns
                          .filter((column) => isActionColumn(column))
                          .map((column) => (
                            <div key={column.key}>{renderValue(column, row)}</div>
                          ))}
                      </div>
                    ) : null}
                  </>
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
          className={`${desktopMinWidthClass} w-full text-left ${isCompact ? 'text-xs' : 'text-sm'} ${
            isRowBlock ? 'border-separate [border-spacing:0_8px]' : 'border-collapse'
          }`}
        >
          {!hideHeader ? (
            <thead
              className={`bg-slate-100 ${isCompact ? 'text-[11px]' : 'text-xs'} uppercase tracking-wide text-slate-500 ${
                stickyHeader ? 'sticky top-0 z-20' : ''
              }`}
            >
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'} ${column.className ?? ''}`}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={`${isCompact ? 'px-3 py-4' : 'px-4 py-6'} text-center text-slate-500`}>
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
                          ? `bg-slate-50 ${isCompact ? 'px-3 py-2' : 'px-4 py-3'} border-y border-slate-300 ${
                              columnIndex === 0 ? 'rounded-l-2xl border-l' : ''
                            } ${columnIndex === columns.length - 1 ? 'rounded-r-2xl border-r' : ''}`
                          : `${isCompact ? 'px-3 py-2' : 'px-4 py-3'}`)
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
