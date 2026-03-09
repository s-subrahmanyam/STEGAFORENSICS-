export interface AnalysisResult {
  lsbScore: number;
  histogramScore: number;
  noiseScore: number;
  pixelAnomalyScore: number;
  compressionScore: number;
  overallRisk: number;
  riskLevel: 'low' | 'moderate' | 'high';
  riskVerdict: string;
  suspiciousRegions: { x: number; y: number; w: number; h: number; intensity: number }[];
  histogram: { channel: string; values: number[] }[];
  lsbDistribution: number[];
  metadata: ImageMetadata;
  sha256: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  fileSize: number;
  fileName: string;
  fileType: string;
  lastModified: string;
}

export interface TimelineEntry {
  id: string;
  timestamp: Date;
  action: string;
  detail: string;
  type: 'info' | 'analysis' | 'warning' | 'result';
}

// ─── Detection Thresholds ───────────────────────────────────────
const THRESHOLDS = {
  CLEAN_MAX: 28,        // Below this = "No Steganography Detected"
  SUSPICIOUS_MAX: 55,   // Below this = "Suspicious Image"
  // Above SUSPICIOUS_MAX = "Possible Hidden Data"
};

function getRiskVerdict(overallRisk: number, sequentialSignatureScore: number): string {
  if (overallRisk < THRESHOLDS.CLEAN_MAX) return 'No Steganography Detected';
  if (overallRisk < THRESHOLDS.SUSPICIOUS_MAX) {
    if (sequentialSignatureScore >= 70) return 'Suspicious — Possible LSB Steganography';
    return 'Suspicious — Requires Further Analysis';
  }
  if (sequentialSignatureScore >= 70) return 'LSB Steganography Detected — Hidden Data Found';
  return 'Possible Hidden Data Detected (Unknown Method)';
}

// ─── Helpers ────────────────────────────────────────────────────

function getImageData(canvas: HTMLCanvasElement, img: HTMLImageElement): ImageData {
  const ctx = canvas.getContext('2d')!;
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Module 1: LSB Analysis (RS Analysis + locality heuristics) ─────────────
// Uses Regular-Singular (RS) analysis, global serial correlation, and
// localized head-of-stream correlation deltas to catch low-payload sequential
// embedding (like our built-in encoder).

function buildLsbStream(data: Uint8ClampedArray): Uint8Array {
  const lsbStream = new Uint8Array((data.length / 4) * 3);
  let ptr = 0;

  for (let i = 0; i < data.length; i += 4) {
    lsbStream[ptr++] = data[i] & 1;
    lsbStream[ptr++] = data[i + 1] & 1;
    lsbStream[ptr++] = data[i + 2] & 1;
  }

  return lsbStream;
}

function adjacencySameRatio(stream: Uint8Array, start: number, end: number): number {
  const safeStart = Math.max(0, start);
  const safeEnd = Math.min(stream.length, end);
  const len = safeEnd - safeStart;

  if (len < 2) return 0.5;

  let same = 0;
  for (let i = safeStart + 1; i < safeEnd; i++) {
    if (stream[i] === stream[i - 1]) same++;
  }

  return same / (len - 1);
}

function analyzePayloadLocality(stream: Uint8Array): {
  score: number;
  strongestDelta: number;
  strongestWindow: number;
} {
  const windowSizes = [256, 512, 1024, 2048, 4096];
  let strongestDelta = 0;
  let strongestWindow = 0;

  for (const windowSize of windowSizes) {
    // Need one head window + at least 4 baseline windows
    if (stream.length < windowSize * 5) continue;

    const headRatio = adjacencySameRatio(stream, 0, windowSize);
    const headDeviation = Math.abs(headRatio - 0.5);

    let baselineDeviationSum = 0;
    let baselineCount = 0;

    // Compare against the next windows (skip the head)
    for (let windowIndex = 1; windowIndex <= 8; windowIndex++) {
      const start = windowIndex * windowSize;
      const end = start + windowSize;
      if (end > stream.length) break;

      const ratio = adjacencySameRatio(stream, start, end);
      baselineDeviationSum += Math.abs(ratio - 0.5);
      baselineCount++;
    }

    if (baselineCount < 4) continue;

    const baselineDeviation = baselineDeviationSum / baselineCount;
    const delta = baselineDeviation - headDeviation;

    if (delta > strongestDelta) {
      strongestDelta = delta;
      strongestWindow = windowSize;
    }
  }

  const score =
    strongestDelta > 0.11 ? 95 :
    strongestDelta > 0.07 ? 82 :
    strongestDelta > 0.045 ? 65 :
    strongestDelta > 0.025 ? 45 :
    strongestDelta > 0.012 ? 28 : 8;

  return { score, strongestDelta, strongestWindow };
}

function extractSequentialLsbBits(data: Uint8ClampedArray, count: number, startBit = 0): number[] {
  const bits: number[] = [];
  let bitCursor = 0;

  for (let i = 0; i < data.length && bits.length < count; i++) {
    if ((i + 1) % 4 === 0) continue; // skip alpha

    if (bitCursor >= startBit) {
      bits.push(data[i] & 1);
    }

    bitCursor++;
  }

  return bits;
}

function bitsToNumber(bits: number[]): number {
  return bits.reduce((acc, bit) => acc * 2 + bit, 0);
}

function analyzeSequentialHeaderSignature(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { score: number; claimedBytes: number; printableRatio: number; utf8Likely: boolean } {
  const capacityBytes = Math.max(0, Math.floor((width * height * 3) / 8) - 4);
  const lengthBits = extractSequentialLsbBits(data, 32, 0);

  if (lengthBits.length < 32 || capacityBytes <= 0) {
    return { score: 0, claimedBytes: 0, printableRatio: 0, utf8Likely: false };
  }

  const claimedBytes = bitsToNumber(lengthBits);

  // Strong indicator this is NOT our sequential encoder output
  if (claimedBytes <= 0 || claimedBytes > capacityBytes) {
    return { score: 0, claimedBytes, printableRatio: 0, utf8Likely: false };
  }

  const sampleBytes = Math.min(claimedBytes, 128);
  const payloadBits = extractSequentialLsbBits(data, sampleBytes * 8, 32);
  const sample = new Uint8Array(sampleBytes);

  for (let i = 0; i < sampleBytes; i++) {
    const byteBits = payloadBits.slice(i * 8, (i + 1) * 8);
    sample[i] = bitsToNumber(byteBits);
  }

  let printableCount = 0;
  for (const byte of sample) {
    const isPrintableAscii = byte >= 32 && byte <= 126;
    const isCommonControl = byte === 9 || byte === 10 || byte === 13;
    if (isPrintableAscii || isCommonControl) printableCount++;
  }

  const printableRatio = sampleBytes > 0 ? printableCount / sampleBytes : 0;

  let utf8Likely = false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(sample);
    utf8Likely = true;
  } catch {
    utf8Likely = false;
  }

  // Purposefully tuned for this app's built-in encoder:
  // valid 32-bit length header + plausible UTF-8 text payload in early stream.
  let score = 35;
  score += utf8Likely ? 20 : 0;
  score +=
    printableRatio > 0.9 ? 25 :
    printableRatio > 0.75 ? 18 :
    printableRatio > 0.6 ? 10 : 4;
  score += claimedBytes <= 4096 ? 10 : claimedBytes <= 32768 ? 5 : 0;
  score += claimedBytes <= capacityBytes * 0.9 ? 5 : 0;

  return {
    score: clampScore(score),
    claimedBytes,
    printableRatio,
    utf8Likely,
  };
}

function analyzeLSB(data: Uint8ClampedArray, width: number, height: number): {
  score: number;
  distribution: number[];
  sequentialSignatureScore: number;
} {
  const distribution = new Array(8).fill(0);
  let total = 0;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const val = data[i + c];
      total++;
      for (let b = 0; b < 8; b++) {
        distribution[b] += (val >> b) & 1;
      }
    }
  }

  // RS Analysis per channel
  const groupSize = 4;
  const mask = [0, 1, 1, 0];
  const negMask = [0, -1, -1, 0];

  let totalRm = 0, totalSm = 0, totalRnm = 0, totalSnm = 0;

  for (let c = 0; c < 3; c++) {
    let Rm = 0, Sm = 0, Rnm = 0, Snm = 0;
    const channelValues: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      channelValues.push(data[i + c]);
    }

    for (let g = 0; g + groupSize <= channelValues.length; g += groupSize) {
      const group = channelValues.slice(g, g + groupSize);
      const f = (arr: number[]) => {
        let sum = 0;
        for (let i = 0; i < arr.length - 1; i++) sum += Math.abs(arr[i] - arr[i + 1]);
        return sum;
      };
      const original = f(group);
      const flippedPos = group.map((v, i) => {
        if (mask[i] === 1) return v % 2 === 0 ? v + 1 : v - 1;
        return v;
      });
      const fPos = f(flippedPos);
      if (fPos > original) Rm++;
      else if (fPos < original) Sm++;
      const flippedNeg = group.map((v, i) => {
        if (negMask[i] === -1) return (v & 1) === 0 ? v - 1 : v + 1;
        return v;
      });
      const clampedNeg = flippedNeg.map(v => Math.max(0, Math.min(255, v)));
      const fNeg = f(clampedNeg);
      if (fNeg > original) Rnm++;
      else if (fNeg < original) Snm++;
    }
    totalRm += Rm; totalSm += Sm; totalRnm += Rnm; totalSnm += Snm;
  }

  const totalGroups = totalRm + totalSm + totalRnm + totalSnm;
  let rsScore = 0;
  if (totalGroups > 0) {
    const rDiff = (totalRm - totalRnm) / (totalRm + totalRnm + 1);
    const sDiff = (totalSnm - totalSm) / (totalSm + totalSnm + 1);
    const rsIndicator = (rDiff + sDiff) / 2;
    if (rsIndicator > 0.15) rsScore = 90;
    else if (rsIndicator > 0.10) rsScore = 75;
    else if (rsIndicator > 0.06) rsScore = 55;
    else if (rsIndicator > 0.03) rsScore = 35;
    else if (rsIndicator > 0.01) rsScore = 20;
    else rsScore = 8;
  }

  // LSB ratio
  let ones = 0;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) ones += data[i + c] & 1;
  }
  const ratio = ones / total;
  const deviation = Math.abs(ratio - 0.5);
  const ratioScore = deviation < 0.003 ? 70 : deviation < 0.008 ? 45 : deviation < 0.02 ? 20 : 5;
  const extremityScore = deviation > 0.45 ? 90 : deviation > 0.35 ? 65 : deviation > 0.25 ? 40 : 0;

  // Global horizontal LSB correlation
  let sameCount = 0;
  let diffCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx1 = (y * width + x) * 4;
      const idx2 = (y * width + x + 1) * 4;
      for (let c = 0; c < 3; c++) {
        const lsb1 = data[idx1 + c] & 1;
        const lsb2 = data[idx2 + c] & 1;
        if (lsb1 === lsb2) sameCount++;
        else diffCount++;
      }
    }
  }

  const totalPairs = sameCount + diffCount;
  const sameRatio = totalPairs > 0 ? sameCount / totalPairs : 0.5;
  const correlationDeviation = Math.abs(sameRatio - 0.5);
  const slcScore =
    correlationDeviation < 0.005 ? 90 :
    correlationDeviation < 0.01 ? 75 :
    correlationDeviation < 0.02 ? 60 :
    correlationDeviation < 0.04 ? 40 :
    correlationDeviation < 0.08 ? 20 : 5;

  // Localized head-of-stream detector (catches low-payload sequential embedding)
  const lsbStream = buildLsbStream(data);
  const locality = analyzePayloadLocality(lsbStream);

  // Signature detector for this app's encoder (32-bit length header + text payload)
  const headerSignature = analyzeSequentialHeaderSignature(data, width, height);

  // Tuned weighting:
  // - lower locality influence (it can overfire on some natural images)
  // - add explicit sequential-header signature for low-payload app-generated stego
  const score =
    rsScore * 0.20 +
    slcScore * 0.15 +
    locality.score * 0.20 +
    headerSignature.score * 0.30 +
    ratioScore * 0.10 +
    extremityScore * 0.05;

  console.log('[StegaForensics] LSB Debug:', {
    rsScore,
    slcScore,
    localityScore: locality.score,
    localityDelta: locality.strongestDelta.toFixed(6),
    localityWindow: locality.strongestWindow,
    headerSignatureScore: headerSignature.score,
    headerClaimedBytes: headerSignature.claimedBytes,
    headerPrintableRatio: headerSignature.printableRatio.toFixed(4),
    headerUtf8Likely: headerSignature.utf8Likely,
    ratioScore,
    sameRatio: sameRatio.toFixed(6),
    correlationDeviation: correlationDeviation.toFixed(6),
    totalRm,
    totalSm,
    totalRnm,
    totalSnm,
    lsbRatio: ratio.toFixed(6),
    finalScore: clampScore(score),
  });

  const normalizedDist = distribution.map(v => v / total);
  return {
    score: clampScore(score),
    distribution: normalizedDist,
    sequentialSignatureScore: headerSignature.score,
  };
}

// ─── Module 2: Histogram Analysis ──────────────────────────────
// Detects unnatural gaps/spikes in color histograms.
// LSB embedding creates characteristic "comb" patterns in histograms.
// Compares stego vs clean: stego makes even/odd pairs converge MORE than natural.

function analyzeHistogram(data: Uint8ClampedArray, isLossyFormat: boolean): { score: number; histogram: { channel: string; values: number[] }[] } {
  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    r[data[i]]++;
    g[data[i + 1]]++;
    b[data[i + 2]]++;
  }

  const totalPixels = data.length / 4;
  const normalize = (arr: number[]) => arr.map(v => v / totalPixels);

  // Detect "comb" pattern: LSB embedding makes adjacent bin pairs (2k, 2k+1) converge
  let combScore = 0;
  let combCount = 0;

  for (const channel of [r, g, b]) {
    for (let i = 0; i < 256; i += 2) {
      const even = channel[i];
      const odd = channel[i + 1];
      const sum = even + odd;
      if (sum > 20) {
        const imbalance = Math.abs(even - odd) / sum;
        combScore += imbalance;
        combCount++;
      }
    }
  }

  const avgCombImbalance = combCount > 0 ? combScore / combCount : 1;

  // Natural PNG images typically have avgCombImbalance 0.03-0.15 depending on content.
  // Only flag as suspicious at very extreme convergence (< 0.02) which indicates actual LSB replacement.
  // Previous thresholds were too aggressive, catching normal images at 0.05.
  const combDetectionScore = avgCombImbalance < 0.015 ? 85 :
                             avgCombImbalance < 0.03 ? 65 :
                             avgCombImbalance < 0.05 ? 40 :
                             avgCombImbalance < 0.10 ? 18 :
                             avgCombImbalance < 0.20 ? 8 :
                             avgCombImbalance > 0.85 ? 60 :
                             avgCombImbalance > 0.65 ? 35 : 5;

  // Also check for gaps
  let gapCount = 0;
  for (const channel of [r, g, b]) {
    for (let i = 2; i < 254; i++) {
      if (channel[i] === 0 && channel[i - 1] > 5 && channel[i + 1] > 5) gapCount++;
    }
  }

  const gapDensity = gapCount / (3 * 252);
  const gapPatternScore = gapDensity > 0.25 ? 85 :
                          gapDensity > 0.12 ? 60 :
                          gapDensity > 0.05 ? 35 :
                          gapDensity > 0.02 ? 18 : 3;

  const weightedScore = combDetectionScore * 0.70 + gapPatternScore * 0.30;
  // Lossy formats naturally have histogram anomalies
  const formatPenalty = isLossyFormat ? 0.6 : 1.0;
  const score = weightedScore * formatPenalty;

  console.log('[StegaForensics] Histogram Debug:', {
    avgCombImbalance: avgCombImbalance.toFixed(4),
    combDetectionScore,
    gapCount,
    gapDensity: gapDensity.toFixed(4),
    gapPatternScore,
    formatPenalty,
    finalScore: clampScore(score)
  });

  return {
    score: clampScore(score),
    histogram: [
      { channel: 'Red', values: normalize(r) },
      { channel: 'Green', values: normalize(g) },
      { channel: 'Blue', values: normalize(b) },
    ],
  };
}

// ─── Module 3: Noise Detection ─────────────────────────────────
// Measures high-frequency noise. Natural images have smooth noise gradients;
// steganography adds uniform noise. We compare noise levels across regions
// to detect unnatural uniformity.
// Also compares LSB-layer noise in head vs tail to catch sequential embedding.

function analyzeNoise(data: Uint8ClampedArray, width: number, height: number): number {
  const regionSize = Math.floor(Math.min(width, height) / 4);
  if (regionSize < 4) return 5;

  const regionNoises: number[] = [];

  for (let ry = 0; ry < height - regionSize; ry += regionSize) {
    for (let rx = 0; rx < width - regionSize; rx += regionSize) {
      let noiseSum = 0;
      let count = 0;

      for (let y = ry + 1; y < Math.min(ry + regionSize, height - 1); y++) {
        for (let x = rx + 1; x < Math.min(rx + regionSize, width - 1); x++) {
          const idx = (y * width + x) * 4;
          for (let c = 0; c < 3; c++) {
            const center = data[idx + c];
            const neighbors = [
              data[((y - 1) * width + x) * 4 + c],
              data[((y + 1) * width + x) * 4 + c],
              data[(y * width + x - 1) * 4 + c],
              data[(y * width + x + 1) * 4 + c],
            ];
            const avg = neighbors.reduce((a, b) => a + b, 0) / 4;
            noiseSum += Math.abs(center - avg);
            count++;
          }
        }
      }

      if (count > 0) regionNoises.push(noiseSum / count);
    }
  }

  if (regionNoises.length === 0) return 5;

  const avgNoise = regionNoises.reduce((a, b) => a + b, 0) / regionNoises.length;
  const noiseVariance = regionNoises.reduce((sum, n) => sum + (n - avgNoise) ** 2, 0) / regionNoises.length;
  const noiseStdDev = Math.sqrt(noiseVariance);
  const coeffOfVariation = avgNoise > 0 ? noiseStdDev / avgNoise : 1;

  // Only flag truly suspicious uniformity
  const uniformityScore = coeffOfVariation < 0.05 ? 55 :
                          coeffOfVariation < 0.10 ? 25 :
                          coeffOfVariation < 0.20 ? 8 :
                          coeffOfVariation < 0.40 ? 3 : 2;

  // LSB-layer noise: this comparison within a single image is unreliable
  // because natural images often have different content in head vs tail.
  // Only use it as a weak signal.
  const pixelCount = width * height;
  const headPixels = Math.min(Math.floor(pixelCount * 0.1), 50000);
  let headLsbNoise = 0, tailLsbNoise = 0;
  let headCount = 0, tailCount = 0;

  for (let i = 0; i < data.length - 4; i += 4) {
    const pixelIdx = i / 4;
    if (pixelIdx >= width) {
      for (let c = 0; c < 3; c++) {
        const lsbDiff = Math.abs((data[i + c] & 1) - (data[i - width * 4 + c] & 1));
        if (pixelIdx < headPixels) {
          headLsbNoise += lsbDiff;
          headCount++;
        } else {
          tailLsbNoise += lsbDiff;
          tailCount++;
        }
      }
    }
  }

  const headAvg = headCount > 0 ? headLsbNoise / headCount : 0.5;
  const tailAvg = tailCount > 0 ? tailLsbNoise / tailCount : 0.5;
  const lsbNoiseDelta = Math.abs(headAvg - tailAvg);

  // Very high threshold — only flag extreme deltas that can't be natural
  const lsbNoiseScore = lsbNoiseDelta > 0.15 ? 50 :
                        lsbNoiseDelta > 0.10 ? 25 :
                        lsbNoiseDelta > 0.06 ? 8 : 2;

  const finalScore = uniformityScore * 0.5 + lsbNoiseScore * 0.5;

  console.log('[StegaForensics] Noise Debug:', {
    avgNoise: avgNoise.toFixed(4),
    coeffOfVariation: coeffOfVariation.toFixed(4),
    uniformityScore,
    headLsbAvg: headAvg.toFixed(4),
    tailLsbAvg: tailAvg.toFixed(4),
    lsbNoiseDelta: lsbNoiseDelta.toFixed(4),
    lsbNoiseScore,
    finalScore: clampScore(finalScore),
  });

  return clampScore(finalScore);
}

// ─── Module 4: Pixel Anomaly Detection ─────────────────────────
// Scans blocks for abnormal pixel transitions + LSB distribution anomalies.
// Compares block-level LSB statistics to detect localized embedding.

function analyzePixelAnomalies(data: Uint8ClampedArray, width: number, height: number): {
  score: number;
  regions: { x: number; y: number; w: number; h: number; intensity: number }[];
} {
  const blockSize = Math.max(16, Math.floor(Math.min(width, height) / 20));
  const regions: { x: number; y: number; w: number; h: number; intensity: number }[] = [];
  const blockLsbDeviations: number[] = [];

  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      let blockNoise = 0;
      let lsbUniformity = 0;
      let blockCount = 0;
      const bw = Math.min(blockSize, width - bx);
      const bh = Math.min(blockSize, height - by);

      for (let y = by; y < by + bh - 1; y++) {
        for (let x = bx; x < bx + bw - 1; x++) {
          const idx = (y * width + x) * 4;
          const nextIdx = (y * width + x + 1) * 4;
          for (let c = 0; c < 3; c++) {
            const diff = Math.abs(data[idx + c] - data[nextIdx + c]);
            blockNoise += diff;
            lsbUniformity += (data[idx + c] & 1);
          }
          blockCount++;
        }
      }

      const avgNoise = blockCount > 0 ? blockNoise / blockCount : 0;
      const totalLSBs = blockCount * 3;
      const lsbRatio = totalLSBs > 0 ? lsbUniformity / totalLSBs : 0.5;
      const lsbDeviation = Math.abs(lsbRatio - 0.5);

      blockLsbDeviations.push(lsbDeviation);

      // Flag blocks with BOTH high noise AND very tight LSB ratio (near 0.5)
      const isSuspicious = avgNoise > 20 && lsbDeviation < 0.015;
      
      if (isSuspicious) {
        regions.push({
          x: bx, y: by, w: bw, h: bh,
          intensity: Math.min(1, (avgNoise / 50) * (1 - lsbDeviation * 30)),
        });
      }
    }
  }

  // Check if early blocks have significantly different LSB deviation from later blocks
  // Use very high threshold — natural images can have big block variation
  let earlyBlockScore = 0;
  if (blockLsbDeviations.length > 8) {
    const earlyBlocks = blockLsbDeviations.slice(0, Math.min(8, Math.floor(blockLsbDeviations.length * 0.15)));
    const lateBlocks = blockLsbDeviations.slice(Math.floor(blockLsbDeviations.length * 0.5));
    const earlyAvg = earlyBlocks.reduce((a, b) => a + b, 0) / earlyBlocks.length;
    const lateAvg = lateBlocks.reduce((a, b) => a + b, 0) / lateBlocks.length;
    const blockDelta = Math.abs(earlyAvg - lateAvg);

    // Only flag extreme differences
    earlyBlockScore = blockDelta > 0.08 ? 40 :
                      blockDelta > 0.05 ? 20 : 0;
  }

  regions.sort((a, b) => b.intensity - a.intensity);
  const topRegions = regions.slice(0, 8);
  
  const regionScore = Math.min(50, (topRegions.length / 4) * 30);
  const intensityScore = Math.min(20, (topRegions[0]?.intensity ?? 0) * 20);
  const score = regionScore + intensityScore + earlyBlockScore * 0.4;

  console.log('[StegaForensics] Pixel Anomaly Debug:', {
    suspiciousRegions: topRegions.length,
    earlyBlockScore,
    regionScore,
    intensityScore,
    finalScore: clampScore(score),
  });

  return { score: clampScore(score), regions: topRegions };
}

// ─── Module 5: Compression Artifact Analysis ───────────────────
// For JPEG: looks for inconsistent 8x8 block boundaries.
// For PNG: compression module should be near-zero since PNGs have no 8x8 blocks.
// Also checks for double-compression artifacts.

function analyzeCompression(data: Uint8ClampedArray, width: number, isLossyFormat: boolean): number {
  // PNGs don't have 8x8 block compression — should score very low
  if (!isLossyFormat) {
    // For lossless formats, check if there are residual JPEG block artifacts
    // (indicating the image was converted from JPEG). But this is NOT stego evidence.
    console.log('[StegaForensics] Compression Debug (PNG): format=lossless, score=5');
    return 5;
  }

  // JPEG path — original logic
  let boundaryDiff = 0;
  let interiorDiff = 0;
  let boundaryCount = 0;
  let interiorCount = 0;

  const sampleRows = Math.min(Math.floor(data.length / (width * 4)), 200);

  for (let y = 1; y < sampleRows; y++) {
    for (let x = 1; x < Math.min(width, 200); x++) {
      const idx = (y * width + x) * 4;
      const leftIdx = (y * width + x - 1) * 4;

      for (let c = 0; c < 3; c++) {
        const diff = Math.abs(data[idx + c] - data[leftIdx + c]);
        if (x % 8 === 0) {
          boundaryDiff += diff;
          boundaryCount++;
        } else {
          interiorDiff += diff;
          interiorCount++;
        }
      }
    }
  }

  if (boundaryCount === 0 || interiorCount === 0) return 5;

  const avgBoundary = boundaryDiff / boundaryCount;
  const avgInterior = interiorDiff / interiorCount;
  const boundaryRatio = avgInterior > 0 ? avgBoundary / avgInterior : 1;

  let score: number;
  if (boundaryRatio < 1.05) score = 40;
  else if (boundaryRatio < 1.3) score = 15;
  else if (boundaryRatio < 2.0) score = 10;
  else if (boundaryRatio < 2.5) score = 25;
  else score = 40;

  console.log('[StegaForensics] Compression Debug (JPEG):', {
    boundaryRatio: boundaryRatio.toFixed(4),
    finalScore: score,
  });

  return clampScore(score);
}

// ─── SHA-256 ────────────────────────────────────────────────────

export async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Main Analysis Pipeline ────────────────────────────────────

export async function analyzeImage(
  file: File,
  onProgress?: (step: string, progress: number) => void
): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');

    img.onload = async () => {
      try {
        onProgress?.('Extracting image data...', 10);
        const imageData = getImageData(canvas, img);
        const { data, width, height } = imageData;

        onProgress?.('Analyzing LSB patterns...', 25);
        await delay(300);
        const lsb = analyzeLSB(data, width, height);

        const isLossyFormat = /jpeg|jpg|webp/i.test(file.type);

        onProgress?.('Computing histogram analysis...', 40);
        await delay(300);
        const hist = analyzeHistogram(data, isLossyFormat);

        onProgress?.('Detecting noise patterns...', 55);
        await delay(300);
        const noiseScore = analyzeNoise(data, width, height);

        onProgress?.('Scanning for pixel anomalies...', 70);
        await delay(300);
        const anomalies = analyzePixelAnomalies(data, width, height);

        onProgress?.('Checking compression artifacts...', 85);
        await delay(300);
        const compressionScore = analyzeCompression(data, width, isLossyFormat);

        onProgress?.('Computing evidence hash...', 95);
        const sha256 = await computeSHA256(file);

        // Format calibration is now handled inside each module
        const calibratedHistogramScore = hist.score;
        const calibratedNoiseScore = noiseScore;
        const calibratedAnomalyScore = anomalies.score;
        const calibratedCompressionScore = compressionScore;

        // Strongly boost risk when built-in encoder signature is detected.
        // This ensures encoded files are clearly separated from clean carriers.
        const sequentialSignatureBoost = lsb.sequentialSignatureScore >= 70 ? 25 : lsb.sequentialSignatureScore >= 50 ? 12 : 0;

        const overallRisk = clampScore(
          lsb.score * 0.40 +                 // strongest discriminator
          calibratedHistogramScore * 0.35 +   // histogram gaps/comb are key for stego
          calibratedNoiseScore * 0.05 +
          calibratedAnomalyScore * 0.10 +
          calibratedCompressionScore * 0.10 +
          sequentialSignatureBoost
        );

        const riskLevel: 'low' | 'moderate' | 'high' =
          overallRisk < THRESHOLDS.CLEAN_MAX ? 'low' :
          overallRisk < THRESHOLDS.SUSPICIOUS_MAX ? 'moderate' : 'high';

        const riskVerdict = getRiskVerdict(overallRisk, lsb.sequentialSignatureScore);

        onProgress?.('Analysis complete', 100);

        resolve({
          lsbScore: Math.round(lsb.score),
          histogramScore: Math.round(hist.score),
          noiseScore: Math.round(noiseScore),
          pixelAnomalyScore: Math.round(anomalies.score),
          compressionScore: Math.round(compressionScore),
          overallRisk,
          riskLevel,
          riskVerdict,
          suspiciousRegions: anomalies.regions,
          histogram: hist.histogram,
          lsbDistribution: lsb.distribution,
          metadata: {
            width,
            height,
            fileSize: file.size,
            fileName: file.name,
            fileType: file.type,
            lastModified: new Date(file.lastModified).toISOString(),
          },
          sha256,
        });
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
