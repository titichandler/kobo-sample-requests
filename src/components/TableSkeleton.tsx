export function TableSkeleton({ rows = 4, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="data-table animate-pulse" aria-hidden>
      <table>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, index) => (
              <th key={index}>
                <div className="h-3 w-16 rounded bg-line" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex}>
                  <div className="h-4 w-full max-w-[8rem] rounded bg-surface-soft" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
