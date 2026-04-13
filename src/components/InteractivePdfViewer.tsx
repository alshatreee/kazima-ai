'use client';

import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface InteractivePdfViewerProps {
  fileUrl: string;
  searchQuery?: string;
}

export default function InteractivePdfViewer({
  fileUrl,
  searchQuery,
}: InteractivePdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total);
    },
    [],
  );

  const customTextRenderer = useCallback(
    (textItem: { str: string }) => {
      if (!searchQuery || !textItem.str) return textItem.str;
      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      return textItem.str.replace(
        regex,
        '<mark class="bg-yellow-300 text-black rounded px-0.5">$1</mark>',
      );
    },
    [searchQuery],
  );

  const canGoPrev = pageNumber > 1;
  const canGoNext = numPages !== null && pageNumber < numPages;

  return (
    <div className="flex flex-col items-center rounded-2xl border border-[var(--line)] bg-white/60 p-4">
      {/* شريط التنقل */}
      <div className="mb-4 flex items-center gap-4" dir="rtl">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => setPageNumber((p) => p - 1)}
          className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:border-[rgba(139,106,59,0.3)] disabled:opacity-40"
        >
          السابق
        </button>

        <span className="text-sm text-[var(--muted)]">
          صفحة {pageNumber} من {numPages ?? '--'}
        </span>

        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => setPageNumber((p) => p + 1)}
          className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium transition hover:border-[rgba(139,106,59,0.3)] disabled:opacity-40"
        >
          التالي
        </button>
      </div>

      {/* عارض PDF */}
      <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
        <Page
          pageNumber={pageNumber}
          customTextRenderer={customTextRenderer}
          renderTextLayer={true}
          renderAnnotationLayer={false}
        />
      </Document>
    </div>
  );
}
