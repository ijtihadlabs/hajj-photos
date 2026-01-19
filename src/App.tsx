import { useEffect, useMemo, useState } from "react";
import TakeHajjPhoto from "./take-photo/TakeHajjPhoto";
import PrepareExistingPhotoForNusuk from "./modules/prepare-existing-photo-for-nusuk";

type Route = "home" | "take-photo" | "prepare-photo";

function readRoute(): Route {
  const raw = window.location.hash.replace("#/", "").trim();
  if (raw === "" || raw === "home") return "home";
  if (raw === "take-photo") return "take-photo";
  if (raw === "prepare-photo") return "prepare-photo";
  return "home";
}

function ModuleTile({
  ariaLabel,
  href,
  enabled = true,
  icon,
  caption,
}: {
  ariaLabel: string;
  href?: string;
  enabled?: boolean;
  icon: string;
  caption?: string;
}) {
  const content = (
    <div
      role="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid #ddd",
        background: enabled ? "#fff" : "#f7f7f7",
        opacity: enabled ? 1 : 0.45,
        display: "grid",
        placeItems: "center",
        minHeight: 100,
        userSelect: "none",
        gap: 6,
      }}
    >
      <span style={{ fontSize: 26 }} aria-hidden="true">
        {icon}
      </span>

      {caption && (
        <span
          style={{
            fontSize: 11,
            opacity: 0.7,
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          {caption}
        </span>
      )}
    </div>
  );

  if (!enabled || !href) return content;

  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {content}
    </a>
  );
}

function Home() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <h1 style={{ marginBottom: 8 }}>Hajj Assistant</h1>
        <p style={{ margin: 0, opacity: 0.8, fontStyle: "italic" }}>
          A small, free effort to help fellow Hujjaj prepare with clarity and ease,
          seeking only the pleasure of Allah.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 16,
          marginTop: 8,
        }}
      >
        <ModuleTile
          ariaLabel="Take Hajj Photo"
          href="/#/take-photo"
          enabled
          icon="📷"
          caption="Take photo"
        />

        <ModuleTile
          ariaLabel="Prepare Existing Photo for Nusuk"
          href="/#/prepare-photo"
          enabled
          icon="🖼️"
          caption="Convert photo"
        />

        <ModuleTile
          ariaLabel="Hajj Checklist"
          enabled={false}
          icon="✅"
          caption="Checklist"
        />

        <ModuleTile
          ariaLabel="Hajj Timeline"
          enabled={false}
          icon="🗓️"
          caption="Timeline"
        />

        <ModuleTile
          ariaLabel="Notes"
          enabled={false}
          icon="📝"
          caption="Notes"
        />
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => readRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const page = useMemo(() => {
    if (route === "take-photo") return <TakeHajjPhoto />;
    if (route === "prepare-photo") return <PrepareExistingPhotoForNusuk />;
    return <Home />;
  }, [route]);

  return <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>{page}</div>;
}
