/**
 * LSB Steganography Encoder
 * Hides a text message in the least-significant bits of an image's RGB channels.
 */

export function getMaxMessageLength(width: number, height: number): number {
  // 3 channels per pixel, 1 bit per channel, 8 bits per char, minus 32 bits for length header
  return Math.floor((width * height * 3) / 8) - 4;
}

export function encodeMessage(imageData: ImageData, message: string): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const { width, height } = imageData;
  const maxLen = getMaxMessageLength(width, height);

  if (message.length > maxLen) {
    throw new Error(`Message too long. Max ${maxLen} characters for this image.`);
  }

  // Convert message to binary string with 32-bit length header
  const encoder = new TextEncoder();
  const msgBytes = encoder.encode(message);
  const lengthBits = msgBytes.length.toString(2).padStart(32, '0');
  let bits = lengthBits;
  for (const byte of msgBytes) {
    bits += byte.toString(2).padStart(8, '0');
  }

  // Embed bits into LSBs of RGB channels
  let bitIdx = 0;
  for (let i = 0; i < data.length && bitIdx < bits.length; i++) {
    // Skip alpha channel (every 4th byte)
    if ((i + 1) % 4 === 0) continue;
    
    const bit = parseInt(bits[bitIdx], 10);
    data[i] = (data[i] & 0xFE) | bit;
    bitIdx++;
  }

  return new ImageData(data, width, height);
}

export function decodeMessage(imageData: ImageData): string {
  const { data } = imageData;

  // Extract bits from LSBs
  const extractBits = (count: number, startIdx: number): string => {
    let bits = '';
    let bitCount = 0;
    let pixelIdx = startIdx;
    
    while (bitCount < count && pixelIdx < data.length) {
      if ((pixelIdx + 1) % 4 !== 0) {
        bits += (data[pixelIdx] & 1).toString();
        bitCount++;
      }
      pixelIdx++;
    }
    return bits;
  };

  // Read 32-bit length header
  const lengthBits = extractBits(32, 0);
  const messageLength = parseInt(lengthBits, 2);

  if (messageLength <= 0 || messageLength > 100000) {
    return '(No hidden message detected)';
  }

  // Read message bytes
  const messageBits = extractBits(32 + messageLength * 8, 0).slice(32);
  const bytes = new Uint8Array(messageLength);
  for (let i = 0; i < messageLength; i++) {
    bytes[i] = parseInt(messageBits.slice(i * 8, (i + 1) * 8), 2);
  }

  try {
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  } catch {
    return '(Could not decode message)';
  }
}

export async function encodeImageFile(file: File, message: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      try {
        const encoded = encodeMessage(imageData, message);
        ctx.putImageData(encoded, 0, 0);
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create image blob'));
        }, 'image/png');
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
