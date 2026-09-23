import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface GeneratePDFOptions {
  filename?: string;
  elementId?: string;
  element?: HTMLElement;
}

/**
 * Generates an A4 portrait PDF from an HTML element using html2canvas and jsPDF.
 * Clones the element into an isolated, unscaled container and ensures all web fonts
 * are fully synchronized to prevent text overlapping and kerning distortion.
 */
export async function generateBookingPDFBlob(
  element: HTMLElement
): Promise<{ blob: Blob; dataUrl: string; pdf: jsPDF }> {
  // 1. Wait for document fonts to be ready
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font loading error fallback
    }
  }

  // 2. Clone the target into an isolated unscaled container to avoid any parent CSS transforms
  const offscreenContainer = document.createElement('div');
  offscreenContainer.style.position = 'fixed';
  offscreenContainer.style.left = '0';
  offscreenContainer.style.top = '0';
  offscreenContainer.style.width = '794px';
  offscreenContainer.style.height = '1123px';
  offscreenContainer.style.zIndex = '-99999';
  offscreenContainer.style.overflow = 'hidden';
  offscreenContainer.style.transform = 'none';
  offscreenContainer.style.pointerEvents = 'none';

  const clonedElement = element.cloneNode(true) as HTMLElement;
  clonedElement.style.transform = 'none';
  clonedElement.style.margin = '0';
  clonedElement.style.width = '794px';
  clonedElement.style.height = '1123px';
  clonedElement.style.display = 'block';
  clonedElement.style.position = 'relative';

  offscreenContainer.appendChild(clonedElement);
  document.body.appendChild(offscreenContainer);

  // Wait for all images inside cloned element to finish loading
  const images = Array.from(clonedElement.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  try {
    // 3. Capture high-resolution canvas without any parent transform distortion
    const canvas = await html2canvas(clonedElement, {
      scale: 2.0,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      height: 1123,
      windowWidth: 794,
      windowHeight: 1123,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        // Synchronize all loaded fonts into the cloned iframe
        if (typeof document !== 'undefined' && document.fonts && clonedDoc.fonts) {
          document.fonts.forEach((font) => {
            try {
              clonedDoc.fonts.add(font);
            } catch {
              // ignore
            }
          });
        }
      },
    });

    const imgData = canvas.toDataURL('image/png', 1.0);

    // A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = 210;
    const pdfHeight = 297;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

    const blob = pdf.output('blob');
    const dataUrl = URL.createObjectURL(blob);

    return { blob, dataUrl, pdf };
  } finally {
    // Always clean up offscreen container
    if (offscreenContainer.parentNode) {
      document.body.removeChild(offscreenContainer);
    }
  }
}

/**
 * Downloads the PDF file directly to the user's device.
 */
export function downloadPDF(pdf: jsPDF, filename: string): void {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(safeFilename);
}

/**
 * Shares the PDF using the Web Share API (native iOS / Android share sheet).
 * Returns true if sharing was successful, false if not supported or canceled.
 */
export async function sharePDF(
  blob: Blob,
  filename: string,
  title: string,
  text: string
): Promise<boolean> {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const file = new File([blob], safeFilename, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title,
        text,
      });
      return true;
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        // User closed the share sheet
        return false;
      }
      console.warn('Share API failed, falling back to download:', err);
    }
  }

  return false;
}

/**
 * Opens the PDF in a new browser tab for viewing or printing.
 */
export function openPDFInNewTab(dataUrl: string): void {
  window.open(dataUrl, '_blank');
}
