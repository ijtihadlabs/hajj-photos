import { useEffect, useMemo, useState } from "react";
import TakeHajjPhoto from "./take-photo/TakeHajjPhoto";

type Route = "home" | "take-photo";

function readRoute(): Route {
  const raw = window.location.hash.replace("#/", "").trim();
  return raw === "take-photo" ? "take-photo" : "home";
}

function NavButton({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        textDecoration: "none",
        border: "1px solid #ddd",
        background: active ? "#111" : "#fff",
        color: active ? "#fff" : "#111",
        fontSize: 14,
      }}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </a>
  );
}

function Home() {
  return (
    <>
      <h1 style={{ marginBottom: 8 }}>Hajj Assistant</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        A free, local-only app to help Hujjaj make calm, informed decisions
        before and during Hajj.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 12,
        }}
      >
        <h2 style={{ marginTop: 0 }}>How to use</h2>
        <ol style={{ marginBottom: 0 }}>
          <li>Open a module from the navigation above.</li>
          <li>Everything stays on your device (no accounts, no tracking).</li>
          <li>Install as a PWA for the best offline experience.</li>
        </ol>
      </div>
    </>
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

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <NavButton href="/#/home" active={route === "home"}>
          Home
        </NavButton>
        <NavButton href="/#/take-photo" active={route === "take-photo"}>
          Take Hajj Photo
        </NavButton>
      </nav>

      {page}
    </div>
  );
}
