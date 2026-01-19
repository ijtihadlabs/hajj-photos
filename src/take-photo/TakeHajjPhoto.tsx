import { useEffect, useRef, useState } from "react";

type FacingMode = "user" | "environment";

export default function TakeHajjPhoto() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [status, setStatus] = useState<
    "idle" | "starting" | "ready" | "denied" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

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

    // Always stop old stream before starting a new one
    await stopStream();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setErrorMsg("Camera API not supported in this browser.");
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode, // best-effort; iOS Safari supports this
        },
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

      // iOS Safari sometimes needs an explicit play()
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
    // Start on mount
    startCamera(facingMode);

    // Cleanup on unmount
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const isReady = status === "ready";

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
        {/* Video */}
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

        {/* Square guide overlay */}
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

        {/* Status chip */}
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
          onClick={() =>
            alert(
              "Next step: Capture + crop + resize to 200×200 JPG (we’ll add this after preview is stable)."
            )
          }
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #ddd",
            background: isReady ? "#111" : "#eee",
            color: isReady ? "#fff" : "#666",
            cursor: isReady ? "pointer" : "not-allowed",
          }}
        >
          Capture (next)
        </button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Note: Camera access requires HTTPS in production. Netlify provides HTTPS
        automatically.
      </div>
    </div>
  );
}
