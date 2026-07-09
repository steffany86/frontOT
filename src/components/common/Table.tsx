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
  rowClassName?: string | ((row: T) => string)
  variant?: 'default' | 'row-block'
  hideHeader?: boolean
  desktopMinWidthClass?: string
  mobileShowHeaders?: boolean
  mobileRowBlockMode?: 'table' | 'cards'
  mobileRenderMode?: 'auto' | 'table'
  mobileTableMinWidthClass?: string
  desktopScrollMode?: 'auto' | 'always'
  desktopHeightClass?: string
  stickyHeader?: boolean
  density?: 'normal' | 'compact'
}

const Table = <T,>({
  columns,
  data,
  emptyLabel = 'NO HAY DATOS PARA LA FECHA',
  rowClassName = '',
  variant = 'default',
  hideHeader = false,
  desktopMinWidthClass = 'min-w-full',
  mobileShowHeaders = true,
  mobileRowBlockMode = 'table',
  mobileRenderMode = 'auto',
  mobileTableMinWidthClass = 'min-w-[760px]',
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
  const getRowClassName = (row: T): string => (typeof rowClassName === 'function' ? rowClassName(row) : rowClassName)

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-soft">
      <div className="md:hidden">
        {data.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-2xl font-extrabold uppercase tracking-wide text-slate-950">{emptyLabel}</p>
          </div>
        ) : mobileRenderMode === 'table' || (isRowBlock && mobileRowBlockMode === 'table') ? (
          <div className="overflow-x-auto">
            <table className={`w-full ${mobileTableMinWidthClass} border-collapse text-xs`}>
              {!hideHeader ? (
                <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} className={`border-b border-slate-200 px-3 py-1.5 text-left ${column.className ?? ''}`}>
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className={getRowClassName(row)}>
                    {columns.map((column) => (
                      <td key={column.key} className={`border-b border-slate-200 px-3 py-1.5 align-top text-slate-700 ${column.className ?? ''}`}>
                        {renderValue(column, row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={isRowBlock ? `${isCompact ? 'space-y-1.5 p-1.5' : 'space-y-2 p-2'}` : 'divide-y divide-slate-100'}>
            {data.map((row, index) => (
              <div
                key={index}
                className={`${isCompact ? 'p-2' : 'p-2.5'} ${isRowBlock ? 'rounded-2xl border border-brand-100/80 bg-white shadow-sm' : ''} ${getRowClassName(row)}`}
              >
                {isRowBlock ? (
                  <>
                    {(() => {
                      const visibleColumns = columns.filter((column) => !isActionColumn(column))

                      return (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                          {visibleColumns.map((column) => (
                            <div key={column.key} className={`${isCompact ? 'px-2 py-1' : 'px-2.5 py-1.5'}`}>
                              {mobileShowHeaders ? (
                                <span className={`block font-semibold uppercase tracking-wide text-slate-500 ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>{column.header}</span>
                              ) : null}
                              <div className={`mt-0.5 break-words text-left text-slate-700 ${isCompact ? 'text-[13px]' : 'text-sm'}`}>{renderValue(column, row)}</div>
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
                          <div
                            key={column.key}
                            className={`grid items-start ${isCompact ? 'grid-cols-[minmax(88px,38%)_1fr] gap-2' : 'grid-cols-[minmax(96px,40%)_1fr] gap-3'}`}
                          >
                            <span className={`${isCompact ? 'text-[11px]' : 'text-xs'} font-semibold text-slate-500`}>{column.header}</span>
                            <div className={`break-words text-right font-medium text-slate-700 ${isCompact ? 'text-[13px]' : 'text-sm'}`}>{renderValue(column, row)}</div>
                          </div>
                        ) : (
                          <div key={column.key} className={`break-words text-slate-700 ${isCompact ? 'text-[13px]' : 'text-sm'}`}>
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
                <td colSpan={columns.length} className={`${isCompact ? 'px-3 py-8' : 'px-4 py-12'} text-center`}>
                  <p className="text-3xl font-extrabold uppercase tracking-wide text-slate-950">{emptyLabel}</p>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index} className={`${isRowBlock ? '' : 'border-t border-slate-200/70'} ${getRowClassName(row)}`}>
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
