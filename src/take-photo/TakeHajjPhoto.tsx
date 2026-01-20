import { useEffect, useRef, useState } from "react";
import { getFaceDetector, getLargestFaceBox } from "./vision";

type FacingMode = "user" | "environment";

type CaptureState =
  | { kind: "none" }
  | { kind: "captured"; blob: Blob; objectUrl: string; bytes: number };

type LiveChecks = {
  faceDetected: boolean;
  guidance: string;
  centeredOk: boolean;
  sizeOk: boolean;
  bgBrightOk: boolean; // corner brightness only
};

function bytesToKB(bytes: number) {
  return Math.round((bytes / 1024) * 10) / 10;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function Check({ ok }: { ok: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 18,
        textAlign: "center",
        color: ok ? "#1b7f3a" : "#999",
        fontWeight: 800,
        marginRight: 6,
      }}
      aria-hidden="true"
    >
      {ok ? "✓" : "○"}
    </span>
  );
}

export default function TakeHajjPhoto() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [status, setStatus] = useState<
    "idle" | "starting" | "ready" | "denied" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [capture, setCapture] = useState<CaptureState>({ kind: "none" });

  const [checks, setChecks] = useState<LiveChecks>({
    faceDetected: false,
    guidance: "Position your face inside the oval (within the square).",
    centeredOk: false,
    sizeOk: false,
    bgBrightOk: false,
  });

  async function stopStream() {
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function startCamera(mode: FacingMode) {
    setStatus("starting");
    setErrorMsg("");

    await stopStream();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setErrorMsg("Camera API not supported in this browser.");
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: { facingMode: mode },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (!videoRef.current) {
        setStatus("error");
        setErrorMsg("Video element not ready.");
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setStatus("ready");
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setStatus("denied");
        setErrorMsg(
          "Camera permission denied. Please allow camera access in your browser settings and reload."
        );
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setStatus("error");
        setErrorMsg(
          "No suitable camera found (or requested camera not available)."
        );
      } else {
        setStatus("error");
        setErrorMsg(err?.message || "Failed to start camera.");
      }
    }
  }

  useEffect(() => {
    return () => {
      if (capture.kind === "captured") URL.revokeObjectURL(capture.objectUrl);
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const isReady = status === "ready";

  function clearCapture() {
    setCapture((c) => {
      if (c.kind === "captured") URL.revokeObjectURL(c.objectUrl);
      return { kind: "none" };
    });
  }

  async function capture200x200Jpg() {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!vw || !vh) {
      alert("Camera not ready yet — try again in a moment.");
      return;
    }

    const side = Math.min(vw, vh);
    const sx = Math.floor((vw - side) / 2);
    const sy = Math.floor((vh - side) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      alert("Canvas not supported in this browser.");
      return;
    }

    ctx.drawImage(video, sx, sy, side, side, 0, 0, 200, 200);

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
    });

    if (!blob) {
      alert("Failed to create JPG.");
      return;
    }

    if (blob.size > 1024 * 1024) {
      alert("Photo is over 1MB (unexpected). Try again.");
      return;
    }

    const objectUrl = URL.createObjectURL(blob);

    setCapture((c) => {
      if (c.kind === "captured") URL.revokeObjectURL(c.objectUrl);
      return { kind: "captured", blob, objectUrl, bytes: blob.size };
    });
  }

  function downloadCapture() {
    if (capture.kind !== "captured") return;
    const a = document.createElement("a");
    a.href = capture.objectUrl;
    a.download = "hajj-photo-200x200.jpg";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function shareCapture() {
    if (capture.kind !== "captured") return;

    const file = new File([capture.blob], "hajj-photo-200x200.jpg", {
      type: "image/jpeg",
    });

    const canShare =
      (navigator as any).canShare && (navigator as any).canShare({ files: [file] });

    if (!navigator.share || !canShare) {
      alert(
        "Share is not available on this device/browser. Use Download instead, then save to Photos."
      );
      return;
    }

    try {
      await navigator.share({
        title: "Hajj Photo",
        text: "200×200 JPG (local-only)",
        files: [file],
      });
    } catch {
      // user cancelled
    }
  }

  // Live checks: face + size/center + background brightness (corner sampling)
  useEffect(() => {
    let cancelled = false;
    let rafId = 0;

    const run = async () => {
      if (cancelled) return;

      const video = videoRef.current;
      if (!video || status !== "ready") {
        rafId = requestAnimationFrame(run);
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) {
        rafId = requestAnimationFrame(run);
        return;
      }

      try {
        const detector = await getFaceDetector();
        const now = performance.now();
        const result = detector.detectForVideo(video, now);

        const bb = getLargestFaceBox(result);
        if (!bb) {
          setChecks({
            faceDetected: false,
            guidance: "No face detected. Ensure your face is visible and well-lit.",
            centeredOk: false,
            sizeOk: false,
            bgBrightOk: false,
          });
          rafId = requestAnimationFrame(run);
          return;
        }

        const fx = (bb.x as number) / vw;
        const fy = (bb.y as number) / vh;
        const fw = (bb.w as number) / vw;
        const fh = (bb.h as number) / vh;

        const faceCx = fx + fw / 2;
        const faceCy = fy + fh / 2;

        const centeredOk =
          Math.abs(faceCx - 0.5) <= 0.1 && Math.abs(faceCy - 0.45) <= 0.15;

        // target face box height ~ 35%..55% of frame
        const sizeOk = fh >= 0.35 && fh <= 0.55;

        let guidance = "Looks good. Hold still.";
        if (!sizeOk) guidance = fh < 0.35 ? "Move closer." : "Move a bit farther back.";
        else if (!centeredOk) guidance = "Center your face in the oval.";

        // Brightness: sample only the 4 corners (reduces skin-tone influence when close)
        const sampleW = 96;
        const sampleH = 96;
        const c = document.createElement("canvas");
        c.width = sampleW;
        c.height = sampleH;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          setChecks({
            faceDetected: true,
            guidance,
            centeredOk,
            sizeOk,
            bgBrightOk: false,
          });
          rafId = requestAnimationFrame(run);
          return;
        }

        ctx.drawImage(video, 0, 0, sampleW, sampleH);
        const img = ctx.getImageData(0, 0, sampleW, sampleH).data;

        const lumAt = (x: number, y: number) => {
          const i = (y * sampleW + x) * 4;
          const r = img[i];
          const g = img[i + 1];
          const b = img[i + 2];
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        // Corner sample squares (10% of width/height)
        const cw = Math.max(6, Math.floor(sampleW * 0.10));
        const ch = Math.max(6, Math.floor(sampleH * 0.10));

        const corners = [
          { x0: 0, y0: 0 }, // TL
          { x0: sampleW - cw, y0: 0 }, // TR
          { x0: 0, y0: sampleH - ch }, // BL
          { x0: sampleW - cw, y0: sampleH - ch }, // BR
        ];

        let sum = 0;
        let count = 0;
        for (const co of corners) {
          for (let y = co.y0; y < co.y0 + ch; y++) {
            for (let x = co.x0; x < co.x0 + cw; x++) {
              sum += lumAt(x, y);
              count++;
            }
          }
        }

        const mean = count ? sum / count : 0;
        const bgBrightOk = mean >= 175;

        let finalGuidance = guidance;
        if (sizeOk && centeredOk && !bgBrightOk) {
          finalGuidance = "Background looks dark. Try a brighter area / light wall.";
        }

        setChecks({
          faceDetected: true,
          guidance: finalGuidance,
          centeredOk,
          sizeOk,
          bgBrightOk,
        });
      } catch {
        setChecks((c) => ({
          ...c,
          guidance: "Tip: Use a bright, plain white background and center your face.",
        }));
      }

      rafId = requestAnimationFrame(run);
    };

    rafId = requestAnimationFrame(run);
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [status]);

  const canCapture = isReady; // no checkbox gating

  return (
    <div className="app-shell" style={{ display: "grid", gap: 12 }}>
      <a className="pill-link" href="/#/home" aria-label="Back to Home">
        ← Home
      </a>

      <h1 style={{ margin: 0 }}>Take Hajj Photo</h1>

      {/* 1) Camera preview at the very top (reduces "eyes down" effect) */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
          background: "#000",
          position: "relative",
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: "100%", height: "auto", display: "block" }}
        />

        {/* Overlay: square crop frame + passport-style oval */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "70%",
              aspectRatio: "1 / 1",
              position: "relative",
              border: "3px solid rgba(255,255,255,0.85)",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
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
        </div>

        <div
          style={{
            position: "absolute",
            left: 10,
            top: 10,
            padding: "6px 8px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontSize: 12,
          }}
        >
          {status === "starting" && "Starting camera…"}
          {status === "ready" && "Camera ready"}
          {status === "denied" && "Permission needed"}
          {status === "error" && "Camera error"}
          {status === "idle" && "Idle"}
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: 12,
            border: "1px solid rgba(239,68,68,0.35)",
            background: "rgba(239,68,68,0.08)",
            borderRadius: 12,
            color: "#ef4444",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* 2) Guidance below the camera */}
      <div
        style={{
          padding: 12,
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--card-bg)",
          display: "grid",
          gap: 8,
        }}
      >
        <strong>Live guidance</strong>

        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          Look straight at the camera with both eyes open.
        </div>

        <div style={{ fontSize: 14 }}>
          <span style={{ fontWeight: 600 }}>{checks.guidance}</span>
        </div>

        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, opacity: 0.95 }}>
          <li><Check ok={checks.faceDetected} />Face detected</li>
          <li><Check ok={checks.centeredOk} />Face centered</li>
          <li><Check ok={checks.sizeOk} />Face distance looks right</li>
          <li><Check ok={checks.bgBrightOk} />Background bright enough (corners)</li>
        </ul>

        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Reminder: no glasses/hat (headscarf allowed). Neutral expression. Plain light background.
        </div>

        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Best-effort guidance only. Final acceptance depends on Nusuk.
        </div>
      </div>

      <div className="btn-row">
        <button
          className="btn btn-secondary"
          onClick={() =>
            setFacingMode((m) => (m === "user" ? "environment" : "user"))
          }
        >
          Switch camera
        </button>

        <button
          className="btn btn-primary"
          disabled={!canCapture}
          onClick={capture200x200Jpg}
        >
          Capture 200×200
        </button>

        <button
          className="btn btn-danger"
          disabled={capture.kind !== "captured"}
          onClick={clearCapture}
          style={{ gridColumn: "1 / -1" }}
        >
          Retake
        </button>
      </div>

      {capture.kind === "captured" && (
        <div
          style={{
            padding: 12,
            border: "1px solid var(--border)",
            borderRadius: 12,
            background: "var(--card-bg)",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <strong>Captured (200×200 JPG)</strong>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Size: {bytesToKB(capture.bytes)} KB
            </span>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <img
              src={capture.objectUrl}
              alt="Captured 200x200"
              width={200}
              height={200}
              style={{ borderRadius: 12, border: "1px solid var(--border)" }}
            />

            <div style={{ display: "grid", gap: 8 }}>
              <button className="btn btn-primary" onClick={downloadCapture}>
                Download JPG
              </button>

              <button className="btn btn-secondary" onClick={shareCapture}>
                Share / Save to Photos
              </button>

              <div style={{ fontSize: 12, color: "var(--muted)", maxWidth: 320 }}>
                If “Share” is unavailable, use “Download JPG”, then save it to Photos from Files.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
