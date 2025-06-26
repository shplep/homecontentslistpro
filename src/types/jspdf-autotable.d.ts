declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface AutoTableOptions {
    startY?: number;
    head?: string[][];
    body?: (string | number)[][];
    theme?: 'plain' | 'grid' | 'striped';
    styles?: {
      fontSize?: number;
      cellPadding?: number;
      overflow?: 'linebreak' | 'ellipsize' | 'visible' | 'hidden';
      halign?: 'left' | 'center' | 'right';
      valign?: 'top' | 'middle' | 'bottom';
    };
    headStyles?: {
      fillColor?: number[] | string;
      textColor?: number[] | string;
      fontSize?: number;
      fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
    };
    bodyStyles?: {
      fillColor?: number[] | string;
      textColor?: number[] | string;
      fontSize?: number;
    };
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    pageBreak?: 'auto' | 'avoid' | 'always';
    showHead?: 'everyPage' | 'firstPage' | 'never';
    showFoot?: 'everyPage' | 'lastPage' | 'never';
    tableWidth?: 'auto' | 'wrap' | number;
  }

  function autoTable(doc: jsPDF, options: AutoTableOptions): void;
  export default autoTable;
}

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
} 