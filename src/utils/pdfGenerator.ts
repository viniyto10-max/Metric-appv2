import { toCanvas } from 'html-to-image';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PDFExportOptions {
  element: HTMLElement;
  fileName?: string;
  darkMode?: boolean;
  periodLabel?: string;
  onProgress?: (msg: string) => void;
}

/**
 * Ensures all images within the given element are fully loaded and decoded.
 */
async function waitForElementImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(img => {
      if (img.complete && img.naturalWidth > 0) {
        if (img.decode) {
          return img.decode().catch(() => {});
        }
        return Promise.resolve();
      }
      return new Promise<void>(resolve => {
        const done = () => resolve();
        img.onload = done;
        img.onerror = done;
        setTimeout(done, 3000);
      });
    })
  );
}

/**
 * Captures a single DOM element into a high-res canvas.
 */
async function captureElementToCanvas(
  target: HTMLElement,
  darkMode: boolean
): Promise<HTMLCanvasElement> {
  const filterFn = (node: Node) => {
    if (node instanceof HTMLElement) {
      if (node.classList.contains('no-print')) return false;
    }
    return true;
  };

  const bgColor = darkMode ? '#0A0A0A' : '#F9FAFB';

  // Attempt 1: html-to-image
  try {
    const canvas = await toCanvas(target, {
      pixelRatio: 2,
      backgroundColor: bgColor,
      filter: filterFn,
      cacheBust: false,
    });
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      return canvas;
    }
  } catch (err) {
    console.warn('html-to-image failed on page, falling back to html2canvas:', err);
  }

  // Attempt 2: html2canvas fallback
  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: bgColor,
    ignoreElements: (el) => el.classList.contains('no-print'),
    logging: false,
  });

  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    throw new Error('Falha ao renderizar imagem para PDF');
  }

  return canvas;
}

/**
 * Generates an executive PDF report and downloads it directly to the user's PC or Mobile.
 * If the element contains child elements with `.pdf-page`, captures each page individually
 * for pixel-perfect A4 pagination with no chopped tables or graphics.
 */
export async function downloadReportPDF({
  element,
  fileName = 'relatorio_instagram.pdf',
  darkMode = false,
  periodLabel = 'Período',
  onProgress
}: PDFExportOptions): Promise<boolean> {
  onProgress?.('Aguardando fontes e layout...');
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  onProgress?.('Verificando capas e imagens...');
  await waitForElementImages(element);

  // A4 dimensions in mm
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 10;
  const marginTop = 12;
  const marginBottom = 12;
  const contentWidth = pageWidth - marginX * 2; // 190mm
  const contentHeight = pageHeight - marginTop - marginBottom; // 273mm

  const pageElements = Array.from(element.querySelectorAll<HTMLElement>('.pdf-page'));

  if (pageElements.length > 0) {
    // Mode A: Explicit page elements
    const totalPages = pageElements.length;

    for (let i = 0; i < totalPages; i++) {
      onProgress?.(`Renderizando página ${i + 1} de ${totalPages}...`);
      const pageEl = pageElements[i];

      const canvas = await captureElementToCanvas(pageEl, darkMode);

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      // Background
      pdf.setFillColor(darkMode ? 10 : 255, darkMode ? 10 : 255, darkMode ? 10 : 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Top Header Strip
      pdf.setFontSize(8);
      pdf.setTextColor(darkMode ? 160 : 120, darkMode ? 160 : 120, darkMode ? 160 : 120);
      pdf.text(
        `INSTAGRAM ANALYTICS • RELATÓRIO EXECUTIVO • ${periodLabel.toUpperCase()}`,
        marginX,
        8
      );

      // Scaled image
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const printHeight = Math.min(contentHeight, (canvas.height / canvas.width) * contentWidth);

      pdf.addImage(
        imgData,
        'JPEG',
        marginX,
        marginTop,
        contentWidth,
        printHeight,
        undefined,
        'FAST'
      );

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(darkMode ? 140 : 130, darkMode ? 140 : 130, darkMode ? 140 : 130);
      pdf.text(
        `Página ${i + 1} de ${totalPages} • Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        pageWidth - marginX,
        pageHeight - 5,
        { align: 'right' }
      );
    }
  } else {
    // Mode B: Continuous slice fallback
    onProgress?.('Renderizando documento contínuo...');
    const fullCanvas = await captureElementToCanvas(element, darkMode);

    const cw = fullCanvas.width;
    const ch = fullCanvas.height;
    const pageCanvasHeight = Math.floor(cw * (contentHeight / contentWidth));
    const totalPages = Math.max(1, Math.ceil(ch / pageCanvasHeight));

    for (let page = 0; page < totalPages; page++) {
      onProgress?.(`Formatando página ${page + 1} de ${totalPages}...`);
      if (page > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.setFillColor(darkMode ? 10 : 255, darkMode ? 10 : 255, darkMode ? 10 : 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      pdf.setFontSize(8);
      pdf.setTextColor(darkMode ? 160 : 120, darkMode ? 160 : 120, darkMode ? 160 : 120);
      pdf.text(
        `INSTAGRAM ANALYTICS • RELATÓRIO EXECUTIVO • ${periodLabel.toUpperCase()}`,
        marginX,
        8
      );

      const sourceY = page * pageCanvasHeight;
      const sourceH = Math.min(pageCanvasHeight, ch - sourceY);

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = cw;
      sliceCanvas.height = sourceH;
      const sliceCtx = sliceCanvas.getContext('2d');

      if (sliceCtx) {
        sliceCtx.fillStyle = darkMode ? '#0A0A0A' : '#F9FAFB';
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sliceCtx.drawImage(
          fullCanvas,
          0, sourceY, cw, sourceH,
          0, 0, cw, sourceH
        );

        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
        const printHeight = (sourceH / cw) * contentWidth;

        pdf.addImage(
          sliceData,
          'JPEG',
          marginX,
          marginTop,
          contentWidth,
          printHeight,
          undefined,
          'FAST'
        );
      }

      pdf.setFontSize(8);
      pdf.setTextColor(darkMode ? 140 : 130, darkMode ? 140 : 130, darkMode ? 140 : 130);
      pdf.text(
        `Página ${page + 1} de ${totalPages} • Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        pageWidth - marginX,
        pageHeight - 5,
        { align: 'right' }
      );
    }
  }

  onProgress?.('Iniciando download...');
  
  // Save with fallback for Android PWA / WebView
  try {
    pdf.save(fileName);
  } catch (errSave) {
    console.warn('Standard pdf.save failed, using blob link fallback:', errSave);
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 2000);
  }

  return true;
}
