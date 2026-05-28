import React, { useCallback, useState } from 'react';
import { parseJoSAAHtml } from '../utils/parseHTML';

export default function FileUploader({ onFilesLoaded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);

  const processFiles = useCallback(
    (files) => {
      const htmlFiles = Array.from(files).filter(
        (f) => f.name.endsWith('.html') || f.name.endsWith('.htm')
      );
      if (htmlFiles.length === 0) return;

      setLoadingCount(htmlFiles.length);
      setProcessedCount(0);

      let allRows = [];
      let done = 0;

      htmlFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const rows = parseJoSAAHtml(e.target.result, file.name);
          allRows = [...allRows, ...rows];
          done++;
          setProcessedCount(done);
          if (done === htmlFiles.length) {
            onFilesLoaded(allRows);
            setLoadingCount(0);
            setProcessedCount(0);
          }
        };
        reader.readAsText(file, 'UTF-8');
      });
    },
    [onFilesLoaded]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleChange = (e) => processFiles(e.target.files);

  const isLoading = loadingCount > 0;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center gap-3
        rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
        p-8 min-h-[160px] group
        ${isDragging
          ? 'border-indigo-400 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
          : 'border-slate-600 hover:border-indigo-500 hover:bg-slate-800/60'
        }
      `}
      onClick={() => document.getElementById('html-file-input').click()}
    >
      <input
        id="html-file-input"
        type="file"
        multiple
        accept=".html,.htm"
        className="hidden"
        onChange={handleChange}
      />

      {isLoading ? (
        <>
          <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-300 font-medium">
            Parsing {processedCount}/{loadingCount} files…
          </p>
        </>
      ) : (
        <>
          <div className={`
            w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform duration-300
            bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30
            group-hover:scale-110 group-hover:from-indigo-500/30 group-hover:to-violet-500/30
          `}>
            📂
          </div>
          <div className="text-center">
            <p className="text-slate-200 font-semibold text-sm">
              Drop JoSAA HTML files here
            </p>
            <p className="text-slate-500 text-xs mt-1">
              or click to browse · Multiple files supported
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {['Round 1', 'Round 2', '...'].map((r) => (
              <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                {r}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
