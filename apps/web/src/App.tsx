import { Activity, ArrowUpRight, Building2, CloudSun, Gauge, LogIn, LogOut, MapPinned, ShieldCheck, Waves } from "lucide-react";
import { useAuth } from "./auth/AuthProvider";

const modules = [
  { icon: MapPinned, title: "City digital twin", description: "A spatial operating picture for critical assets and service zones.", status: "Foundation" },
  { icon: Activity, title: "Live telemetry", description: "A consistent ingestion path for connected infrastructure signals.", status: "Planned" },
  { icon: Gauge, title: "Predictive maintenance", description: "Prioritize interventions using asset condition and operational risk.", status: "Planned" },
  { icon: ShieldCheck, title: "Incident coordination", description: "Coordinate response workflows across city departments.", status: "Planned" },
];

export default function App() {
  const auth = useAuth();
  const healthUrl = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1"}/health`;
  const displayName = auth.profile?.name ?? auth.profile?.preferred_username ?? "Authenticated user";
  const roles = (auth.profile?.realm_access as { roles?: string[] } | undefined)?.roles?.filter((role) =>
    ["platform_admin", "tenant_admin", "city_operator", "analyst", "emergency_responder", "citizen"].includes(role),
  ) ?? [];

  return <main className="shell">
    <nav className="topbar" aria-label="Main navigation">
      <a className="brand" href="/" aria-label="CivicNexus home"><span className="brand-mark"><Building2 size={20} /></span><span>Civic<span className="brand-accent">Nexus</span></span></a>
      <div className="topbar-meta"><span className="live-dot" /> PLATFORM FOUNDATION <span className="version">v0.1</span></div>
    </nav>
    {auth.ready && auth.authenticated && <section className="session-bar" aria-label="Authenticated session">
      <div><span className="session-indicator" /> Signed in as <strong>{displayName}</strong>{roles.length > 0 && <span className="session-role">{roles.join(", ")}</span>}</div>
      <button className="auth-button secondary" onClick={() => void auth.signOut()}><LogOut size={15} /> Sign out</button>
    </section>}
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">URBAN INTELLIGENCE PLATFORM</p><h1>Make every city<br /><span>more resilient.</span></h1>
        <p className="hero-description">A unified operational foundation for understanding infrastructure, coordinating services, and shaping better urban outcomes.</p>
        <div className="hero-actions">
          {auth.ready && !auth.authenticated && <button className="auth-button primary" onClick={() => void auth.signIn()} disabled={!auth.configured}><LogIn size={16} /> Sign in with CivicNexus</button>}
          {auth.authenticated && <a className="primary-link" href="#capabilities">Explore capabilities <ArrowUpRight size={16} /></a>}
          <span className="build-label"><span className="live-dot" /> {auth.authenticated ? "SECURE SESSION" : "IDENTITY READY"}</span>
        </div>
        {!auth.configured && <p className="auth-hint">Sign-in is not enabled yet. Configure the VITE_OIDC_* settings and start the local Keycloak service.</p>}
        {auth.error && <p className="auth-error" role="alert">{auth.error}</p>}
        {!auth.ready && <p className="auth-hint" role="status">Checking your identity session…</p>}
      </div>
      <div className="city-card" aria-label="Illustrative city infrastructure overview">
        <div className="city-card-header"><span>METRO AREA / OVERVIEW</span><span className="map-status">SYSTEM MODEL</span></div>
        <div className="city-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="city-grid" /><div className="city-line line-a" /><div className="city-line line-b" /><div className="city-line line-c" /><span className="map-node node-a" /><span className="map-node node-b" /><span className="map-node node-c" /><div className="map-center"><Building2 size={25} /><span>URBAN CORE</span></div></div>
        <div className="city-card-footer"><span><Waves size={14} /> INFRASTRUCTURE NETWORK</span><span><CloudSun size={14} /> LIVE DATA CONNECTORS: NEXT</span></div>
      </div>
    </section>
    <section className="metrics" aria-label="Platform foundations"><div><span className="metric-value">01</span><span className="metric-label">UNIFIED CITY VIEW</span></div><div><span className="metric-value">GIS</span><span className="metric-label">SPATIAL-FIRST MODEL</span></div><div><span className="metric-value">API</span><span className="metric-label">INTEGRATION READY</span></div><div><span className="metric-value">MERN</span><span className="metric-label">MODULAR ARCHITECTURE</span></div></section>
    <section className="capabilities" id="capabilities"><div className="section-heading"><div><p className="eyebrow">DESIGNED FOR COMPLEXITY</p><h2>One platform. Connected city systems.</h2></div><p>Purpose-built foundations for the teams responsible for keeping a city moving.</p></div>
      <div className="module-grid">{modules.map((module, index) => { const Icon = module.icon; return <article className="module-card" key={module.title}><div className="module-top"><span className="module-icon"><Icon size={19} /></span><span className="module-index">0{index + 1}</span></div><h3>{module.title}</h3><p>{module.description}</p><div className="module-bottom"><span>{module.status}</span><ArrowUpRight size={15} /></div></article>; })}</div>
    </section>
    <footer className="footer"><span>© 2026 CIVICNEXUS · URBAN INTELLIGENCE</span><span>API FOUNDATION: INITIALIZING · <a href={healthUrl}>HEALTH ENDPOINT</a></span></footer>
  </main>;
}
