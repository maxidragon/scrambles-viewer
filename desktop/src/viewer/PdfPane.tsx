import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist/legacy/build/pdf.mjs";

interface Props {
  document: PDFDocumentProxy;
  /** 1 is fit-to-width; larger zooms in. */
  zoom: number;
  onZoomBy(factor: number): void;
}

const PAGE_GAP = 12;
const PANE_PADDING = 16;

export function PdfPane({ document: pdf, zoom, onZoomBy }: Props): React.JSX.Element {
  const paneRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PDFPageProxy[]>([]);
  const [paneWidth, setPaneWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all(Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1))).then((loaded) => {
      if (!cancelled) setPages(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [pdf]);

  useEffect(() => {
    const pane = paneRef.current;
    if (pane === null) return;
    const observer = new ResizeObserver(() => setPaneWidth(pane.clientWidth - 2 * PANE_PADDING));
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);

  // Trackpad pinch arrives as a wheel event with ctrlKey; the listener must be
  // non-passive to stop the webview zooming the whole page instead.
  useEffect(() => {
    const pane = paneRef.current;
    if (pane === null) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      onZoomBy(Math.exp(-e.deltaY * 0.01));
    };
    pane.addEventListener("wheel", onWheel, { passive: false });
    return () => pane.removeEventListener("wheel", onWheel);
  }, [onZoomBy]);

  return (
    <div className="pdf-pane" ref={paneRef} style={{ padding: PANE_PADDING }}>
      <div className="pdf-page-count">
        {pdf.numPages} {pdf.numPages === 1 ? "page" : "pages"}
      </div>
      {paneWidth > 0 &&
        pages.map((page) => (
          <PageCanvas key={page.pageNumber} page={page} width={paneWidth * zoom} gap={PAGE_GAP} />
        ))}
    </div>
  );
}

function PageCanvas({ page, width, gap }: { page: PDFPageProxy; width: number; gap: number }): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const base = page.getViewport({ scale: 1 });
  const scale = width / base.width;
  const height = base.height * scale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const context = canvas.getContext("2d");
    if (context === null) return;
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: scale * dpr });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const task: RenderTask = page.render({ canvas, canvasContext: context, viewport });
    task.promise.catch(() => {
      // Cancelled by a newer render of the same page; nothing to report.
    });
    return () => task.cancel();
  }, [page, scale]);

  return (
    <canvas
      ref={canvasRef}
      className="pdf-page"
      style={{ width, height, marginBottom: gap }}
      aria-label={`Page ${page.pageNumber}`}
    />
  );
}
