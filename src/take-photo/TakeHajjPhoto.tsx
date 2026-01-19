import { useEffect, useRef, useState } from "react";

type FacingMode = "user" | "environment";

type CaptureState =
  | { kind: "none" }
  | { kind: "captured"; blob: Blob; objectUrl: string; bytes: number };

function bytesToKB(bytes: number) {
  return Math.round((bytes / 1024) * 10) / 10;
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

  // Clean up captured object URLs
  useEffect(() => {
    return () => {
      if (capture.kind === "captured") URL.revokeObjectURL(capture.objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopStream();
    };
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

    // We crop a centered square from the camera frame, then resize to 200x200.
    // This matches the overlay (simple + reliable). Later we’ll guide framing via face detection.
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

    // 200x200 will almost always be well under 1MB, but we still enforce it.
    const quality = 0.92;

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
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

    // iOS Safari supports navigator.share for files on many versions, but not all.
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
      // User cancelled share — ignore
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h1 style={{ margin: 0 }}>Take Hajj Photo</h1>

      <p style={{ margin: 0, opacity: 0.85 }}>
        Local-only camera tool to help you take a Nusuk-ready photo. Nothing is
        uploaded anywhere.
      </p>

      <div
        style={{
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 12,
          display: "grid",
          gap: 8,
        }}
      >
        <strong>Requirements</strong>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>200 × 200 pixels, JPG, under 1MB</li>
          <li>Natural white background, no shadow</li>
          <li>No glasses / hat / accessories</li>
          <li>Face + part of shoulders (~70% of frame)</li>
          <li>Neutral expression (not smiling)</li>
          <li>Modest clothing (headscarf allowed)</li>
        </ul>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
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
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
        />

        {/* Square guide overlay (no shadow per requirement) */}
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
              border: "3px solid rgba(255,255,255,0.85)",
              borderRadius: 12,
              boxShadow: "none",
            }}
          />
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
            border: "1px solid #f2c2c2",
            background: "#fff5f5",
            borderRadius: 12,
            color: "#8a1f1f",
          }}
        >
          {errorMsg}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() =>
            setFacingMode((m) => (m === "user" ? "environment" : "user"))
          }
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Switch camera
        </button>

        <button
          disabled={!isReady}
          onClick={capture200x200Jpg}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #ddd",
            background: isReady ? "#111" : "#eee",
            color: isReady ? "#fff" : "#666",
            cursor: isReady ? "pointer" : "not-allowed",
          }}
        >
          Capture 200×200
        </button>

        <button
          disabled={capture.kind !== "captured"}
          onClick={clearCapture}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: capture.kind === "captured" ? "pointer" : "not-allowed",
            opacity: capture.kind === "captured" ? 1 : 0.5,
          }}
        >
          Retake
        </button>
      </div>

      {capture.kind === "captured" && (
        <div
          style={{
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 12,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <strong>Captured (200×200 JPG)</strong>
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              Size: {bytesToKB(capture.bytes)} KB
            </span>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <img
              src={capture.objectUrl}
              alt="Captured 200x200"
              width={200}
              height={200}
              style={{ borderRadius: 12, border: "1px solid #eee" }}
            />

            <div style={{ display: "grid", gap: 8 }}>
              <button
                onClick={downloadCapture}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#111",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Download JPG
              </button>

              <button
                onClick={shareCapture}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Share / Save to Photos
              </button>

              <div style={{ fontSize: 12, opacity: 0.8, maxWidth: 320 }}>
                If “Share” is unavailable, use “Download JPG”, then save it to Photos from Files.
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Next: live guidance (face framing + background brightness + shadow heuristic), then a final post-capture re-check.
      </div>
    </div>
  );
}
