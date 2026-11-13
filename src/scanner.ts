// Camera scanning. Uses the browser's BarcodeDetector when it has one (Chrome on Android,
// Safari 17+ on some devices) and falls back to ZXing, loaded only when needed.

/** The camera sees the same barcode many times per second; count it once per hold. */
export function makeDebounce(windowMs: number, now: () => number = Date.now) {
  let last = "";
  let at = -Infinity;
  return (code: string): boolean => {
    const t = now();
    const fresh = code !== last || t - at > windowMs;
    if (code === last) at = t; // keep extending while the same code stays in view
    else [last, at] = [code, t];
    return fresh;
  };
}

interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
declare global {
  // Not in TypeScript's DOM types yet.
  var BarcodeDetector:
    | { new (): Detector; getSupportedFormats(): Promise<string[]> }
    | undefined;
}

async function nativeDetector(): Promise<Detector | null> {
  if (!globalThis.BarcodeDetector) return null;
  const formats = await globalThis.BarcodeDetector.getSupportedFormats();
  return formats.length ? new globalThis.BarcodeDetector() : null;
}

/** Start the back camera in `video` and call `onCode` for each new code. Returns a stop function. */
export async function startScanner(video: HTMLVideoElement, onCode: (code: string) => void): Promise<() => void> {
  const fresh = makeDebounce(1500);
  const emit = (code: string) => fresh(code) && onCode(code);
  const detector = await nativeDetector();

  if (!detector) {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const controls = await new BrowserMultiFormatReader().decodeFromConstraints(
      { video: { facingMode: "environment" } },
      video,
      (result) => result && emit(result.getText()),
    );
    return () => controls.stop();
  }

  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  video.srcObject = stream;
  await video.play();
  let running = true;
  const tick = async () => {
    if (!running) return;
    try {
      for (const b of await detector.detect(video)) emit(b.rawValue);
    } catch {
      // a frame that is not ready yet; try the next one
    }
    setTimeout(tick, 150);
  };
  tick();
  return () => {
    running = false;
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
}
