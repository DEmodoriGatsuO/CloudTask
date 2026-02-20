import { useRef, useState } from 'react';
import { Upload, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { api } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  created: number;
  errors: ImportError[];
}

interface Props {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskCSVImport({ projectId, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setError(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.upload<{ data: ImportResult }>(
        `/projects/${projectId}/tasks/import`,
        formData,
      );
      setResult(res.data);
      if (res.data.created > 0) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    } catch (err: any) {
      setError(err.message ?? 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const CSV_SAMPLE = `title,description,status,priority,assignee_email,due_date,start_date,end_date,estimated_hours
Fix login bug,Reproduce and fix,in_progress,high,alice@example.com,2026-03-01,2026-02-20,2026-02-28,4
Write unit tests,,todo,medium,,,,,
Deploy to production,Run checklist,todo,low,,2026-03-15,,,`;

  const downloadSample = () => {
    const blob = new Blob([CSV_SAMPLE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks-import-sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Tasks from CSV"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            loading={importing}
            disabled={!file || importing}
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Import
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Format description */}
        <div className="text-sm text-on-surface-variant space-y-1">
          <p>Upload a CSV file with the following columns:</p>
          <p className="font-mono text-xs bg-surface-container px-2 py-1.5 rounded-lg break-all">
            title, description, status, priority, assignee_email, due_date, start_date, end_date,
            estimated_hours
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-xs mt-2">
            <li><span className="font-medium">title</span> — required</li>
            <li><span className="font-medium">status</span> — todo / in_progress / done / completed (default: todo)</li>
            <li><span className="font-medium">priority</span> — low / medium / high (default: medium)</li>
            <li><span className="font-medium">assignee_email</span> — must be a project member's email</li>
            <li><span className="font-medium">dates</span> — YYYY-MM-DD format</li>
          </ul>
          <button
            type="button"
            onClick={downloadSample}
            className="text-primary-600 hover:underline text-xs mt-1 inline-block"
          >
            Download sample CSV
          </button>
        </div>

        {/* File input */}
        <div
          className="border-2 border-dashed border-outline-variant rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-on-surface-variant" />
          {file ? (
            <p className="text-sm text-on-surface font-medium">{file.name}</p>
          ) : (
            <p className="text-sm text-on-surface-variant">Click to select a CSV file</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-error-container/30 border border-error/30 rounded-xl text-sm text-on-surface">
            <XCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-surface-container rounded-xl text-sm">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              <span className="text-on-surface">
                <span className="font-medium">{result.created}</span> task{result.created !== 1 ? 's' : ''} imported successfully.
              </span>
            </div>
            {result.errors.length > 0 && (
              <div className="p-3 bg-warning-container/30 border border-warning/30 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-sm font-medium text-on-surface mb-1">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} skipped
                </div>
                <ul className="text-xs text-on-surface-variant space-y-0.5 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i}>Row {e.row}: {e.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
