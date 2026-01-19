import { useEffect, useMemo, useState } from "react";
import TakeHajjPhoto from "./take-photo/TakeHajjPhoto";
import PhotoConverter from "./modules/prepare-existing-photo-for-nusuk/PhotoConverter";

type Route = "home" | "take-photo" | "photo-conversion";

function readRoute(): Route {
  const raw = window.location.hash.replace("#/", "").trim();
  if (raw === "take-photo") return "take-photo";
  if (raw === "photo-conversion") return "photo-conversion";
  return "home";
}

function ModuleCard({
  title,
  subtitle,
  href,
  icon,
}: {
  title: string;
  subtitle: string;
  href: string;
  icon: string;
}) {
  return (
    <a className="module-card" href={href} aria-label={title}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div className="module-icon" aria-hidden="true">
          {icon}
        </div>
        <div style={{ display: "grid", gap: 2 }}>
          <div className="module-title">{title}</div>
          <div className="module-subtitle">{subtitle}</div>
        </div>
      </div>
    </a>
  );
}

function BackHome() {
  return (
    <a className="pill-link" href="/#/home" aria-label="Back to Home">
      ← Home
    </a>
  );
}

function Home() {
  return (
    <div className="app-shell" style={{ display: "grid", gap: 18 }}>
      {/* Left-aligned header for mobile readability */}
      <header style={{ display: "grid", gap: 8, marginTop: 10 }}>
        <h1 style={{ margin: 0, lineHeight: 1.15 }}>Hajj Photos</h1>
        <p className="app-subtitle" style={{ margin: 0 }}>
          A small, free effort to help fellow Hujjaj prepare calmly for photo requirements,
          seeking only the pleasure of Allah.
        </p>
      </header>

      {/* Two-module layout: stacked (best for phone + clarity) */}
      <div className="module-grid">
        <ModuleCard
          title="Take Hajj Photo"
          subtitle="Live helper + 200×200 JPG export"
          href="/#/take-photo"
          icon="📷"
        />

        <ModuleCard
          title="Photo Conversion"
          subtitle="Convert existing photo to Nusuk format"
          href="/#/photo-conversion"
          icon="🔄"
        />
      </div>

      <div style={{
        padding: 12,
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--card-bg)",
        fontSize: 12,
        color: "var(--muted)",
        lineHeight: 1.45,
      }}>
        Tip: Install to Home Screen for the best experience (works offline).
      </div>
    </div>
  );
}

function PhotoConversion() {
  return (
    <div className="app-shell" style={{ display: "grid", gap: 12 }}>
      <BackHome />
      <PhotoConverter />
    </div>
  );
}

function TakePhoto() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <TakeHajjPhoto />
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
    if (route === "take-photo") return <TakePhoto />;
    if (route === "photo-conversion") return <PhotoConversion />;
    return <Home />;
  }, [route]);

  return page;
}
