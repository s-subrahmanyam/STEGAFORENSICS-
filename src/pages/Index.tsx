import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, FileSearch, Clock, Zap, Eye, FileDown, Layers, Lock, History, Share2, RotateCcw } from 'lucide-react';
import Header from '@/components/Header';
import AnimatedBackground from '@/components/AnimatedBackground';
import ImageUploader from '@/components/ImageUploader';
import AnalysisProgress from '@/components/AnalysisProgress';
import RiskGauge from '@/components/RiskGauge';
import DetectionScores from '@/components/DetectionScores';
import HistogramChart from '@/components/HistogramChart';
import SuspiciousRegions from '@/components/SuspiciousRegions';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import EvidenceInfo from '@/components/EvidenceInfo';
import TimelineLog from '@/components/TimelineLog';
import BatchAnalysis from '@/components/BatchAnalysis';
import LsbEncoder from '@/components/LsbEncoder';
import AnalysisHistory, { saveToHistory } from '@/components/AnalysisHistory';
import Footer from '@/components/Footer';
import { analyzeImage, type AnalysisResult, type TimelineEntry } from '@/lib/steganography';
import { generateForensicReport } from '@/lib/reportGenerator';

const statVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.1, type: 'spring' as const, stiffness: 100 },
  }),
};

type Tab = 'single' | 'batch' | 'encoder' | 'history';

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('single');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ step: '', value: 0 });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [analysisCount, setAnalysisCount] = useState(0);

  const addTimeline = useCallback((action: string, detail: string, type: TimelineEntry['type'] = 'info') => {
    setTimeline(prev => [...prev, {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      action,
      detail,
      type,
    }]);
  }, []);

  const handleImageSelect = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setResult(null);
    setImageUrl(URL.createObjectURL(file));
    setTimeline([]);

    addTimeline('Image Uploaded', `${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
    addTimeline('Analysis Started', 'Initiating multi-module forensic scan', 'analysis');

    try {
      const analysisResult = await analyzeImage(file, (step, p) => {
        setProgress({ step, value: p });
        if (p % 15 === 0 || p === 100) {
          addTimeline('Processing', step, 'analysis');
        }
      });

      setResult(analysisResult);
      setAnalysisCount(prev => prev + 1);

      // Save to history
      saveToHistory(analysisResult);

      addTimeline(
        'Analysis Complete',
        `Risk level: ${analysisResult.riskLevel.toUpperCase()} (${analysisResult.overallRisk}%)`,
        analysisResult.riskLevel === 'high' ? 'warning' : 'result'
      );

      if (analysisResult.suspiciousRegions.length > 0) {
        addTimeline(
          'Suspicious Regions',
          `${analysisResult.suspiciousRegions.length} region(s) flagged for review`,
          'warning'
        );
      }

      addTimeline('Evidence Hash', `SHA-256: ${analysisResult.sha256.substring(0, 16)}...`, 'result');
    } catch {
      addTimeline('Error', 'Analysis failed', 'warning');
    } finally {
      setIsAnalyzing(false);
    }
  }, [addTimeline]);

  const handleDownloadReport = () => {
    if (result) {
      generateForensicReport(result, timeline);
    }
  };

  const stats = [
    { icon: FileSearch, label: 'Scans Completed', value: analysisCount.toString(), accent: true },
    { icon: Zap, label: 'Detection Modules', value: '5', accent: false },
    { icon: Eye, label: 'Algorithms Active', value: 'LSB+H+N+P+C', accent: false },
    { icon: Clock, label: 'Timeline Events', value: timeline.length.toString(), accent: false },
  ];

  const tabs = [
    { key: 'single' as Tab, label: 'Single Analysis', icon: Shield },
    { key: 'batch' as Tab, label: 'Batch Analysis', icon: Layers },
    { key: 'encoder' as Tab, label: 'LSB Encoder', icon: Lock },
    { key: 'history' as Tab, label: 'History', icon: History },
  ];

  return (
    <div className="min-h-screen bg-background animated-bg relative">
      <AnimatedBackground />
      <div className="min-h-screen grid-pattern relative z-10">
        <Header />

        <main className="container py-8 space-y-8">
          {/* Hero section */}
          {!result && !isAnalyzing && activeTab === 'single' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-6"
            >
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-3 text-gradient-cyber"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                AI-Powered Steganography Detection
              </motion.h2>
              <motion.p
                className="text-muted-foreground max-w-lg mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Advanced forensic analysis to detect hidden data embedded within digital images using multiple detection algorithms.
              </motion.p>
            </motion.div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                variants={statVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className={`rounded-2xl border border-border bg-card p-5 card-elevated transition-all ${
                  stat.accent ? 'border-primary/20' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">{stat.value}</p>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl w-fit mx-auto flex-wrap justify-center">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                  activeTab === tab.key
                    ? 'bg-card text-foreground card-elevated'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Single Analysis Tab */}
          {activeTab === 'single' && (
            <>
              <ImageUploader onImageSelect={handleImageSelect} isAnalyzing={isAnalyzing} />

              <AnimatePresence>
                {isAnalyzing && (
                  <AnalysisProgress step={progress.step} progress={progress.value} />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-wrap items-center gap-3 py-3"
                    >
                      <div className="h-px flex-1 bg-border min-w-[40px]" />
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-mono text-muted-foreground tracking-[0.3em] uppercase">
                          Analysis Results
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-border min-w-[40px]" />
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setResult(null);
                            setImageUrl(null);
                            setTimeline([]);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-mono hover:bg-secondary/80 transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          New Scan
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleDownloadReport}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-cyber text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          PDF Report
                        </motion.button>
                      </div>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <RiskGauge risk={result.overallRisk} level={result.riskLevel} verdict={result.riskVerdict} />
                      <DetectionScores result={result} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <HistogramChart histogram={result.histogram} />
                      {imageUrl && (
                        <SuspiciousRegions imageUrl={imageUrl} regions={result.suspiciousRegions} />
                      )}
                    </div>

                    {imageUrl && (
                      <BeforeAfterSlider imageUrl={imageUrl} regions={result.suspiciousRegions} />
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                      <EvidenceInfo metadata={result.metadata} sha256={result.sha256} />
                      <TimelineLog entries={timeline} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!result && !isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-center py-16"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative mx-auto w-fit mb-6"
                  >
                    <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150" />
                    <div className="relative h-24 w-24 rounded-2xl bg-secondary/50 border border-border flex items-center justify-center mx-auto">
                      <Shield className="h-12 w-12 text-primary/20" />
                    </div>
                  </motion.div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Ready for Analysis</h3>
                  <p className="text-muted-foreground font-mono text-sm max-w-sm mx-auto">
                    Upload an image above to begin forensic steganography detection
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-6">
                    {['LSB Detection', 'Histogram', 'Noise Analysis', 'Pixel Scan', 'Compression'].map((algo, i) => (
                      <motion.span
                        key={algo}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + i * 0.1 }}
                        className="hidden sm:inline text-[10px] font-mono text-muted-foreground/60 px-2 py-1 rounded-md bg-secondary/30 border border-border/50"
                      >
                        {algo}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* Batch Analysis Tab */}
          {activeTab === 'batch' && (
            <BatchAnalysis onBatchComplete={(results) => setAnalysisCount(prev => prev + results.length)} />
          )}

          {/* LSB Encoder Tab */}
          {activeTab === 'encoder' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">LSB Steganography Encoder</h2>
                <p className="text-sm text-muted-foreground">
                  Hide a secret message inside an image using Least Significant Bit encoding.
                  Then test detection by uploading the result in Single Analysis.
                </p>
              </div>
              <LsbEncoder />
            </motion.div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Analysis History</h2>
                <p className="text-sm text-muted-foreground">
                  Review and compare past forensic scan results.
                </p>
              </div>
              <AnalysisHistory />
            </motion.div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Index;
