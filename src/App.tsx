import { useEffect, useMemo, useState } from "react";
import TakeHajjPhoto from "./take-photo/TakeHajjPhoto";

type Route = "home" | "take-photo";

function readRoute(): Route {
  const raw = window.location.hash.replace("#/", "").trim();
  return raw === "take-photo" ? "take-photo" : "home";
}

function ModuleCard({
  title,
  subtitle,
  href,
  enabled = true,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  enabled?: boolean;
}) {
  const content = (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid #ddd",
        background: enabled ? "#fff" : "#f7f7f7",
        opacity: enabled ? 1 : 0.6,
        display: "grid",
        gap: 6,
        minHeight: 110,
      }}
    >
      <strong style={{ fontSize: 16 }}>{title}</strong>
      {subtitle && <span style={{ fontSize: 13, opacity: 0.75 }}>{subtitle}</span>}
      {!enabled && <span style={{ fontSize: 12, opacity: 0.6 }}>Coming soon</span>}
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
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginTop: 8,
        }}
      >
        <ModuleCard
          title="Take Hajj Photo"
          subtitle="Nusuk-ready photo helper"
          href="/#/take-photo"
          enabled
        />

        <ModuleCard
          title="Hajj Checklist"
          subtitle="Essentials & preparation"
          enabled={false}
        />

        <ModuleCard
          title="Hajj Timeline"
          subtitle="Day-by-day guidance"
          enabled={false}
        />

        <ModuleCard
          title="Notes"
          subtitle="Personal reminders"
          enabled={false}
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
    return <Home />;
  }, [route]);

  return <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>{page}</div>;
}
