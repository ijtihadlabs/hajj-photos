import React from "react";
import PhotoConverter from "./PhotoConverter";

export default function PrepareExistingPhotoForNusuk() {
  return (
    <main style={{ padding: 16, maxWidth: 960 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <a
          href="/#/home"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            width: "fit-content",
            padding: "6px 10px",
            border: "1px solid #ddd",
            borderRadius: 999,
            color: "#111",
            background: "#fff",
          }}
          aria-label="Back to Home"
        >
          ← Home
        </a>

        <h1 style={{ margin: 0 }}>Prepare Existing Photo for Nusuk</h1>

        <p style={{ margin: 0, opacity: 0.85, maxWidth: 760 }}>
          Converts an existing photo to Nusuk-recommended technical format
          (<b>200×200 px</b>, <b>JPG</b>, under <b>1 MB</b>) fully offline.
          Visual requirements remain the responsibility of the user.
        </p>

        <PhotoConverter />
      </div>
    </main>
  );
}
