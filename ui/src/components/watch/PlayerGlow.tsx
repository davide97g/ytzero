import { useEffect, useRef, useState } from "react";
import { GLOW_BLEND, GLOW_SAMPLE_INTERVAL_MS, glowCanvasSize } from "../../playerGlow";
import "./PlayerGlow.css";

/** Longest edge of the canvas that covers the whole glow box. */
const GLOW_CANVAS_EDGE = 96;

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

/**
 * Ambient light behind the player. The video thumbnail is the resting state;
 * once a native player is on the page the glow follows the picture instead:
 * each sample puts the frame where the player sits and stretches its outermost
 * rows and columns out to the edges of the box, so the colours at the rim of
 * the picture spill onto the page around it. An embedded YouTube frame cannot
 * be read, so that player keeps the thumbnail.
 */
export default function PlayerGlow({ thumbnailUrl, opacity, active }: {
  thumbnailUrl: string;
  opacity: number;
  /** Sampling only runs while the glow can be seen. */
  active: boolean;
}) {
  const glowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [video, setVideo] = useState<VideoWithFrameCallback | null>(null);
  const [live, setLive] = useState(false);

  // The player remounts whenever its source changes, so keep tracking which
  // native video (if any) currently sits next to the glow.
  useEffect(() => {
    const wrap = glowRef.current?.parentElement;
    if (!wrap) return;
    const find = () => setVideo(wrap.querySelector<HTMLVideoElement>("video.lp-video"));
    find();
    const observer = new MutationObserver(find);
    observer.observe(wrap, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setLive(false);
    const glow = glowRef.current;
    const canvas = canvasRef.current;
    if (!active || !video || !glow || !canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const context = canvas.getContext("2d");
    const sample = document.createElement("canvas");
    const sampleContext = sample.getContext("2d");
    if (!context || !sampleContext) return;

    // Where the picture sits inside the glow box, in canvas pixels.
    let inner = { x: 0, y: 0, width: 0, height: 0 };
    // The next sample replaces the canvas instead of blending into it.
    let fresh = true;
    let lastSample = -Infinity;
    let drawn = false;
    const measure = () => {
      const box = glow.getBoundingClientRect();
      const picture = video.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const scale = GLOW_CANVAS_EDGE / Math.max(box.width, box.height);
      canvas.width = Math.max(1, Math.round(box.width * scale));
      canvas.height = Math.max(1, Math.round(box.height * scale));
      inner = {
        x: Math.max(0, Math.round((picture.left - box.left) * scale)),
        y: Math.max(0, Math.round((picture.top - box.top) * scale)),
        width: Math.max(1, Math.round(picture.width * scale)),
        height: Math.max(1, Math.round(picture.height * scale)),
      };
      // Resizing clears the canvas, so repaint it even while paused.
      fresh = true;
      draw(1);
    };
    const draw = (blend: number) => {
      if (video.readyState < 2) return;
      const size = glowCanvasSize(video.videoWidth, video.videoHeight);
      if (!size || !inner.width) return;
      if (sample.width !== size.width || sample.height !== size.height) {
        sample.width = size.width;
        sample.height = size.height;
      }
      try {
        sampleContext.drawImage(video, 0, 0, sample.width, sample.height);
      } catch {
        return;
      }
      const { x, y, width, height } = inner;
      const right = x + width;
      const bottom = y + height;
      const sw = sample.width;
      const sh = sample.height;
      context.globalAlpha = fresh ? 1 : blend;
      context.drawImage(sample, 0, 0, sw, sh, x, y, width, height);
      // Outermost row or column of the picture, stretched to the box edge.
      context.drawImage(sample, 0, 0, sw, 1, x, 0, width, y);
      context.drawImage(sample, 0, sh - 1, sw, 1, x, bottom, width, canvas.height - bottom);
      context.drawImage(sample, 0, 0, 1, sh, 0, y, x, height);
      context.drawImage(sample, sw - 1, 0, 1, sh, right, y, canvas.width - right, height);
      context.drawImage(sample, 0, 0, 1, 1, 0, 0, x, y);
      context.drawImage(sample, sw - 1, 0, 1, 1, right, 0, canvas.width - right, y);
      context.drawImage(sample, 0, sh - 1, 1, 1, 0, bottom, x, canvas.height - bottom);
      context.drawImage(sample, sw - 1, sh - 1, 1, 1, right, bottom, canvas.width - right, canvas.height - bottom);
      fresh = false;
      if (!drawn) {
        drawn = true;
        setLive(true);
      }
    };

    // Playing frames blend in; a jump (seek, pause, new source) lands at once.
    let frameHandle = 0;
    let usingFrameCallback = false;
    const tick = () => {
      const now = performance.now();
      if (now - lastSample >= GLOW_SAMPLE_INTERVAL_MS) {
        lastSample = now;
        draw(GLOW_BLEND);
      }
      schedule();
    };
    const schedule = () => {
      if (video.requestVideoFrameCallback) {
        usingFrameCallback = true;
        frameHandle = video.requestVideoFrameCallback(tick);
      } else {
        frameHandle = requestAnimationFrame(tick);
      }
    };
    const snap = () => {
      fresh = true;
      draw(1);
    };
    const events = ["loadeddata", "seeked", "pause"] as const;
    for (const event of events) video.addEventListener(event, snap);
    const resize = new ResizeObserver(measure);
    resize.observe(glow);
    resize.observe(video);
    measure();
    schedule();

    return () => {
      resize.disconnect();
      for (const event of events) video.removeEventListener(event, snap);
      if (usingFrameCallback) video.cancelVideoFrameCallback?.(frameHandle);
      else cancelAnimationFrame(frameHandle);
    };
  }, [active, video]);

  return (
    <div
      ref={glowRef}
      className={`player-glow${live ? " player-glow--live" : ""}`}
      style={{ backgroundImage: `url(${thumbnailUrl})`, opacity }}
    >
      <canvas ref={canvasRef} className="player-glow__canvas" aria-hidden="true" />
    </div>
  );
}
