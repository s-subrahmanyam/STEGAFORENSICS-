import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Upload, Download, FileImage, AlertCircle, CheckCircle2, Type } from 'lucide-react';
import { encodeImageFile, getMaxMessageLength } from '@/lib/lsbEncoder';

const LsbEncoder = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [maxChars, setMaxChars] = useState(0);
  const [isEncoding, setIsEncoding] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResultBlob(null);
    setResultUrl(null);
    setError(null);

    const url = URL.createObjectURL(f);
    setPreviewUrl(url);

    // Calculate max message length
    const img = new Image();
    img.onload = () => {
      setMaxChars(getMaxMessageLength(img.naturalWidth, img.naturalHeight));
    };
    img.src = url;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) {
      const input = document.getElementById('encoder-file-input') as HTMLInputElement;
      const dt = new DataTransfer();
      dt.items.add(f);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, []);

  const handleEncode = useCallback(async () => {
    if (!file || !message.trim()) return;
    setIsEncoding(true);
    setError(null);

    try {
      const blob = await encodeImageFile(file, message);
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setError(err.message || 'Encoding failed');
    } finally {
      setIsEncoding(false);
    }
  }, [file, message]);

  const handleDownload = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `stego_${file?.name || 'image'}.png`;
    a.click();
  }, [resultUrl, file]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Upload area */}
      <div
        className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer bg-card/50"
        onClick={() => document.getElementById('encoder-file-input')?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          id="encoder-file-input"
          type="file"
          accept="image/png,image/jpeg,image/bmp"
          onChange={handleFileSelect}
          className="hidden"
        />
        {previewUrl ? (
          <div className="space-y-3">
            <img src={previewUrl} alt="Selected" className="max-h-48 mx-auto rounded-lg border border-border" />
            <p className="text-sm text-muted-foreground font-mono">{file?.name}</p>
            <p className="text-xs text-muted-foreground">Max message: <span className="text-primary font-bold">{maxChars.toLocaleString()}</span> characters</p>
          </div>
        ) : (
          <div className="py-6">
            <Upload className="h-12 w-12 mx-auto text-primary/50 mb-3" />
            <p className="text-foreground font-medium mb-1">Select a carrier image</p>
            <p className="text-xs text-muted-foreground">PNG recommended for best results</p>
          </div>
        )}
      </div>

      {/* Message input */}
      {file && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
              <Type className="h-4 w-4 text-primary" />
              Secret Message
            </label>
            <span className={`text-xs font-mono ${message.length > maxChars ? 'text-destructive' : 'text-muted-foreground'}`}>
              {message.length} / {maxChars.toLocaleString()}
            </span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your secret message to hide..."
            className="w-full h-32 rounded-xl border border-border bg-secondary/50 p-4 text-sm font-mono text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleEncode}
            disabled={!message.trim() || message.length > maxChars || isEncoding}
            className="w-full py-3 rounded-xl gradient-cyber text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isEncoding ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                />
                Encoding...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Hide Message in Image
              </>
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {resultUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-primary/30 bg-card p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-mono text-sm font-bold">Message encoded successfully!</span>
            </div>

            <div className="flex gap-4 items-start">
              <img src={resultUrl} alt="Encoded" className="max-h-40 rounded-lg border border-border" />
              <div className="flex-1 space-y-2">
                <p className="text-xs text-muted-foreground font-mono">
                  Size: {resultBlob ? (resultBlob.size / 1024).toFixed(1) : '?'} KB
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  Message: {message.length} chars hidden
                </p>
                <p className="text-xs text-muted-foreground">
                  The image looks identical but contains your hidden message in the LSB layer.
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDownload}
              className="w-full py-3 rounded-xl border border-primary bg-primary/10 text-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Stego Image (PNG)
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LsbEncoder;
