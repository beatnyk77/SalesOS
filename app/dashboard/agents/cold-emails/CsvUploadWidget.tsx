'use client';

/**
 * app/dashboard/agents/cold-emails/CsvUploadWidget.tsx
 *
 * Task 15: CSV upload UI widget.
 *
 * Features:
 *  - Drag-and-drop or click-to-select CSV file
 *  - Shows validation progress bar while processing
 *  - Displays upload result summary (succeeded / failed / skipped)
 *  - Calls uploadCsvAndPersonalize server action
 */

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { uploadCsvAndPersonalize, type UploadResult } from './upload-actions';

// ─── Result Banner ────────────────────────────────────────────────────────────

function ResultBanner({ result }: { result: UploadResult }) {
  if (!result.success && result.error) {
    return (
      <div className="rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-300">
        <strong className="text-red-200">Upload failed:</strong> {result.error}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 space-y-3">
      <p className="text-sm font-semibold text-emerald-300">
        ✓ CSV processed — {result.succeeded} draft{result.succeeded !== 1 ? 's' : ''} created
      </p>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Total rows', value: result.total_rows, color: 'text-white' },
          { label: 'Valid leads', value: result.valid_leads, color: 'text-emerald-300' },
          { label: 'Skipped', value: result.skipped_rows, color: 'text-amber-300' },
          { label: 'Failed', value: result.failed, color: 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 rounded-lg py-2">
            <p className={`text-base font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-white/35 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {result.dry_run && (
        <p className="text-[11px] text-amber-300/70">
          ⚡ Dry-run mode — emails are in Draft status. Review them in the carousel above.
        </p>
      )}

      {result.errors.length > 0 && (
        <details className="text-xs">
          <summary className="text-white/40 cursor-pointer hover:text-white/60 transition-colors">
            {result.errors.length} individual error{result.errors.length !== 1 ? 's' : ''}
          </summary>
          <ul className="mt-2 space-y-1 text-red-400/80">
            {result.errors.map((e, i) => (
              <li key={i}>
                <span className="text-white/40">{e.email}:</span> {e.error}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ─── Upload Widget ────────────────────────────────────────────────────────────

export function CsvUploadWidget({ userId }: { userId: string }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith('.csv')) {
      setResult({
        success: false,
        total_rows: 0, valid_leads: 0, skipped_rows: 0,
        succeeded: 0, failed: 0, dry_run: true, errors: [],
        error: 'Only .csv files are accepted.',
      });
      return;
    }
    setFile(f);
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
    },
    [handleFile]
  );

  const handleSubmit = async () => {
    if (!file || isProcessing) return;
    setIsProcessing(true);
    setResult(null);

    const formData = new FormData();
    formData.set('csv_file', file);
    formData.set('user_id', userId);

    try {
      const res = await uploadCsvAndPersonalize(formData);
      setResult(res);
    } catch (err) {
      setResult({
        success: false,
        total_rows: 0, valid_leads: 0, skipped_rows: 0,
        succeeded: 0, failed: 0, dry_run: true, errors: [],
        error: err instanceof Error ? err.message : 'Unexpected error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload CSV file"
        className={`group relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-violet-500/70 bg-violet-500/10'
            : 'border-white/15 hover:border-white/30 bg-white/3 hover:bg-white/5'
        }`}
      >
        <input
          ref={inputRef}
          id="csv-upload-input"
          type="file"
          accept=".csv,text/csv"
          onChange={handleChange}
          className="sr-only"
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl border flex items-center justify-center text-2xl transition-all duration-200 ${
              isDragging
                ? 'border-violet-500/40 bg-violet-500/15'
                : 'border-white/10 bg-white/5 group-hover:border-white/20'
            }`}
          >
            📄
          </div>

          {file ? (
            <>
              <p className="text-sm font-semibold text-emerald-300">{file.name}</p>
              <p className="text-xs text-white/40">
                {(file.size / 1024).toFixed(1)} KB · Ready to process
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-white/70">
                Drop your CSV here, or{' '}
                <span className="text-violet-400 underline underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-white/35">
                Required column: <code className="bg-white/8 px-1 rounded">email</code>
                {' · '}Optional: <code className="bg-white/8 px-1 rounded">first_name</code>,{' '}
                <code className="bg-white/8 px-1 rounded">company</code>,{' '}
                <code className="bg-white/8 px-1 rounded">job_title</code>
              </p>
              <p className="text-[10px] text-white/25">Max 200 rows per upload</p>
            </>
          )}
        </div>
      </div>

      {/* Process Button */}
      {file && (
        <button
          id="csv-process-button"
          onClick={handleSubmit}
          disabled={isProcessing}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="inline-flex items-center gap-2 justify-center">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Processing leads…
            </span>
          ) : (
            `⚡ Personalize ${file.name}`
          )}
        </button>
      )}

      {/* Result */}
      {result && <ResultBanner result={result} />}
    </div>
  );
}
