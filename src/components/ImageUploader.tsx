import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Shield, FileImage, Sparkles } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  isAnalyzing: boolean;
}

const ImageUploader = ({ onImageSelect, isAnalyzing }: ImageUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file);
    }
  }, [onImageSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImageSelect(file);
  }, [onImageSelect]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isAnalyzing ? { scale: 1.005 } : undefined}
      className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-500 card-elevated ${
        isDragging
          ? 'border-primary bg-primary/5 cyber-glow-strong'
          : 'border-border hover:border-primary/40 bg-card/50'
      } ${isAnalyzing ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !isAnalyzing && document.getElementById('file-input')?.click()}
    >
      {/* Animated corner accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/40 rounded-tl-2xl" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/40 rounded-tr-2xl" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/40 rounded-bl-2xl" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/40 rounded-br-2xl" />

      <input
        id="file-input"
        type="file"
        accept="image/png,image/jpeg,image/bmp"
        onChange={handleFileInput}
        className="hidden"
      />
      <AnimatePresence mode="wait">
        {isDragging ? (
          <motion.div key="drop" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
            <Shield className="mx-auto h-20 w-20 text-primary mb-4 animate-float" />
            <p className="text-xl font-mono text-primary font-bold">Drop image for analysis</p>
          </motion.div>
        ) : (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Upload className="mx-auto h-16 w-16 text-primary/60 mb-6" />
            </motion.div>
            <p className="text-xl font-semibold text-foreground mb-2">
              Drag & drop an image for forensic analysis
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Supports PNG, JPG, BMP • Max resolution auto-detected
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {['LSB Detection', 'Histogram', 'Noise Analysis', 'Pixel Anomaly', 'Compression'].map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-xs font-mono text-muted-foreground bg-secondary/80 px-3 py-1.5 rounded-full border border-border"
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ImageUploader;
