import React, { useEffect, useMemo, useRef, useState } from "react";

function isAllowedFile(f: File): boolean {
  const name = f.name.toLowerCase();
  return (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type LoadedImage = {
  img: HTMLImageElement;
  iw: number;
  ih: number;
};

export default function PhotoConverter() {
  const PREVIEW = 240;
  const OUT = 200;
  const MAX = 1024 * 1024;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [lastQuality, setLastQuality] = useState<number | null>(null);
  const [lastBytes, setLastBytes] = useState<number | null>(null);

  // Manual confirmations (definitive)
  const [confirmNoShadow, setConfirmNoShadow] = useState(false);
  const [confirmNoGlassesHat, setConfirmNoGlassesHat] = useState(false);
  const [confirmNeutral, setConfirmNeutral] = useState(false);
  const [confirmBackground, setConfirmBackground] = useState(false);
  const [confirmModest, setConfirmModest] = useState(false);

  const allConfirmed =
    confirmNoShadow &&
    confirmNoGlassesHat &&
    confirmNeutral &&
    confirmBackground &&
    confirmModest;

  const canConvert = !!loaded && !busy && allConfirmed;

  const drag = useRef({
    active: false,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0,
    id: 0 as number | null,
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [previewUrl, outputUrl]);

  async function loadImage(f: File): Promise<LoadedImage> {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    URL.revokeObjectURL(url);
    return { img, iw: img.naturalWidth, ih: img.naturalHeight };
  }

  const baseScale = useMemo(() => {
    if (!loaded) return 1;
    return Math.max(PREVIEW / loaded.iw, PREVIEW / loaded.ih);
  }, [loaded]);

  const scale = baseScale * zoom;

  const display = useMemo(() => {
    if (!loaded) return { w: 0, h: 0, l: 0, t: 0 };
    const w = loaded.iw * scale;
    const h = loaded.ih * scale;
    return {
      w,
      h,
      l: (PREVIEW - w) / 2 + offsetX,
      t: (PREVIEW - h) / 2 + offsetY,
    };
  }, [loaded, scale, offsetX, offsetY]);

  function resetCrop() {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }

  function resetOutput() {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setLastBytes(null);
    setLastQuality(null);
  }

  async function onPick(f: File | null) {
    setError(null);
    resetOutput();

    if (!f) return;
    if (!isAllowedFile(f)) {
      setError("Unsupported file type. Please upload JPG/JPEG or HEIC/HEIF only.");
      return;
    }

    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setLoaded(await loadImage(f));
    resetCrop();

    // Reset confirmations for a new photo
    setConfirmNoShadow(false);
    setConfirmNoGlassesHat(false);
    setConfirmNeutral(false);
    setConfirmBackground(false);
    setConfirmModest(false);
  }

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!loaded) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      active: true,
      sx: e.clientX,
      sy: e.clientY,
      ox: offsetX,
      oy: offsetY,
      id: e.pointerId,
    };
  }

  function moveDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active || drag.current.id !== e.pointerId) return;
    setOffsetX(drag.current.ox + (e.clientX - drag.current.sx));
    setOffsetY(drag.current.oy + (e.clientY - drag.current.sy));
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (drag.current.id === e.pointerId) drag.current.active = false;
  }

  function drawToCanvas() {
    if (!loaded || !canvasRef.current) return;

    const sx0 = (0 - display.l) / scale;
    const sy0 = (0 - display.t) / scale;
    const s0 = PREVIEW / scale;

    const s = Math.min(s0, loaded.iw, loaded.ih);
    const sx = clamp(sx0, 0, loaded.iw - s);
    const sy = clamp(sy0, 0, loaded.ih - s);

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, OUT, OUT);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(loaded.img, sx, sy, s, s, 0, 0, OUT, OUT);
  }

  useEffect(() => {
    if (!loaded) return;
    drawToCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, zoom, offsetX, offsetY]);

  const livePreviewDataUrl = useMemo(() => {
    if (!loaded || !canvasRef.current) return null;
    return canvasRef.current.toDataURL("image/jpeg", 0.85);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, zoom, offsetX, offsetY]);

  async function convert() {
    if (!loaded || !canvasRef.current) return;

    try {
      setBusy(true);
      setError(null);
      resetOutput();

      drawToCanvas();

      const toBlob = (q: number) =>
        new Promise<Blob>((res, rej) =>
          canvasRef.current!.toBlob(
            (b) => (b ? res(b) : rej(new Error("JPEG encode failed"))),
            "image/jpeg",
            q
          )
        );

      let q = 0.92;
      let blob = await toBlob(q);
      while (blob.size > MAX && q > 0.5) {
        q = clamp(q - 0.07, 0.5, 0.95);
        blob = await toBlob(q);
      }

      if (blob.size > MAX) throw new Error("Cannot compress under 1MB. Try a simpler original photo.");

      setOutputUrl(URL.createObjectURL(blob));
      setLastBytes(blob.size);
      setLastQuality(q);
    } catch (e: any) {
      setError(e?.message ?? "Conversion failed");
    } finally {
      setBusy(false);
    }
  }

  const sizeText = useMemo(() => {
    if (lastBytes == null) return null;
    const kb = lastBytes / 1024;
    return kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(0)} KB`;
  }, [lastBytes]);

  const missingCount = useMemo(() => {
    const flags = [
      confirmNoShadow,
      confirmNoGlassesHat,
      confirmNeutral,
      confirmBackground,
      confirmModest,
    ];
    return flags.filter((x) => !x).length;
  }, [
    confirmNoShadow,
    confirmNoGlassesHat,
    confirmNeutral,
    confirmBackground,
    confirmModest,
  ]);

  return (
    <section className="pc-root">
      <style>{`
        .pc-root { display: grid; gap: 16px; }
        .pc-help { font-size: 12px; opacity: 0.75; max-width: 760px; }
        .pc-card { padding: 12px; border: 1px solid #ddd; border-radius: 12px; background: #fff; }
        .pc-title { font-weight: 700; margin-bottom: 8px; }
        .pc-cropBox { width: 100%; max-width: 320px; aspect-ratio: 1 / 1; position: relative; border: 1px solid #ddd; border-radius: 16px; overflow: hidden; background: #fafafa; touch-action: none; }
        .pc-previewBox { width: 100%; max-width: 320px; aspect-ratio: 1 / 1; border: 1px solid #ddd; border-radius: 16px; background: #fafafa; display: grid; place-items: center; overflow: hidden; }
        .pc-actions { display: grid; gap: 8px; width: 100%; max-width: 320px; }

        .pc-btnRow { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .pc-btn { padding: 12px 12px; border-radius: 12px; border: 1px solid #ddd; font-weight: 700; }
        .pc-btn:disabled { opacity: 0.55; }
        /* Primary (Convert): filled + green tint, but also distinct shape/weight */
        .pc-btnPrimary { background: #1b7f3a; color: #fff; border-color: #1b7f3a; }
        /* Secondary (Reset): outline + red tint, but still readable without colour */
        .pc-btnDanger { background: #fff; color: #7a1a1a; border-color: #c9a3a3; }

        .pc-confirm { display: grid; gap: 8px; }
        .pc-confirm label { display: grid; grid-template-columns: 18px 1fr; gap: 10px; align-items: start; font-size: 13px; }
        .pc-note { font-size: 12px; opacity: 0.75; }

        @media (min-width: 860px) {
          .pc-mainGrid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; align-items: start; }
          .pc-side { position: sticky; top: 12px; }
        }
      `}</style>

      <div style={{ display: "grid", gap: 8 }}>
        <label>Upload a photo (JPG/JPEG/HEIC/HEIF only)</label>
        <input
          type="file"
          accept=".jpg,.jpeg,.heic,.heif"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
        <div className="pc-help">
          Use the oval guide to position your face and shoulders (aim for ~70% face area). Guidance only; Nusuk decides.
        </div>
      </div>

      <div className="pc-mainGrid">
        {/* MAIN */}
        <div style={{ display: "grid", gap: 16 }}>
          <div className="pc-card">
            <div className="pc-title">Crop</div>

            <div
              className="pc-cropBox"
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              style={{ cursor: loaded ? "grab" : "default" }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Crop preview"
                  draggable={false}
                  style={{
                    position: "absolute",
                    left: (display.l / PREVIEW) * 100 + "%",
                    top: (display.t / PREVIEW) * 100 + "%",
                    width: (display.w / PREVIEW) * 100 + "%",
                    height: (display.h / PREVIEW) * 100 + "%",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                />
              ) : (
                <div style={{ height: "100%", display: "grid", placeItems: "center", opacity: 0.7 }}>
                  No photo selected
                </div>
              )}

              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: "65%",
                  height: "80%",
                  transform: "translate(-50%,-50%)",
                  borderRadius: "50%",
                  border: "2px solid white",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
                  pointerEvents: "none",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 12, maxWidth: 320 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
                Zoom
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  disabled={!loaded}
                />
              </label>

              {/* Confirmations placed right above the buttons (mobile-friendly) */}
              <div className="pc-confirm">
                <div style={{ fontWeight: 700 }}>Confirm before convert</div>

                <label>
                  <input
                    type="checkbox"
                    checked={confirmNoShadow}
                    onChange={(e) => setConfirmNoShadow(e.target.checked)}
                  />
                  <span>No shadow on face or background</span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={confirmNoGlassesHat}
                    onChange={(e) => setConfirmNoGlassesHat(e.target.checked)}
                  />
                  <span>
                    No glasses / hat <span className="pc-note">(headscarf allowed for women)</span>
                  </span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={confirmNeutral}
                    onChange={(e) => setConfirmNeutral(e.target.checked)}
                  />
                  <span>Neutral expression (not smiling)</span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={confirmBackground}
                    onChange={(e) => setConfirmBackground(e.target.checked)}
                  />
                  <span>Plain light background</span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={confirmModest}
                    onChange={(e) => setConfirmModest(e.target.checked)}
                  />
                  <span>Modest clothing</span>
                </label>

                {!allConfirmed && loaded && (
                  <div className="pc-note">
                    Convert is disabled — complete {missingCount} confirmation{missingCount === 1 ? "" : "s"} above.
                  </div>
                )}
              </div>

              <div className="pc-btnRow">
                <button
                  type="button"
                  className="pc-btn pc-btnDanger"
                  onClick={() => {
                    resetCrop();
                    resetOutput();
                  }}
                  disabled={!loaded || busy}
                >
                  ↺ Reset
                </button>

                <button
                  type="button"
                  className="pc-btn pc-btnPrimary"
                  onClick={convert}
                  disabled={!canConvert}
                >
                  ✅ Convert
                </button>
              </div>
            </div>

            {error && <div style={{ color: "crimson", marginTop: 10 }}>{error}</div>}
          </div>

          <div className="pc-card">
            <div className="pc-title">Cropped preview</div>

            <div className="pc-previewBox">
              {loaded && livePreviewDataUrl ? (
                <img src={livePreviewDataUrl} alt="Live cropped preview" width={OUT} height={OUT} />
              ) : (
                <div style={{ opacity: 0.7 }}>No preview</div>
              )}
            </div>

            {outputUrl ? (
              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                <a href={outputUrl} download="nusuk-photo-200x200.jpg">
                  Download JPG
                </a>

                {sizeText && lastQuality != null && (
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Output: {sizeText} (quality {lastQuality.toFixed(2)})
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                Convert to enable download.
              </div>
            )}
          </div>
        </div>

        {/* SIDE (desktop only): guidelines reference */}
        <aside className="pc-card pc-side">
          <div className="pc-title">Guidelines (reference)</div>

          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.45, opacity: 0.95 }}>
            <li><b>200 × 200</b> pixels (enforced)</li>
            <li>File size <b>&lt; 1 MB</b> (enforced)</li>
            <li><b>No shadow</b> on face or background</li>
            <li>No accessories like glasses or hat</li>
            <li>~<b>70%</b> face + part of shoulders (use oval guide)</li>
            <li>Natural white / light plain background</li>
            <li>Headscarf allowed for women</li>
            <li>Natural look: neutral expression (not smiling)</li>
            <li>Modest clothing (does not need to be formal)</li>
          </ol>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            Note: This tool provides best-effort help only. Final acceptance depends on Nusuk’s validation.
          </div>
        </aside>
      </div>

      <canvas ref={canvasRef} width={OUT} height={OUT} style={{ display: "none" }} />
    </section>
  );
}
