'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { downloadCsv, type CsvColumn } from '@/lib/csv';

interface ExportCsvButtonProps<T> {
  filename: string;
  rows: T[];
  columns: CsvColumn<T>[];
  label?: string;
  className?: string;
}

// Small "Export CSV" button — downloads `rows` as a CSV using the column spec.
export function ExportCsvButton<T>({ filename, rows, columns, label = 'Export CSV', className }: ExportCsvButtonProps<T>) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={rows.length === 0}
      onClick={() => downloadCsv(filename, rows, columns)}
      className={`border-border text-muted-foreground hover:text-foreground disabled:opacity-40 ${className || ''}`}
    >
      <Download className="h-3.5 w-3.5 mr-1.5" />
      {label}
    </Button>
  );
}
