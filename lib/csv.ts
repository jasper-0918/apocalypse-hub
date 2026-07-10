// Tiny client-side CSV export. Build a CSV string from rows + a column spec and
// trigger a download — no dependency, works entirely in the browser.

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCell(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  // Quote if the value contains a comma, quote, or newline; double any quotes.
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(',')).join('\r\n');
  return body ? `${head}\r\n${body}` : head;
}

/** Generate a CSV and download it as `<filename>-YYYY-MM-DD.csv`. */
export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  if (typeof window === 'undefined') return;
  const csv = toCsv(rows, columns);
  // Prepend a BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
