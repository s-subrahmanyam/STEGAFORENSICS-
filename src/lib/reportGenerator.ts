import jsPDF from 'jspdf';
import type { AnalysisResult, TimelineEntry } from '@/lib/steganography';

export function generateForensicReport(
  result: AnalysisResult,
  timeline: TimelineEntry[]
) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  const addLine = (text: string, size = 10, bold = false, color: [number, number, number] = [220, 220, 220]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, w - 40);
    if (y + lines.length * size * 0.5 > 275) {
      doc.addPage();
      y = 20;
      drawPageBg();
    }
    doc.text(lines, 20, y);
    y += lines.length * size * 0.45 + 4;
  };

  const drawPageBg = () => {
    doc.setFillColor(15, 18, 28);
    doc.rect(0, 0, w, doc.internal.pageSize.getHeight(), 'F');
    // Top accent line
    doc.setFillColor(0, 200, 180);
    doc.rect(0, 0, w, 3, 'F');
  };

  const drawSeparator = () => {
    doc.setDrawColor(40, 50, 70);
    doc.line(20, y, w - 20, y);
    y += 8;
  };

  // Page 1
  drawPageBg();

  // Header
  doc.setFillColor(0, 200, 180);
  doc.roundedRect(20, y, 12, 12, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(15, 18, 28);
  doc.setFont('helvetica', 'bold');
  doc.text('SF', 22.5, y + 8);

  doc.setTextColor(0, 200, 180);
  doc.setFontSize(18);
  doc.text('STEGAFORENSICS', 38, y + 6);
  doc.setFontSize(7);
  doc.setTextColor(120, 140, 160);
  doc.text('DIGITAL FORENSIC ANALYSIS REPORT', 38, y + 12);
  y += 25;

  // Report metadata
  doc.setFillColor(22, 27, 40);
  doc.roundedRect(20, y, w - 40, 28, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(120, 140, 160);
  doc.text('Report Generated:', 28, y + 8);
  doc.text('Case Reference:', 28, y + 16);
  doc.text('Classification:', 28, y + 24);
  doc.setTextColor(220, 220, 220);
  doc.text(new Date().toLocaleString(), 80, y + 8);
  doc.text(`SF-${Date.now().toString(36).toUpperCase()}`, 80, y + 16);
  const riskColor: [number, number, number] = result.riskLevel === 'high' ? [239, 68, 68] : result.riskLevel === 'moderate' ? [234, 179, 8] : [34, 197, 94];
  doc.setTextColor(...riskColor);
  doc.setFont('helvetica', 'bold');
  doc.text(result.riskLevel.toUpperCase() + ' RISK', 80, y + 24);
  y += 38;

  drawSeparator();

  // Section 1: Image Metadata
  addLine('1. IMAGE METADATA', 13, true, [0, 200, 180]);
  y += 2;
  const meta = result.metadata;
  const metaRows = [
    ['File Name', meta.fileName],
    ['Dimensions', `${meta.width} × ${meta.height} px`],
    ['File Size', `${(meta.fileSize / 1024).toFixed(1)} KB`],
    ['File Type', meta.fileType],
    ['Last Modified', new Date(meta.lastModified).toLocaleString()],
  ];
  metaRows.forEach(([label, value]) => {
    doc.setFontSize(9);
    doc.setTextColor(120, 140, 160);
    doc.text(label + ':', 25, y);
    doc.setTextColor(220, 220, 220);
    doc.text(value, 80, y);
    y += 6;
  });
  y += 4;

  drawSeparator();

  // Section 2: Risk Assessment
  addLine('2. RISK ASSESSMENT', 13, true, [0, 200, 180]);
  y += 2;

  doc.setFillColor(22, 27, 40);
  doc.roundedRect(20, y, w - 40, 20, 3, 3, 'F');
  doc.setFontSize(24);
  doc.setTextColor(...riskColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`${result.overallRisk}%`, 30, y + 15);
  doc.setFontSize(10);
  doc.text(`${result.riskLevel.toUpperCase()} RISK`, 60, y + 14);
  y += 30;

  drawSeparator();

  // Section 3: Detection Scores
  addLine('3. DETECTION MODULE SCORES', 13, true, [0, 200, 180]);
  y += 2;
  const scores = [
    ['LSB Pattern Analysis', result.lsbScore],
    ['Histogram Analysis', result.histogramScore],
    ['Noise Level Detection', result.noiseScore],
    ['Pixel Anomaly Detection', result.pixelAnomalyScore],
    ['Compression Artifact Analysis', result.compressionScore],
  ] as const;

  scores.forEach(([label, score]) => {
    doc.setFontSize(9);
    doc.setTextColor(180, 190, 200);
    doc.text(label, 25, y);
    doc.setTextColor(220, 220, 220);
    doc.setFont('helvetica', 'bold');
    doc.text(`${score}%`, w - 40, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // Bar
    y += 3;
    doc.setFillColor(30, 38, 55);
    doc.roundedRect(25, y, w - 70, 4, 1, 1, 'F');
    const barColor: [number, number, number] = score <= 30 ? [34, 197, 94] : score <= 70 ? [234, 179, 8] : [239, 68, 68];
    doc.setFillColor(...barColor);
    doc.roundedRect(25, y, (w - 70) * (score / 100), 4, 1, 1, 'F');
    y += 10;
  });

  y += 4;
  drawSeparator();

  // Section 4: Evidence Integrity
  addLine('4. EVIDENCE INTEGRITY', 13, true, [0, 200, 180]);
  y += 2;
  addLine('SHA-256 Hash:', 9, true, [120, 140, 160]);
  doc.setFillColor(22, 27, 40);
  doc.roundedRect(20, y, w - 40, 12, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(0, 200, 180);
  doc.text(result.sha256, 25, y + 8);
  y += 20;

  drawSeparator();

  // Section 5: Suspicious Regions
  addLine('5. SUSPICIOUS REGIONS', 13, true, [0, 200, 180]);
  y += 2;
  if (result.suspiciousRegions.length === 0) {
    addLine('No suspicious regions detected.', 9, false, [120, 140, 160]);
  } else {
    addLine(`${result.suspiciousRegions.length} suspicious region(s) identified:`, 9, false, [180, 190, 200]);
    result.suspiciousRegions.slice(0, 6).forEach((r, i) => {
      addLine(
        `Region ${i + 1}: Position (${r.x}, ${r.y}), Size ${r.w}×${r.h}, Intensity: ${(r.intensity * 100).toFixed(0)}%`,
        8, false, [160, 170, 180]
      );
    });
  }
  y += 4;

  drawSeparator();

  // Section 6: Timeline
  addLine('6. INVESTIGATION TIMELINE', 13, true, [0, 200, 180]);
  y += 2;
  timeline.forEach(entry => {
    if (y > 265) {
      doc.addPage();
      y = 20;
      drawPageBg();
    }
    doc.setFontSize(7);
    doc.setTextColor(100, 110, 130);
    doc.text(entry.timestamp.toLocaleTimeString(), 25, y);
    doc.setFontSize(8);
    doc.setTextColor(180, 190, 200);
    doc.setFont('helvetica', 'bold');
    doc.text(entry.action, 55, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 150, 165);
    doc.text(`— ${entry.detail}`, 55 + doc.getTextWidth(entry.action) + 3, y);
    y += 6;
  });

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFillColor(0, 200, 180);
    doc.rect(0, h - 3, w, 3, 'F');
    doc.setFontSize(7);
    doc.setTextColor(80, 90, 110);
    doc.text(`StegaForensics Report — Page ${i} of ${totalPages}`, 20, h - 8);
    doc.text('CONFIDENTIAL — FOR AUTHORIZED PERSONNEL ONLY', w - 20, h - 8, { align: 'right' });
  }

  doc.save(`StegaForensics_Report_${Date.now()}.pdf`);
}

export function generateComparisonReport(
  resultA: AnalysisResult,
  resultB: AnalysisResult,
  nameA: string,
  nameB: string,
) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  const drawPageBg = () => {
    doc.setFillColor(15, 18, 28);
    doc.rect(0, 0, w, doc.internal.pageSize.getHeight(), 'F');
    doc.setFillColor(0, 200, 180);
    doc.rect(0, 0, w, 3, 'F');
  };

  const drawSeparator = () => {
    doc.setDrawColor(40, 50, 70);
    doc.line(20, y, w - 20, y);
    y += 8;
  };

  const checkPage = () => {
    if (y > 265) { doc.addPage(); y = 20; drawPageBg(); }
  };

  const colA: [number, number, number] = [0, 200, 180];
  const colB: [number, number, number] = [178, 102, 255];

  const riskCol = (level: string): [number, number, number] =>
    level === 'high' ? [239, 68, 68] : level === 'moderate' ? [234, 179, 8] : [34, 197, 94];

  // ── Page 1 ──
  drawPageBg();

  // Header
  doc.setFillColor(0, 200, 180);
  doc.roundedRect(20, y, 12, 12, 2, 2, 'F');
  doc.setFontSize(8); doc.setTextColor(15, 18, 28); doc.setFont('helvetica', 'bold');
  doc.text('SF', 22.5, y + 8);
  doc.setTextColor(0, 200, 180); doc.setFontSize(18);
  doc.text('STEGAFORENSICS', 38, y + 6);
  doc.setFontSize(7); doc.setTextColor(120, 140, 160);
  doc.text('COMPARATIVE FORENSIC ANALYSIS REPORT', 38, y + 12);
  y += 25;

  // Report metadata
  doc.setFillColor(22, 27, 40);
  doc.roundedRect(20, y, w - 40, 22, 3, 3, 'F');
  doc.setFontSize(8); doc.setTextColor(120, 140, 160);
  doc.text('Report Generated:', 28, y + 8);
  doc.text('Case Reference:', 28, y + 16);
  doc.setTextColor(220, 220, 220);
  doc.text(new Date().toLocaleString(), 80, y + 8);
  doc.text(`SF-CMP-${Date.now().toString(36).toUpperCase()}`, 80, y + 16);
  y += 32;

  drawSeparator();

  // ── Section 1: Images Under Comparison ──
  doc.setFontSize(13); doc.setTextColor(...colA); doc.setFont('helvetica', 'bold');
  doc.text('1. IMAGES UNDER COMPARISON', 20, y); y += 10;

  const midX = w / 2;

  // Image A header
  doc.setFillColor(...colA); doc.roundedRect(20, y, 8, 8, 1, 1, 'F');
  doc.setFontSize(7); doc.setTextColor(15, 18, 28); doc.text('A', 22.5, y + 6);
  doc.setFontSize(9); doc.setTextColor(220, 220, 220); doc.setFont('helvetica', 'bold');
  doc.text(nameA, 32, y + 6);

  // Image B header
  doc.setFillColor(...colB); doc.roundedRect(midX + 5, y, 8, 8, 1, 1, 'F');
  doc.setFontSize(7); doc.setTextColor(255, 255, 255); doc.text('B', midX + 7.5, y + 6);
  doc.setFontSize(9); doc.setTextColor(220, 220, 220);
  doc.text(nameB, midX + 17, y + 6);
  y += 14;

  // Metadata side by side
  const metaFields = [
    ['Dimensions', (r: AnalysisResult) => `${r.metadata.width}×${r.metadata.height}`],
    ['File Size', (r: AnalysisResult) => `${(r.metadata.fileSize / 1024).toFixed(1)} KB`],
    ['File Type', (r: AnalysisResult) => r.metadata.fileType],
  ] as const;

  metaFields.forEach(([label, fn]) => {
    doc.setFontSize(8); doc.setTextColor(120, 140, 160);
    doc.text(label + ':', 25, y);
    doc.setTextColor(200, 200, 200); doc.setFont('helvetica', 'normal');
    doc.text(fn(resultA), 60, y);
    doc.setTextColor(120, 140, 160);
    doc.text(label + ':', midX + 10, y);
    doc.setTextColor(200, 200, 200);
    doc.text(fn(resultB), midX + 45, y);
    y += 6;
  });
  y += 4;
  drawSeparator();

  // ── Section 2: Risk Comparison ──
  doc.setFontSize(13); doc.setTextColor(...colA); doc.setFont('helvetica', 'bold');
  doc.text('2. RISK ASSESSMENT COMPARISON', 20, y); y += 10;

  // A risk box
  doc.setFillColor(22, 27, 40); doc.roundedRect(20, y, midX - 25, 24, 3, 3, 'F');
  doc.setFontSize(7); doc.setTextColor(...colA); doc.text('IMAGE A', 25, y + 7);
  doc.setFontSize(20); doc.setTextColor(...riskCol(resultA.riskLevel)); doc.setFont('helvetica', 'bold');
  doc.text(`${resultA.overallRisk}%`, 25, y + 19);
  doc.setFontSize(9);
  doc.text(resultA.riskLevel.toUpperCase(), 50, y + 19);

  // B risk box
  doc.setFillColor(22, 27, 40); doc.roundedRect(midX + 5, y, midX - 25, 24, 3, 3, 'F');
  doc.setFontSize(7); doc.setTextColor(...colB); doc.text('IMAGE B', midX + 10, y + 7);
  doc.setFontSize(20); doc.setTextColor(...riskCol(resultB.riskLevel)); doc.setFont('helvetica', 'bold');
  doc.text(`${resultB.overallRisk}%`, midX + 10, y + 19);
  doc.setFontSize(9);
  doc.text(resultB.riskLevel.toUpperCase(), midX + 35, y + 19);
  y += 34;

  drawSeparator();

  // ── Section 3: Score-by-Score ──
  doc.setFontSize(13); doc.setTextColor(...colA); doc.setFont('helvetica', 'bold');
  doc.text('3. DETECTION MODULE COMPARISON', 20, y); y += 10;

  // Table header
  doc.setFillColor(22, 27, 40);
  doc.roundedRect(20, y, w - 40, 8, 2, 2, 'F');
  doc.setFontSize(7); doc.setTextColor(120, 140, 160); doc.setFont('helvetica', 'bold');
  doc.text('MODULE', 25, y + 6);
  doc.text('IMAGE A', 105, y + 6, { align: 'center' });
  doc.text('IMAGE B', 145, y + 6, { align: 'center' });
  doc.text('DIFF', w - 30, y + 6, { align: 'center' });
  y += 12;

  const scores = [
    ['LSB Pattern Analysis', resultA.lsbScore, resultB.lsbScore],
    ['Histogram Analysis', resultA.histogramScore, resultB.histogramScore],
    ['Noise Detection', resultA.noiseScore, resultB.noiseScore],
    ['Pixel Anomaly', resultA.pixelAnomalyScore, resultB.pixelAnomalyScore],
    ['Compression Artifacts', resultA.compressionScore, resultB.compressionScore],
    ['Overall Risk', resultA.overallRisk, resultB.overallRisk],
  ] as const;

  scores.forEach(([label, a, b], i) => {
    checkPage();
    const isLast = i === scores.length - 1;
    if (isLast) {
      doc.setFillColor(22, 27, 40);
      doc.roundedRect(20, y - 3, w - 40, 10, 2, 2, 'F');
    }
    doc.setFontSize(8);
    doc.setTextColor(180, 190, 200); doc.setFont('helvetica', isLast ? 'bold' : 'normal');
    doc.text(label as string, 25, y + 3);

    // A value
    doc.setTextColor(...colA); doc.setFont('helvetica', 'bold');
    doc.text(`${a}%`, 105, y + 3, { align: 'center' });

    // B value
    doc.setTextColor(...colB);
    doc.text(`${b}%`, 145, y + 3, { align: 'center' });

    // Diff
    const diff = (a as number) - (b as number);
    doc.setTextColor(diff > 0 ? 239 : 34, diff > 0 ? 68 : 197, diff > 0 ? 68 : 94);
    doc.text(diff === 0 ? '=' : (diff > 0 ? `+${diff}` : `${diff}`), w - 30, y + 3, { align: 'center' });

    // Score bars
    y += 6;
    const barW = 50;
    // A bar
    doc.setFillColor(30, 38, 55); doc.roundedRect(80, y, barW, 3, 1, 1, 'F');
    doc.setFillColor(...colA); doc.roundedRect(80, y, barW * ((a as number) / 100), 3, 1, 1, 'F');
    // B bar
    doc.setFillColor(30, 38, 55); doc.roundedRect(80 + barW + 5, y, barW, 3, 1, 1, 'F');
    doc.setFillColor(...colB); doc.roundedRect(80 + barW + 5, y, barW * ((b as number) / 100), 3, 1, 1, 'F');

    y += 9;
  });

  y += 4;
  drawSeparator();

  // ── Section 4: Verdict ──
  checkPage();
  doc.setFontSize(13); doc.setTextColor(...colA); doc.setFont('helvetica', 'bold');
  doc.text('4. VERDICT', 20, y); y += 10;

  doc.setFillColor(22, 27, 40);
  doc.roundedRect(20, y, w - 40, 30, 3, 3, 'F');

  if (resultA.overallRisk === resultB.overallRisk) {
    doc.setFontSize(11); doc.setTextColor(220, 220, 220); doc.setFont('helvetica', 'bold');
    doc.text('Both images show equal steganographic risk levels.', w / 2, y + 18, { align: 'center' });
  } else {
    const higher = resultA.overallRisk > resultB.overallRisk;
    const higherName = higher ? nameA : nameB;
    const higherLabel = higher ? 'A' : 'B';
    const diff = Math.abs(resultA.overallRisk - resultB.overallRisk);

    doc.setFontSize(9); doc.setTextColor(120, 140, 160);
    doc.text('Higher steganographic risk detected in:', w / 2, y + 10, { align: 'center' });

    const riskResult = higher ? resultA : resultB;
    doc.setFontSize(14); doc.setTextColor(...riskCol(riskResult.riskLevel)); doc.setFont('helvetica', 'bold');
    doc.text(`Image ${higherLabel}: ${higherName}`, w / 2, y + 20, { align: 'center' });
    doc.setFontSize(9); doc.setTextColor(180, 190, 200); doc.setFont('helvetica', 'normal');
    doc.text(`Risk differential: ${diff}%`, w / 2, y + 27, { align: 'center' });
  }
  y += 40;

  // ── Section 5: Evidence Integrity ──
  checkPage();
  drawSeparator();
  doc.setFontSize(13); doc.setTextColor(...colA); doc.setFont('helvetica', 'bold');
  doc.text('5. EVIDENCE INTEGRITY', 20, y); y += 10;

  doc.setFontSize(8); doc.setTextColor(120, 140, 160); doc.setFont('helvetica', 'bold');
  doc.text('Image A SHA-256:', 25, y);
  doc.setFillColor(22, 27, 40); doc.roundedRect(20, y + 2, w - 40, 10, 2, 2, 'F');
  doc.setFontSize(6.5); doc.setTextColor(...colA); doc.setFont('helvetica', 'normal');
  doc.text(resultA.sha256, 25, y + 9);
  y += 16;

  doc.setFontSize(8); doc.setTextColor(120, 140, 160); doc.setFont('helvetica', 'bold');
  doc.text('Image B SHA-256:', 25, y);
  doc.setFillColor(22, 27, 40); doc.roundedRect(20, y + 2, w - 40, 10, 2, 2, 'F');
  doc.setFontSize(6.5); doc.setTextColor(...colB); doc.setFont('helvetica', 'normal');
  doc.text(resultB.sha256, 25, y + 9);
  y += 20;

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFillColor(0, 200, 180);
    doc.rect(0, h - 3, w, 3, 'F');
    doc.setFontSize(7); doc.setTextColor(80, 90, 110);
    doc.text(`StegaForensics Comparison Report — Page ${i} of ${totalPages}`, 20, h - 8);
    doc.text('CONFIDENTIAL — FOR AUTHORIZED PERSONNEL ONLY', w - 20, h - 8, { align: 'right' });
  }

  doc.save(`StegaForensics_Comparison_${Date.now()}.pdf`);
}
