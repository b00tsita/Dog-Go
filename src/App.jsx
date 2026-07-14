import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Home, Calendar, Clock, Bell, Camera, Check, X, Plus, User, Users,
  MapPin, Package, Pill, Utensils, AlertTriangle, Settings, Star,
  ChevronLeft, ChevronRight, Trash2, PawPrint,
  Building2, LogOut, Dog as DogIcon, Sparkles, ShieldAlert, Heart, Image as ImageIcon,
} from "lucide-react";
import { loadKey, saveKey } from "./supabaseClient";

/* ============================== BRAND ============================== */
// Paleta: los colores originales del logo Dog Go! -- marron profundo + amarillo calido + cream.
// Tipografia: Baloo 2 (redonda, con caracter, para el wordmark y titulos) + Inter (cuerpo).
const BRAND = {
  forest: "#5C3A21",     // marron principal (fondo oscuro hero/login, botones, header)
  forestSoft: "#39230F", // marron mas oscuro, superficies secundarias
  green: "#8A5A34",      // acento medio / etiquetas (marron claro del logo)
  greenSoft: "#E4EFE5",  // fondo suave de exito (estado, no marca)
  lime: "#F0B429",       // amarillo del logo -- acento vivo (CTA principal)
  limeDark: "#D89A1F",
  cream: "#FBF3E7",      // fondo general de la app
  paper: "#FFFFFF",
  ink: "#39230F",        // texto oscuro principal
  inkSoft: "#8A6C52",
  sand: "#E9DFCF",       // bordes / lineas suaves
  red: "#C1443D",
  redSoft: "#F7E4E2",
};

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');";

/* ============================== KEYS ============================== */
const K = {
  clients: "doggo-clients",
  walkers: "doggo-walkers",
  packages: "doggo-packages",
  walks: "doggo-walks",
  notifications: "doggo-notifications",
  settings: "doggo-settings",
};

const REFRESH_MS = 6000; // poleo simple para reflejar cambios de otros dispositivos

/* ============================== HELPERS ============================== */
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const crc = (n) => "₡" + Math.max(0, Math.round(n || 0)).toLocaleString("es-CR");
const todayStr = () => new Date().toISOString().slice(0, 10);
const pad2 = (n) => String(n).padStart(2, "0");

function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function humanDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-CR", { weekday: "short", day: "numeric", month: "short" });
}
function scheduledDate(walk) {
  return new Date(`${walk.date}T${walk.time}:00`);
}
function mmss(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
function weekOf(dateStr) {
  // lunes de esa semana, como string yyyy-mm-dd
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=domingo
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function resizeImage(file, maxW = 260, quality = 0.55) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ============================== SMALL UI ============================== */
function TabPill({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? BRAND.forest : "transparent",
        color: active ? BRAND.cream : BRAND.forest,
        border: `1.5px solid ${BRAND.forest}`,
      }}
      className="px-3.5 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={`rounded-3xl p-4 ${className}`}
      style={{ background: BRAND.paper, border: `1px solid ${BRAND.sand}`, boxShadow: "0 2px 14px rgba(19,42,31,0.06)", ...style }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children, sub }) {
  return (
    <div className="mb-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold" style={{ color: BRAND.forest, fontFamily: "'Baloo 2'" }}>
        {Icon && <Icon size={19} color={BRAND.green} />}
        {children}
      </h2>
      {sub && <p className="text-sm mt-0.5" style={{ color: BRAND.inkSoft }}>{sub}</p>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: BRAND.green }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 transition-shadow";
const inputStyle = { borderColor: BRAND.sand, background: "#FFFEFA" };

function TextInput(props) {
  return <input {...props} className={inputCls + " " + (props.className || "")} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
function TextArea(props) {
  return <textarea {...props} className={inputCls + " " + (props.className || "")} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
function Select(props) {
  return (
    <select {...props} className={inputCls + " " + (props.className || "")} style={{ ...inputStyle, ...(props.style || {}) }}>
      {props.children}
    </select>
  );
}

function Btn({ children, onClick, variant = "primary", icon: Icon, className = "", type = "button", disabled }) {
  const styles = {
    primary: { background: BRAND.forest, color: BRAND.cream },
    accent: { background: BRAND.lime, color: BRAND.forest },
    ghost: { background: "transparent", color: BRAND.forest, border: `1.5px solid ${BRAND.forest}` },
    danger: { background: BRAND.redSoft, color: BRAND.red, border: `1.5px solid ${BRAND.red}` },
    success: { background: BRAND.greenSoft, color: BRAND.green, border: `1.5px solid ${BRAND.green}` },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ ...styles[variant], opacity: disabled ? 0.5 : 1 }}
      className={`px-3.5 py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform ${className}`}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function Badge({ children, tone = "brown" }) {
  const map = {
    brown: { bg: "#EFE9CF", fg: BRAND.forest },
    green: { bg: BRAND.greenSoft, fg: BRAND.green },
    red: { bg: BRAND.redSoft, fg: BRAND.red },
    grey: { bg: "#EDEAE0", fg: "#6b6b5c" },
  };
  const c = map[tone];
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ background: c.bg, color: c.fg }}>
      {children}
    </span>
  );
}

function EmptyState({ icon: Icon, title, sub, action }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: "#EFE9CF" }}>
        <Icon size={24} style={{ color: BRAND.forest }} />
      </div>
      <p className="font-semibold" style={{ color: BRAND.forest }}>{title}</p>
      {sub && <p className="text-sm mt-1 max-w-xs" style={{ color: BRAND.inkSoft }}>{sub}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function CountdownRing({ totalSeconds, remainingSeconds, size = 64 }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const frac = totalSeconds > 0 ? clamp(remainingSeconds / totalSeconds, 0, 1) : 0;
  const dash = c * frac;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#EFE9CF" strokeWidth="6" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={BRAND.lime} strokeWidth="6" fill="none"
          strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s linear" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <PawPrint size={12} style={{ color: BRAND.forest }} />
        <span className="text-[11px] font-bold" style={{ color: BRAND.forest }}>{mmss(remainingSeconds)}</span>
      </div>
    </div>
  );
}

// Botón de foto. Por defecto exige cámara en vivo (recogida/entrega).
// Con galleryOk={true} permite elegir de galería (foto de perfil).
function PhotoButton({ label, onPhoto, existing, galleryOk = false }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={galleryOk ? undefined : "environment"}
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try {
            const dataUrl = await resizeImage(f);
            onPhoto(dataUrl);
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      {existing ? (
        <div className="flex items-center gap-2">
          <img src={existing} alt="foto" className="w-16 h-16 rounded-xl object-cover border" style={{ borderColor: BRAND.lime }} />
          {galleryOk && (
            <Btn variant="ghost" icon={ImageIcon} onClick={() => inputRef.current?.click()}>Cambiar</Btn>
          )}
        </div>
      ) : (
        <Btn icon={galleryOk ? ImageIcon : Camera} variant="accent" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Subiendo..." : label}
        </Btn>
      )}
    </div>
  );
}

/* ============================== APP ROOT ============================== */
export default function DogGoApp() {
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState("home"); // home | app
  const [role, setRole] = useState("cliente");
  const [clients, setClients] = useState([]);
  const [walkers, setWalkers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [walks, setWalks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({ hourlyRate: 1500 });
  const [currentClientId, setCurrentClientId] = useState(null);
  const [currentWalkerId, setCurrentWalkerId] = useState(null);
  const [tick, setTick] = useState(0);

  const fetchAll = useCallback(async () => {
    const [c, w, p, wk, n, s] = await Promise.all([
      loadKey(K.clients, []),
      loadKey(K.walkers, []),
      loadKey(K.packages, []),
      loadKey(K.walks, []),
      loadKey(K.notifications, []),
      loadKey(K.settings, { hourlyRate: 1500 }),
    ]);
    setClients(c); setWalkers(w); setPackages(p); setWalks(wk);
    setNotifications(n); setSettings(s);
  }, []);

  useEffect(() => {
    (async () => { await fetchAll(); setLoading(false); })();
  }, [fetchAll]);

  // reloj de 1s para cronómetros
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // refresco periódico para reflejar cambios hechos desde otros dispositivos
  useEffect(() => {
    if (loading) return;
    const t = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(t);
  }, [loading, fetchAll]);

  useEffect(() => {
    if (loading) return;
    const now = Date.now();
    let changed = false;
    const newWalks = walks.map((w) => {
      if (w.status !== "pending" || w.remindedSent) return w;
      const cl = clients.find((c) => c.id === w.clientId);
      if (!cl?.notifyBefore?.enabled) return w;
      const sched = scheduledDate(w).getTime();
      const mins = cl.notifyBefore.minutes || 15;
      if (now >= sched - mins * 60000 && now < sched) {
        changed = true;
        pushNotification({
          clientId: w.clientId, walkId: w.id, type: "reminder",
          message: `Tu paseador llegará en unos ${mins} min por ${cl.dog?.name || "tu perro"}.`,
        });
        return { ...w, remindedSent: true };
      }
      return w;
    });
    if (changed) { setWalks(newWalks); saveKey(K.walks, newWalks); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, loading]);

  const persist = {
    clients: (v) => { setClients(v); saveKey(K.clients, v); },
    walkers: (v) => { setWalkers(v); saveKey(K.walkers, v); },
    packages: (v) => { setPackages(v); saveKey(K.packages, v); },
    walks: (v) => { setWalks(v); saveKey(K.walks, v); },
    notifications: (v) => { setNotifications(v); saveKey(K.notifications, v); },
    settings: (v) => { setSettings(v); saveKey(K.settings, v); },
  };

  const pushNotification = useCallback((n) => {
    setNotifications((prev) => {
      const next = [{ id: uid(), createdAt: Date.now(), ...n }, ...prev];
      saveKey(K.notifications, next);
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BRAND.forest }}>
        <style>{FONT_IMPORT}</style>
        <div className="flex flex-col items-center gap-3">
          <PawPrint size={30} className="animate-bounce" style={{ color: BRAND.lime }} />
          <p className="font-semibold" style={{ color: BRAND.cream, fontFamily: "'Baloo 2'" }}>Cargando Dog Go!...</p>
        </div>
      </div>
    );
  }

  if (screen === "home") {
    return (
      <div className="min-h-screen" style={{ fontFamily: "Inter" }}>
        <style>{FONT_IMPORT}</style>
        <HomeScreen onEnter={(r) => { setRole(r); setScreen("app"); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BRAND.cream, fontFamily: "Inter" }}>
      <style>{FONT_IMPORT}</style>
      <Header role={role} setRole={setRole} onLogoClick={() => setScreen("home")} />
      <main className="max-w-3xl mx-auto px-3 pb-16 pt-4">
        {role === "cliente" && (
          <ClientPortal
            clients={clients} setClients={persist.clients}
            walkers={walkers} packages={packages}
            walks={walks} setWalks={persist.walks}
            notifications={notifications} pushNotification={pushNotification}
            settings={settings}
            currentClientId={currentClientId} setCurrentClientId={setCurrentClientId}
            tick={tick}
          />
        )}
        {role === "paseador" && (
          <WalkerPortal
            walkers={walkers} setWalkers={persist.walkers}
            clients={clients}
            walks={walks} setWalks={persist.walks}
            pushNotification={pushNotification}
            currentWalkerId={currentWalkerId} setCurrentWalkerId={setCurrentWalkerId}
            tick={tick}
          />
        )}
        {role === "admin" && (
          <AdminPortal
            packages={packages} setPackages={persist.packages}
            walkers={walkers} setWalkers={persist.walkers}
            clients={clients}
            settings={settings} setSettings={persist.settings}
          />
        )}
      </main>
    </div>
  );
}

function Header({ role, setRole, onLogoClick }) {
  return (
    <header className="sticky top-0 z-20" style={{ background: BRAND.forest }}>
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <button className="flex items-center gap-2" onClick={onLogoClick}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: BRAND.lime }}>
            <DogIcon size={19} style={{ color: BRAND.forest }} />
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ color: BRAND.cream, fontFamily: "'Baloo 2'" }}>
            Dog Go<span style={{ color: BRAND.lime }}>!</span>
          </span>
        </button>
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full p-1">
          {[
            { id: "cliente", label: "Cliente", icon: User },
            { id: "paseador", label: "Paseador", icon: PawPrint },
            { id: "admin", label: "Admin", icon: Settings },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className="px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors"
              style={{ background: role === r.id ? BRAND.lime : "transparent", color: role === r.id ? BRAND.forest : BRAND.cream }}
            >
              <r.icon size={13} /> <span className="hidden sm:inline">{r.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function HomeScreen({ onEnter }) {
  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col" style={{ background: BRAND.forest }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <PawPrint
          key={i} size={16 + (i % 3) * 8} className="absolute -z-0"
          style={{
            color: BRAND.cream, opacity: 0.06,
            top: `${(i * 31) % 100}%`, left: `${(i * 43) % 100}%`,
            transform: `rotate(${(i * 53) % 360}deg)`,
          }}
        />
      ))}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center py-16">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5" style={{ background: BRAND.lime }}>
          <DogIcon size={36} style={{ color: BRAND.forest }} />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight" style={{ color: BRAND.cream, fontFamily: "'Baloo 2'" }}>
          Dog Go<span style={{ color: BRAND.lime }}>!</span>
        </h1>
        <p className="mt-3 max-w-xs text-sm" style={{ color: "#D9C3A0" }}>
          Paseos, seguimiento en vivo y hotel para tu perro — todo en un solo lugar.
        </p>

        <div className="w-full max-w-xs mt-10 flex flex-col gap-3">
          <Btn variant="accent" className="w-full py-3 text-base" onClick={() => onEnter("cliente")}>Registrarme</Btn>
          <button
            onClick={() => onEnter("cliente")}
            className="w-full py-3 rounded-full text-base font-semibold"
            style={{ border: `1.5px solid ${BRAND.cream}`, color: BRAND.cream }}
          >
            Iniciar sesión
          </button>
        </div>

        <p className="text-[11px] mt-6" style={{ color: "#B79A72" }}>
          Al continuar aceptás formar parte del programa de perros más felices de la ciudad.
        </p>

        <div className="flex items-center gap-5 mt-10">
          <button onClick={() => onEnter("paseador")} className="text-xs font-semibold flex items-center gap-1.5" style={{ color: BRAND.lime }}>
            <PawPrint size={13} /> Soy paseador
          </button>
          <span style={{ color: "#7A5535" }}>·</span>
          <button onClick={() => onEnter("admin")} className="text-xs font-semibold flex items-center gap-1.5" style={{ color: BRAND.lime }}>
            <Settings size={13} /> Soy administrador
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================== LOGIN SWITCHER (shared pattern) ============================== */
function ProfileSwitcher({ title, people, onSelect, onCreateNew, nameOf, subOf, icon: Icon }) {
  return (
    <Card className="mt-4">
      <SectionTitle icon={Icon}>{title}</SectionTitle>
      {people.length > 0 && (
        <div className="space-y-2 mb-3">
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="w-full flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left hover:shadow-sm transition-shadow"
              style={{ borderColor: BRAND.sand }}
            >
              <span>
                <span className="block font-semibold text-sm" style={{ color: BRAND.forest }}>{nameOf(p)}</span>
                <span className="block text-xs" style={{ color: BRAND.inkSoft }}>{subOf(p)}</span>
              </span>
              <ChevronRight size={16} style={{ color: BRAND.green }} />
            </button>
          ))}
        </div>
      )}
      <Btn icon={Plus} variant="accent" onClick={onCreateNew}>Crear nuevo perfil</Btn>
    </Card>
  );
}

/* ============================== CLIENT PORTAL ============================== */
function ClientPortal({ clients, setClients, walkers, packages, walks, setWalks, notifications, pushNotification, settings, currentClientId, setCurrentClientId, tick }) {
  const [mode, setMode] = useState("switch");
  const [tab, setTab] = useState("calendario");

  const client = clients.find((c) => c.id === currentClientId);

  useEffect(() => { if (client) setMode("app"); }, [client]);

  if (!client && mode !== "register") {
    return (
      <ProfileSwitcher
        title="¿Quién eres?" icon={User}
        people={clients} nameOf={(p) => p.name} subOf={(p) => `Perro: ${p.dog?.name || "—"}`}
        onSelect={(id) => setCurrentClientId(id)}
        onCreateNew={() => setMode("register")}
      />
    );
  }

  if (!client && mode === "register") {
    return (
      <ClientRegisterForm
        walkers={walkers}
        onCancel={() => setMode("switch")}
        onSave={(newClient) => {
          const next = [...clients, newClient];
          setClients(next);
          setCurrentClientId(newClient.id);
        }}
      />
    );
  }

  const myWalks = walks.filter((w) => w.clientId === client.id);
  const myNotifications = notifications.filter((n) => n.clientId === client.id);

  const tabs = [
    { id: "calendario", label: "Calendario", icon: Calendar },
    { id: "pendientes", label: "Pendientes", icon: Clock },
    { id: "paquetes", label: "Paquetes", icon: Package },
    { id: "paseador", label: "Paseador", icon: PawPrint },
    { id: "hotel", label: "Hotel", icon: Building2 },
    { id: "notis", label: "Avisos", icon: Bell },
  ];

  return (
    <div>
      <ClientTopBar client={client} onSwitch={() => setCurrentClientId(null)} unread={myNotifications.length} />
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {tabs.map((t) => <TabPill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon}>{t.label}</TabPill>)}
      </div>

      {tab === "calendario" && <ClientCalendar walks={myWalks} />}
      {tab === "pendientes" && (
        <ClientPending walks={myWalks} setWalks={(updater) => setWalks(applyToAll(walks, updater))} walkers={walkers} client={client} tick={tick} />
      )}
      {tab === "paquetes" && (
        <ClientPackages client={client} packages={packages} walkers={walkers} settings={settings} walks={walks} setWalks={setWalks} pushNotification={pushNotification} />
      )}
      {tab === "paseador" && (
        <ClientWalkerPicker client={client} walkers={walkers}
          onChange={(walkerId) => setClients(clients.map((c) => (c.id === client.id ? { ...c, preferredWalkerId: walkerId } : c)))}
        />
      )}
      {tab === "hotel" && (
        <ClientHotel client={client}
          onChange={(hotel) => setClients(clients.map((c) => (c.id === client.id ? { ...c, hotel } : c)))}
        />
      )}
      {tab === "notis" && (
        <ClientNotifications notifications={myNotifications} client={client}
          onToggle={(notifyBefore) => setClients(clients.map((c) => (c.id === client.id ? { ...c, notifyBefore } : c)))}
        />
      )}
    </div>
  );
}

function applyToAll(walks, patchList) {
  const byId = new Map(patchList.map((p) => [p.id, p.patch]));
  return walks.map((w) => (byId.has(w.id) ? { ...w, ...byId.get(w.id) } : w));
}

function ClientTopBar({ client, onSwitch }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-xs" style={{ color: BRAND.inkSoft }}>Hola,</p>
        <h1 className="text-xl font-bold" style={{ color: BRAND.forest, fontFamily: "'Baloo 2'" }}>{client.name.split(" ")[0]} 🐾</h1>
      </div>
      <button onClick={onSwitch} className="text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-full" style={{ color: BRAND.forest, border: `1px solid ${BRAND.forest}` }}>
        <LogOut size={12} /> Cambiar perfil
      </button>
    </div>
  );
}

function ClientRegisterForm({ onSave, onCancel, walkers }) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    dogName: "", breed: "", age: "", weight: "", notes: "",
    preferredWalkerId: "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (!form.name || !form.dogName) return;
    onSave({
      id: uid(),
      name: form.name, phone: form.phone, email: form.email,
      dog: { name: form.dogName, breed: form.breed, age: form.age, weight: form.weight, notes: form.notes },
      hotel: { medications: [], meals: [], complications: "", quirks: "", behaviorPeople: "", behaviorAnimals: "", stays: [] },
      preferredWalkerId: form.preferredWalkerId || null,
      notifyBefore: { enabled: false, minutes: 15 },
      createdAt: Date.now(),
    });
  };

  return (
    <Card className="mt-4">
      <SectionTitle icon={User} sub="Cuéntanos de ti y de tu perro">Registro de cliente</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Tu nombre"><TextInput value={form.name} onChange={set("name")} placeholder="Ej. Camila Ríos" /></Field>
        <Field label="Teléfono"><TextInput value={form.phone} onChange={set("phone")} placeholder="8000 0000" /></Field>
        <Field label="Correo"><TextInput value={form.email} onChange={set("email")} placeholder="correo@ejemplo.com" /></Field>
        <Field label="Paseador preferido (opcional)">
          <Select value={form.preferredWalkerId} onChange={set("preferredWalkerId")}>
            <option value="">Elegir después</option>
            {walkers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </Field>
      </div>
      <div className="h-px my-3" style={{ background: BRAND.sand }} />
      <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: BRAND.green }}>Datos del perro</p>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Nombre del perro"><TextInput value={form.dogName} onChange={set("dogName")} placeholder="Ej. Toby" /></Field>
        <Field label="Raza"><TextInput value={form.breed} onChange={set("breed")} placeholder="Ej. Beagle" /></Field>
        <Field label="Edad"><TextInput value={form.age} onChange={set("age")} placeholder="Ej. 3 años" /></Field>
        <Field label="Peso"><TextInput value={form.weight} onChange={set("weight")} placeholder="Ej. 12 kg" /></Field>
      </div>
      <Field label="Notas / recomendaciones para el paseador">
        <TextArea rows={3} value={form.notes} onChange={set("notes")} placeholder="Alergias, temperamento, correa preferida..." />
      </Field>
      <div className="flex gap-2 mt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn icon={Check} onClick={submit}>Guardar y continuar</Btn>
      </div>
    </Card>
  );
}

function ClientCalendar({ walks }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selected, setSelected] = useState(todayStr());

  const first = new Date(cursor.y, cursor.m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${cursor.y}-${pad2(cursor.m + 1)}-${pad2(d)}`);

  const walksByDate = {};
  walks.forEach((w) => { (walksByDate[w.date] = walksByDate[w.date] || []).push(w); });

  const monthLabel = first.toLocaleDateString("es-CR", { month: "long", year: "numeric" });
  const dayWalks = (walksByDate[selected] || []).sort((a, b) => a.time.localeCompare(b.time));

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCursor((c) => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })}><ChevronLeft style={{ color: BRAND.forest }} /></button>
        <p className="font-semibold capitalize" style={{ color: BRAND.forest, fontFamily: "'Baloo 2'" }}>{monthLabel}</p>
        <button onClick={() => setCursor((c) => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })}><ChevronRight style={{ color: BRAND.forest }} /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-bold mb-1" style={{ color: BRAND.green }}>
        {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const dw = walksByDate[date] || [];
          const isSel = date === selected;
          const isToday = date === todayStr();
          return (
            <button
              key={i} onClick={() => setSelected(date)}
              className="aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative"
              style={{
                background: isSel ? BRAND.forest : isToday ? "#EFE9CF" : "transparent",
                color: isSel ? BRAND.cream : BRAND.forest,
                border: isToday && !isSel ? `1.5px solid ${BRAND.lime}` : "1px solid transparent",
              }}
            >
              {parseInt(date.slice(-2), 10)}
              <div className="flex gap-0.5 mt-0.5">
                {dw.slice(0, 3).map((w) => (
                  <span key={w.id} className="w-1.5 h-1.5 rounded-full" style={{ background: w.type === "paquete" ? (isSel ? BRAND.lime : BRAND.forest) : BRAND.lime, opacity: isSel ? 1 : 0.9 }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[11px]" style={{ color: BRAND.inkSoft }}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: BRAND.forest }} /> Paquete</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: BRAND.lime }} /> Individual / adicional</span>
      </div>

      <div className="h-px my-3" style={{ background: BRAND.sand }} />
      <p className="text-sm font-semibold mb-2" style={{ color: BRAND.forest }}>{humanDate(selected)}</p>
      {dayWalks.length === 0 ? (
        <p className="text-sm" style={{ color: BRAND.inkSoft }}>No hay paseos programados este día.</p>
      ) : (
        <div className="space-y-2">{dayWalks.map((w) => <WalkRow key={w.id} walk={w} />)}</div>
      )}
    </Card>
  );
}

function statusBadge(status) {
  if (status === "pending") return <Badge tone="grey">Pendiente</Badge>;
  if (status === "in_progress") return <Badge tone="brown">En curso</Badge>;
  if (status === "completed") return <Badge tone="green">Completado</Badge>;
  if (status === "cancelled") return <Badge tone="red">Cancelado</Badge>;
  return null;
}

function WalkRow({ walk, right }) {
  return (
    <div className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: BRAND.sand }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: BRAND.forest }}>{walk.time} · {walk.duration} min</p>
        <p className="text-xs" style={{ color: BRAND.inkSoft }}>{walk.type === "paquete" ? "Paquete" : "Individual"} {walk.price ? `· ${crc(walk.price)}` : ""}</p>
      </div>
      <div className="flex items-center gap-2">{statusBadge(walk.status)} {right}</div>
    </div>
  );
}

function ClientPending({ walks, setWalks, walkers, client, tick }) {
  const pending = walks.filter((w) => w.status === "pending" || w.status === "in_progress")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const cancel = (id) => setWalks([{ id, patch: { status: "cancelled" } }]);
  const changeWalker = (id, walkerId) => setWalks([{ id, patch: { walkerId } }]);

  return (
    <Card>
      <SectionTitle icon={Clock} sub="Tus próximos paseos. Puedes cancelarlos o cambiar de paseador mientras estén pendientes.">Paseos pendientes</SectionTitle>
      {pending.length === 0 ? (
        <EmptyState icon={Clock} title="No tienes paseos pendientes" sub="Agenda uno desde la pestaña Paquetes." />
      ) : (
        <div className="space-y-2">
          {pending.map((w) => {
            const walker = walkers.find((x) => x.id === w.walkerId);
            const remaining = w.status === "in_progress" ? w.duration * 60 - Math.floor((Date.now() - w.startedAt) / 1000) : null;
            return (
              <div key={w.id} className="rounded-xl border p-3" style={{ borderColor: BRAND.sand }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: BRAND.forest }}>{humanDate(w.date)} · {w.time}</p>
                    <p className="text-xs" style={{ color: BRAND.inkSoft }}>{w.duration} min · {walker?.name || "Sin asignar"}</p>
                  </div>
                  {w.status === "in_progress" ? <CountdownRing totalSeconds={w.duration * 60} remainingSeconds={remaining} size={54} /> : statusBadge(w.status)}
                </div>
                {w.status === "pending" && (
                  <div className="flex items-center gap-2 mt-2">
                    <Select value={w.walkerId || ""} onChange={(e) => changeWalker(w.id, e.target.value)} className="flex-1">
                      <option value="">Sin asignar</option>
                      {walkers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </Select>
                    <Btn variant="danger" icon={X} onClick={() => cancel(w.id)}>Cancelar</Btn>
                  </div>
                )}
                {w.status === "in_progress" && w.startPhoto && (
                  <img src={w.startPhoto} alt="inicio" className="w-14 h-14 rounded-lg object-cover mt-2 border" style={{ borderColor: BRAND.lime }} />
                )}
              </div>
            );
          })}
        </div>
      )}
      <RecommendationsBox client={client} />
    </Card>
  );
}

function RecommendationsBox({ client }) {
  const tips = [
    `Deja agua fresca disponible antes de que ${client.dog?.name || "tu perro"} salga a caminar.`,
    "Verifica que la correa y el arnés estén en buen estado.",
    "Comparte cualquier cambio de comportamiento reciente con el paseador.",
  ];
  if (client.dog?.notes) tips.unshift(`Recuerda: ${client.dog.notes}`);
  return (
    <div className="mt-4 rounded-2xl p-3" style={{ background: "#EFE9CF" }}>
      <p className="text-xs font-bold uppercase tracking-wide mb-1.5 flex items-center gap-1" style={{ color: BRAND.forest }}>
        <Sparkles size={13} /> Recomendaciones
      </p>
      <ul className="text-sm space-y-1" style={{ color: BRAND.forest }}>
        {tips.slice(0, 4).map((t, i) => <li key={i}>• {t}</li>)}
      </ul>
    </div>
  );
}

function ClientPackages({ client, packages, walkers, settings, walks, setWalks }) {
  const [subscribingId, setSubscribingId] = useState(null);
  const [indForm, setIndForm] = useState({ date: todayStr(), time: "08:00", duration: 30, walkerId: client.preferredWalkerId || "" });

  const indPrice = Math.round((indForm.duration / 60) * (settings.hourlyRate || 1500));

  const addIndividual = () => {
    if (!indForm.date || !indForm.time) return;
    const w = {
      id: uid(), clientId: client.id, walkerId: indForm.walkerId || null,
      type: "individual", date: indForm.date, time: indForm.time,
      duration: clamp(Number(indForm.duration) || 30, 15, 60), price: indPrice,
      status: "pending", createdAt: Date.now(),
    };
    setWalks([...walks, w]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle icon={Star} sub="Reserva un paseo adicional puntual, fuera de cualquier paquete.">Paseo individual / adicional</SectionTitle>
        <p className="text-xs mb-3 rounded-lg px-2.5 py-1.5 inline-block" style={{ background: "#EFE9CF", color: BRAND.forest }}>
          Tarifa: {crc(settings.hourlyRate || 1500)} / hora · mínimo 15 min, máximo 1 hora
        </p>
        <div className="grid sm:grid-cols-2 gap-x-3">
          <Field label="Fecha"><TextInput type="date" value={indForm.date} onChange={(e) => setIndForm((f) => ({ ...f, date: e.target.value }))} /></Field>
          <Field label="Hora"><TextInput type="time" value={indForm.time} onChange={(e) => setIndForm((f) => ({ ...f, time: e.target.value }))} /></Field>
          <Field label="Duración (min)">
            <TextInput type="number" min={15} max={60} step={5} value={indForm.duration} onChange={(e) => setIndForm((f) => ({ ...f, duration: e.target.value }))} />
          </Field>
          <Field label="Paseador">
            <Select value={indForm.walkerId} onChange={(e) => setIndForm((f) => ({ ...f, walkerId: e.target.value }))}>
              <option value="">Cualquiera disponible</option>
              {walkers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm font-semibold" style={{ color: BRAND.forest }}>Total: {crc(indPrice)}</p>
          <Btn icon={Plus} onClick={addIndividual}>Agendar paseo</Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Package} sub="Contrata un paquete recurrente creado por Dog Go!.">Paquetes disponibles</SectionTitle>
        {packages.length === 0 ? (
          <EmptyState icon={Package} title="Aún no hay paquetes" sub="El administrador debe crearlos primero." />
        ) : (
          <div className="space-y-2">
            {packages.map((p) => (
              <div key={p.id} className="rounded-xl border p-3" style={{ borderColor: BRAND.sand }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: BRAND.forest }}>{p.name}</p>
                    <p className="text-xs" style={{ color: BRAND.inkSoft }}>
                      {p.daysPerWeek} días/semana · {p.timesPerDay}x al día · {p.duration} min/paseo · {p.totalWeeks} semana{p.totalWeeks > 1 ? "s" : ""}
                    </p>
                  </div>
                  <p className="font-bold text-sm" style={{ color: BRAND.green }}>{crc(p.price)}</p>
                </div>
                {subscribingId === p.id ? (
                  <SubscribeForm pkg={p} walkers={walkers} client={client}
                    onCancel={() => setSubscribingId(null)}
                    onConfirm={(newWalks) => { setWalks([...walks, ...newWalks]); setSubscribingId(null); }}
                  />
                ) : (
                  <Btn className="mt-2" variant="accent" onClick={() => setSubscribingId(p.id)}>Contratar paquete</Btn>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// Selector de fechas puntuales para un paquete: hasta `daysPerWeek` días por
// cada una de las `totalWeeks` semanas, sin que tengan que ser consecutivos.
function SubscribeForm({ pkg, walkers, client, onCancel, onConfirm }) {
  const [startDate, setStartDate] = useState(todayStr());
  const [walkerId, setWalkerId] = useState(client.preferredWalkerId || "");
  const [times, setTimes] = useState(Array.from({ length: pkg.timesPerDay }, (_, i) => (i === 0 ? "08:00" : "17:00")));
  const [selectedDates, setSelectedDates] = useState(new Set());

  const weeks = Array.from({ length: pkg.totalWeeks }, (_, w) => {
    const weekStart = addDaysStr(weekOf(startDate), w * 7);
    return Array.from({ length: 7 }, (_, d) => addDaysStr(weekStart, d));
  });

  const toggleDate = (date, weekDates) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) { next.delete(date); return next; }
      const selectedInWeek = weekDates.filter((d) => next.has(d)).length;
      if (selectedInWeek >= pkg.daysPerWeek) return prev; // ya llegó al máximo esa semana
      next.add(date);
      return next;
    });
  };

  const totalNeeded = pkg.daysPerWeek * pkg.totalWeeks;
  const totalSelected = selectedDates.size;
  const canConfirm = totalSelected === totalNeeded;

  const confirm = () => {
    const newWalks = [];
    [...selectedDates].sort().forEach((date) => {
      times.forEach((t) => {
        newWalks.push({
          id: uid(), clientId: client.id, walkerId: walkerId || null,
          type: "paquete", packageId: pkg.id, date, time: t,
          duration: pkg.duration, price: 0, status: "pending", createdAt: Date.now(),
        });
      });
    });
    onConfirm(newWalks);
  };

  return (
    <div className="mt-3 rounded-2xl p-3" style={{ background: BRAND.cream }}>
      <Field label="Semana de inicio">
        <TextInput type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setSelectedDates(new Set()); }} />
      </Field>
      <Field label="Paseador">
        <Select value={walkerId} onChange={(e) => setWalkerId(e.target.value)}>
          <option value="">Cualquiera disponible</option>
          {walkers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {times.map((t, i) => (
          <Field key={i} label={`Hora del paseo ${i + 1}`}>
            <TextInput type="time" value={t} onChange={(e) => setTimes((ts) => ts.map((x, j) => (j === i ? e.target.value : x)))} />
          </Field>
        ))}
      </div>

      <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.green }}>
        Elegí los días de cada semana (máx. {pkg.daysPerWeek} por semana)
      </p>
      <div className="space-y-2 mb-2">
        {weeks.map((weekDates, wi) => {
          const selInWeek = weekDates.filter((d) => selectedDates.has(d)).length;
          return (
            <div key={wi} className="rounded-xl border p-2" style={{ borderColor: BRAND.sand, background: BRAND.paper }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold" style={{ color: BRAND.forest }}>Semana {wi + 1}</span>
                <span className="text-[11px] font-bold" style={{ color: selInWeek === pkg.daysPerWeek ? BRAND.green : BRAND.inkSoft }}>
                  {selInWeek}/{pkg.daysPerWeek}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weekDates.map((date) => {
                  const d = new Date(date + "T00:00:00");
                  const isSel = selectedDates.has(date);
                  return (
                    <button
                      key={date} onClick={() => toggleDate(date, weekDates)}
                      className="rounded-lg py-1.5 text-[11px] font-semibold flex flex-col items-center"
                      style={{ background: isSel ? BRAND.forest : "#F1ECDA", color: isSel ? BRAND.cream : BRAND.forest }}
                    >
                      <span style={{ opacity: 0.75, fontSize: 9 }}>{["D", "L", "M", "M", "J", "V", "S"][d.getDay()]}</span>
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs mb-2" style={{ color: BRAND.inkSoft }}>
        Seleccionados: <strong style={{ color: BRAND.forest }}>{totalSelected}/{totalNeeded}</strong>
      </p>

      <div className="flex gap-2 mt-1">
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn icon={Check} disabled={!canConfirm} onClick={confirm}>Confirmar {totalNeeded * pkg.timesPerDay} paseos</Btn>
      </div>
    </div>
  );
}

function ClientWalkerPicker({ client, walkers, onChange }) {
  return (
    <Card>
      <SectionTitle icon={PawPrint} sub="Este será tu paseador sugerido al agendar. Puedes cambiarlo en cualquier paseo pendiente.">Elegir paseador</SectionTitle>
      {walkers.length === 0 ? (
        <EmptyState icon={PawPrint} title="Aún no hay paseadores registrados" />
      ) : (
        <div className="space-y-2">
          {walkers.map((w) => (
            <button key={w.id} onClick={() => onChange(w.id)}
              className="w-full flex items-center gap-3 rounded-xl border p-3 text-left"
              style={{ borderColor: client.preferredWalkerId === w.id ? BRAND.lime : BRAND.sand, background: client.preferredWalkerId === w.id ? "#EFE9CF" : "transparent" }}>
              {w.photo ? <img src={w.photo} className="w-12 h-12 rounded-full object-cover" /> : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#EFE9CF" }}><User style={{ color: BRAND.forest }} /></div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: BRAND.forest }}>{w.name}</p>
                <p className="text-xs flex items-center gap-1" style={{ color: BRAND.inkSoft }}><MapPin size={11} /> {w.zone || "Zona no especificada"} · {w.experienceYears || 0} años exp.</p>
              </div>
              {client.preferredWalkerId === w.id && <Check size={18} style={{ color: BRAND.forest }} />}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function ClientHotel({ client, onChange }) {
  const h = client.hotel || { medications: [], meals: [], complications: "", quirks: "", behaviorPeople: "", behaviorAnimals: "", stays: [] };
  const [form, setForm] = useState({ ...h, stays: h.stays || [] });
  useEffect(() => setForm({ ...h, stays: h.stays || [] }), [client.id]);

  const save = () => onChange(form);
  const addMed = () => setForm((f) => ({ ...f, medications: [...f.medications, { id: uid(), name: "", hour: "08:00", dose: "" }] }));
  const addMeal = () => setForm((f) => ({ ...f, meals: [...f.meals, { id: uid(), hour: "08:00", food: "" }] }));
  const addStay = () => setForm((f) => ({ ...f, stays: [...f.stays, { id: uid(), checkIn: todayStr(), checkOut: addDaysStr(todayStr(), 1), notes: "" }] }));

  return (
    <Card>
      <SectionTitle icon={Building2} sub="Información para cuando tu perro se hospede en el hotel Dog Go!.">Hotel de perros</SectionTitle>

      <p className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: BRAND.green }}><Calendar size={12} /> Estadías (fechas de hospedaje)</p>
      {form.stays.map((s, i) => (
        <div key={s.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2 items-center">
          <TextInput type="date" value={s.checkIn} onChange={(e) => setForm((f) => ({ ...f, stays: f.stays.map((x, j) => j === i ? { ...x, checkIn: e.target.value } : x) }))} />
          <TextInput type="date" value={s.checkOut} onChange={(e) => setForm((f) => ({ ...f, stays: f.stays.map((x, j) => j === i ? { ...x, checkOut: e.target.value } : x) }))} />
          <TextInput placeholder="Nota" value={s.notes} onChange={(e) => setForm((f) => ({ ...f, stays: f.stays.map((x, j) => j === i ? { ...x, notes: e.target.value } : x) }))} />
          <button onClick={() => setForm((f) => ({ ...f, stays: f.stays.filter((_, j) => j !== i) }))}><Trash2 size={16} style={{ color: BRAND.red }} /></button>
        </div>
      ))}
      <Btn variant="ghost" icon={Plus} onClick={addStay} className="mb-4">Añadir estadía</Btn>

      <p className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: BRAND.green }}><Pill size={12} /> Medicamentos</p>
      {form.medications.map((m, i) => (
        <div key={m.id} className="grid grid-cols-[1fr_90px_1fr_auto] gap-2 mb-2 items-center">
          <TextInput placeholder="Nombre" value={m.name} onChange={(e) => setForm((f) => ({ ...f, medications: f.medications.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} />
          <TextInput type="time" value={m.hour} onChange={(e) => setForm((f) => ({ ...f, medications: f.medications.map((x, j) => j === i ? { ...x, hour: e.target.value } : x) }))} />
          <TextInput placeholder="Dosis" value={m.dose} onChange={(e) => setForm((f) => ({ ...f, medications: f.medications.map((x, j) => j === i ? { ...x, dose: e.target.value } : x) }))} />
          <button onClick={() => setForm((f) => ({ ...f, medications: f.medications.filter((_, j) => j !== i) }))}><Trash2 size={16} style={{ color: BRAND.red }} /></button>
        </div>
      ))}
      <Btn variant="ghost" icon={Plus} onClick={addMed} className="mb-4">Añadir medicamento</Btn>

      <p className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: BRAND.green }}><Utensils size={12} /> Horario de comidas</p>
      {form.meals.map((m, i) => (
        <div key={m.id} className="grid grid-cols-[90px_1fr_auto] gap-2 mb-2 items-center">
          <TextInput type="time" value={m.hour} onChange={(e) => setForm((f) => ({ ...f, meals: f.meals.map((x, j) => j === i ? { ...x, hour: e.target.value } : x) }))} />
          <TextInput placeholder="Alimento / cantidad" value={m.food} onChange={(e) => setForm((f) => ({ ...f, meals: f.meals.map((x, j) => j === i ? { ...x, food: e.target.value } : x) }))} />
          <button onClick={() => setForm((f) => ({ ...f, meals: f.meals.filter((_, j) => j !== i) }))}><Trash2 size={16} style={{ color: BRAND.red }} /></button>
        </div>
      ))}
      <Btn variant="ghost" icon={Plus} onClick={addMeal} className="mb-4">Añadir comida</Btn>

      <Field label="Complicaciones de salud"><TextArea rows={2} value={form.complications} onChange={(e) => setForm((f) => ({ ...f, complications: e.target.value }))} placeholder="Ej. Alergias, cirugías previas, cuidados especiales" /></Field>
      <Field label="Mañas / comportamiento"><TextArea rows={2} value={form.quirks} onChange={(e) => setForm((f) => ({ ...f, quirks: e.target.value }))} placeholder="Ej. Le teme a los truenos, escarba las cobijas" /></Field>
      <Field label="Comportamiento con personas"><TextArea rows={2} value={form.behaviorPeople} onChange={(e) => setForm((f) => ({ ...f, behaviorPeople: e.target.value }))} /></Field>
      <Field label="Comportamiento con otros animales"><TextArea rows={2} value={form.behaviorAnimals} onChange={(e) => setForm((f) => ({ ...f, behaviorAnimals: e.target.value }))} /></Field>

      <Btn icon={Check} onClick={save}>Guardar información del hotel</Btn>
    </Card>
  );
}

function ClientNotifications({ notifications, client, onToggle }) {
  const nb = client.notifyBefore || { enabled: false, minutes: 15 };
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle icon={Bell}>Preferencias de aviso</SectionTitle>
        <div className="flex items-center justify-between rounded-xl p-3" style={{ background: BRAND.cream }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: BRAND.forest }}>Avisarme antes de recoger a mi perro</p>
            <p className="text-xs" style={{ color: BRAND.inkSoft }}>Independiente de esto, siempre recibirás un aviso cuando el paseo inicie y termine, con foto.</p>
          </div>
          <button onClick={() => onToggle({ ...nb, enabled: !nb.enabled })}
            className="w-11 h-6 rounded-full flex items-center px-0.5 shrink-0" style={{ background: nb.enabled ? BRAND.green : "#D8CCB4" }}>
            <span className="w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: nb.enabled ? "translateX(20px)" : "translateX(0)" }} />
          </button>
        </div>
        {nb.enabled && (
          <Field label="Minutos de anticipación">
            <TextInput type="number" min={5} max={60} value={nb.minutes} onChange={(e) => onToggle({ ...nb, minutes: Number(e.target.value) || 15 })} />
          </Field>
        )}
      </Card>
      <Card>
        <SectionTitle icon={Bell}>Historial de avisos</SectionTitle>
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="Sin avisos todavía" />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-center gap-3 rounded-xl border p-2.5" style={{ borderColor: BRAND.sand }}>
                {n.photo && <img src={n.photo} className="w-12 h-12 rounded-lg object-cover" />}
                <div className="flex-1">
                  <p className="text-sm" style={{ color: BRAND.forest }}>{n.message}</p>
                  <p className="text-[11px]" style={{ color: BRAND.inkSoft }}>{new Date(n.createdAt).toLocaleString("es-CR")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================== WALKER PORTAL ============================== */
function WalkerPortal({ walkers, setWalkers, clients, walks, setWalks, pushNotification, currentWalkerId, setCurrentWalkerId }) {
  const [mode, setMode] = useState("switch");
  const [tab, setTab] = useState("hoy");
  const walker = walkers.find((w) => w.id === currentWalkerId);

  useEffect(() => { if (walker) setMode("app"); }, [walker]);

  if (!walker && mode !== "register") {
    return (
      <ProfileSwitcher
        title="¿Quién eres?" icon={PawPrint}
        people={walkers} nameOf={(p) => p.name} subOf={(p) => p.zone || "Sin zona"}
        onSelect={(id) => setCurrentWalkerId(id)}
        onCreateNew={() => setMode("register")}
      />
    );
  }
  if (!walker && mode === "register") {
    return (
      <WalkerRegisterForm onCancel={() => setMode("switch")} onSave={(w) => { setWalkers([...walkers, w]); setCurrentWalkerId(w.id); }} />
    );
  }

  const myWalks = walks.filter((w) => w.walkerId === walker.id);
  const today = todayStr();
  const todayWalks = myWalks.filter((w) => w.date === today && w.status !== "cancelled").sort((a, b) => a.time.localeCompare(b.time));
  const pendingWalks = myWalks.filter((w) => w.status === "pending" || w.status === "in_progress").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const patchWalk = (id, patch) => setWalks(walks.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const startWalk = (w, photo) => {
    patchWalk(w.id, { status: "in_progress", startedAt: Date.now(), startPhoto: photo, remindedSent: true });
    const c = clients.find((c) => c.id === w.clientId);
    pushNotification({ clientId: w.clientId, walkId: w.id, type: "start", message: `¡El paseo de ${c?.dog?.name || "tu perro"} comenzó! ${walker.name} lo recogió.`, photo });
  };
  const finishWalk = (w, photo) => {
    patchWalk(w.id, { status: "completed", endedAt: Date.now(), endPhoto: photo });
    const c = clients.find((c) => c.id === w.clientId);
    pushNotification({ clientId: w.clientId, walkId: w.id, type: "end", message: `¡El paseo de ${c?.dog?.name || "tu perro"} terminó! ${walker.name} ya lo devolvió a casa.`, photo });
  };
  const cancelWalk = (w) => {
    patchWalk(w.id, { status: "cancelled" });
    const c = clients.find((c) => c.id === w.clientId);
    pushNotification({ clientId: w.clientId, walkId: w.id, type: "cancel", message: `El paseo de ${c?.dog?.name || "tu perro"} del ${humanDate(w.date)} a las ${w.time} fue cancelado.` });
  };

  const uniqueDogClients = [...new Map(myWalks.map((w) => [w.clientId, w])).values()]
    .map((w) => clients.find((c) => c.id === w.clientId)).filter(Boolean);

  const tabs = [
    { id: "hoy", label: "Hoy", icon: Home },
    { id: "perros", label: "Mis perros", icon: DogIcon },
    { id: "pendientes", label: "Pendientes", icon: Clock },
    { id: "perfil", label: "Perfil", icon: User },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs" style={{ color: BRAND.inkSoft }}>Bienvenido,</p>
          <h1 className="text-xl font-bold" style={{ color: BRAND.forest, fontFamily: "'Baloo 2'" }}>{walker.name.split(" ")[0]} 🐕‍🦺</h1>
        </div>
        <button onClick={() => setCurrentWalkerId(null)} className="text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-full" style={{ color: BRAND.forest, border: `1px solid ${BRAND.forest}` }}>
          <LogOut size={12} /> Cambiar perfil
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {tabs.map((t) => <TabPill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon}>{t.label}</TabPill>)}
      </div>

      {tab === "hoy" && (
        <Card>
          <SectionTitle icon={Home} sub={`Tu horario de hoy, ${humanDate(today)}.`}>Agenda de hoy</SectionTitle>
          {todayWalks.length === 0 ? <EmptyState icon={Calendar} title="No tienes paseos hoy" /> : (
            <div className="space-y-2">
              {todayWalks.map((w) => (
                <WalkerWalkCard key={w.id} walk={w} client={clients.find((c) => c.id === w.clientId)}
                  onStart={(photo) => startWalk(w, photo)} onFinish={(photo) => finishWalk(w, photo)} onCancel={() => cancelWalk(w)} />
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "perros" && (
        <Card>
          <SectionTitle icon={DogIcon} sub="Perros a tu cargo, con su información de cuidado.">Mis perros</SectionTitle>
          {uniqueDogClients.length === 0 ? <EmptyState icon={DogIcon} title="Aún no tienes perros asignados" /> : (
            <div className="space-y-3">{uniqueDogClients.map((c) => <DogInfoCard key={c.id} client={c} />)}</div>
          )}
        </Card>
      )}

      {tab === "pendientes" && (
        <Card>
          <SectionTitle icon={Clock} sub="Todos tus paseos por hacer, ordenados por fecha.">Paseos pendientes</SectionTitle>
          {pendingWalks.length === 0 ? <EmptyState icon={Clock} title="No tienes paseos pendientes" /> : (
            <div className="space-y-2">
              {pendingWalks.map((w) => (
                <div key={w.id}>
                  <p className="text-xs font-semibold mb-1" style={{ color: BRAND.green }}>{humanDate(w.date)}</p>
                  <WalkerWalkCard walk={w} client={clients.find((c) => c.id === w.clientId)}
                    onStart={(photo) => startWalk(w, photo)} onFinish={(photo) => finishWalk(w, photo)} onCancel={() => cancelWalk(w)} />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "perfil" && <WalkerProfileEdit walker={walker} onSave={(patch) => setWalkers(walkers.map((w) => (w.id === walker.id ? { ...w, ...patch } : w)))} />}
    </div>
  );
}

function WalkerWalkCard({ walk, client, onStart, onFinish, onCancel }) {
  const remaining = walk.status === "in_progress" ? walk.duration * 60 - Math.floor((Date.now() - walk.startedAt) / 1000) : null;
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: BRAND.sand }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: BRAND.forest }}>{client?.dog?.name || "Perro"} · {walk.time}</p>
          <p className="text-xs" style={{ color: BRAND.inkSoft }}>{client?.name} · {walk.duration} min · {walk.type === "paquete" ? "Paquete" : "Individual"}</p>
        </div>
        {walk.status === "in_progress" ? <CountdownRing totalSeconds={walk.duration * 60} remainingSeconds={remaining} size={54} /> : statusBadge(walk.status)}
      </div>
      {walk.status === "pending" && (
        <div className="flex items-center gap-2 mt-2.5">
          <PhotoButton label="Marcar recogida" onPhoto={onStart} />
          <Btn variant="danger" icon={X} onClick={onCancel}>Cancelar</Btn>
        </div>
      )}
      {walk.status === "in_progress" && (
        <div className="flex items-center gap-2 mt-2.5">
          {walk.startPhoto && <img src={walk.startPhoto} className="w-12 h-12 rounded-lg object-cover border" style={{ borderColor: BRAND.lime }} />}
          <PhotoButton label="Marcar devolución" onPhoto={onFinish} />
        </div>
      )}
      {walk.status === "completed" && (
        <div className="flex gap-2 mt-2.5">
          {walk.startPhoto && <img src={walk.startPhoto} className="w-12 h-12 rounded-lg object-cover border" />}
          {walk.endPhoto && <img src={walk.endPhoto} className="w-12 h-12 rounded-lg object-cover border" />}
        </div>
      )}
    </div>
  );
}

function DogInfoCard({ client }) {
  const [open, setOpen] = useState(false);
  const h = client.hotel || {};
  const now = todayStr();
  const activeStay = (h.stays || []).find((s) => s.checkIn <= now && now <= s.checkOut);
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: BRAND.sand }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between">
        <div className="text-left">
          <p className="font-semibold text-sm" style={{ color: BRAND.forest }}>
            {client.dog?.name} <span className="text-xs font-normal" style={{ color: BRAND.inkSoft }}>· {client.dog?.breed}, {client.dog?.age}</span>
          </p>
          <p className="text-xs" style={{ color: BRAND.inkSoft }}>Dueño: {client.name} · {client.phone}</p>
          {activeStay && <span className="inline-block mt-1"><Badge tone="green">En el hotel hasta {humanDate(activeStay.checkOut)}</Badge></span>}
        </div>
        <ChevronRight size={16} style={{ color: BRAND.green, transform: open ? "rotate(90deg)" : "none" }} />
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-sm" style={{ color: BRAND.forest }}>
          {client.dog?.notes && <p className="flex gap-1.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> {client.dog.notes}</p>}
          {h.complications && <p className="flex gap-1.5"><ShieldAlert size={14} className="shrink-0 mt-0.5" /> {h.complications}</p>}
          {h.quirks && <p className="flex gap-1.5"><Heart size={14} className="shrink-0 mt-0.5" /> {h.quirks}</p>}
          {h.behaviorPeople && <p className="text-xs" style={{ color: BRAND.inkSoft }}>Con personas: {h.behaviorPeople}</p>}
          {h.behaviorAnimals && <p className="text-xs" style={{ color: BRAND.inkSoft }}>Con animales: {h.behaviorAnimals}</p>}
          {h.medications?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase" style={{ color: BRAND.green }}>Medicamentos</p>
              {h.medications.map((m) => <p key={m.id} className="text-xs">• {m.name} — {m.hour} — {m.dose}</p>)}
            </div>
          )}
          {h.meals?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase" style={{ color: BRAND.green }}>Comidas</p>
              {h.meals.map((m) => <p key={m.id} className="text-xs">• {m.hour} — {m.food}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WalkerRegisterForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ name: "", phone: "", zone: "", experienceYears: "", bio: "", photo: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Card className="mt-4">
      <SectionTitle icon={PawPrint} sub="Este será tu perfil visible para los clientes.">Registro de paseador</SectionTitle>
      <div className="flex items-center gap-3 mb-3">
        {form.photo ? <img src={form.photo} className="w-16 h-16 rounded-full object-cover" /> : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#EFE9CF" }}><User style={{ color: BRAND.forest }} /></div>
        )}
        <PhotoButton label="Foto de perfil" galleryOk onPhoto={(p) => setForm((f) => ({ ...f, photo: p }))} />
      </div>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Nombre completo"><TextInput value={form.name} onChange={set("name")} placeholder="Ej. Andrés Gómez" /></Field>
        <Field label="Teléfono"><TextInput value={form.phone} onChange={set("phone")} placeholder="8000 0000" /></Field>
        <Field label="Zona de cobertura"><TextInput value={form.zone} onChange={set("zone")} placeholder="Ej. San José Centro" /></Field>
        <Field label="Años de experiencia"><TextInput type="number" value={form.experienceYears} onChange={set("experienceYears")} /></Field>
      </div>
      <Field label="Sobre ti"><TextArea rows={3} value={form.bio} onChange={set("bio")} placeholder="Cuéntale a los clientes por qué confiar en ti" /></Field>
      <div className="flex gap-2 mt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn icon={Check} onClick={() => form.name && onSave({ id: uid(), ...form, createdAt: Date.now() })}>Guardar perfil</Btn>
      </div>
    </Card>
  );
}

function WalkerProfileEdit({ walker, onSave }) {
  const [form, setForm] = useState(walker);
  useEffect(() => setForm(walker), [walker.id]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Card>
      <SectionTitle icon={User}>Mi perfil</SectionTitle>
      <div className="flex items-center gap-3 mb-3">
        {form.photo ? <img src={form.photo} className="w-16 h-16 rounded-full object-cover" /> : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#EFE9CF" }}><User style={{ color: BRAND.forest }} /></div>
        )}
        <PhotoButton label="Cambiar foto" galleryOk existing={form.photo} onPhoto={(p) => setForm((f) => ({ ...f, photo: p }))} />
      </div>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Nombre"><TextInput value={form.name} onChange={set("name")} /></Field>
        <Field label="Teléfono"><TextInput value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Zona"><TextInput value={form.zone} onChange={set("zone")} /></Field>
        <Field label="Años de experiencia"><TextInput type="number" value={form.experienceYears} onChange={set("experienceYears")} /></Field>
      </div>
      <Field label="Sobre mí"><TextArea rows={3} value={form.bio} onChange={set("bio")} /></Field>
      <Btn icon={Check} onClick={() => onSave(form)}>Guardar cambios</Btn>
    </Card>
  );
}

/* ============================== ADMIN PORTAL ============================== */
function AdminPortal({ packages, setPackages, walkers, setWalkers, clients, settings, setSettings }) {
  const [tab, setTab] = useState("paquetes");
  const tabs = [
    { id: "paquetes", label: "Paquetes", icon: Package },
    { id: "paseadores", label: "Paseadores", icon: PawPrint },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "ajustes", label: "Ajustes", icon: Settings },
  ];
  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ color: BRAND.forest, fontFamily: "'Baloo 2'" }}>Panel de administración</h1>
      <p className="text-xs mb-4" style={{ color: BRAND.inkSoft }}>Prototipo sin autenticación — en producción este panel debe protegerse con inicio de sesión.</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {tabs.map((t) => <TabPill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon}>{t.label}</TabPill>)}
      </div>
      {tab === "paquetes" && <AdminPackages packages={packages} setPackages={setPackages} />}
      {tab === "paseadores" && <AdminWalkers walkers={walkers} setWalkers={setWalkers} />}
      {tab === "clientes" && <AdminClients clients={clients} />}
      {tab === "ajustes" && <AdminSettings settings={settings} setSettings={setSettings} />}
    </div>
  );
}

function AdminPackages({ packages, setPackages }) {
  const [form, setForm] = useState({ name: "", totalWeeks: 4, daysPerWeek: 3, timesPerDay: 1, duration: 30, price: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const add = () => {
    if (!form.name || !form.price) return;
    setPackages([...packages, {
      id: uid(), name: form.name,
      totalWeeks: clamp(Number(form.totalWeeks) || 1, 1, 52),
      daysPerWeek: clamp(Number(form.daysPerWeek) || 1, 1, 5),
      timesPerDay: clamp(Number(form.timesPerDay) || 1, 1, 2),
      duration: clamp(Number(form.duration) || 30, 15, 60),
      price: Number(form.price) || 0,
      createdAt: Date.now(),
    }]);
    setForm({ name: "", totalWeeks: 4, daysPerWeek: 3, timesPerDay: 1, duration: 30, price: "" });
  };
  const remove = (id) => setPackages(packages.filter((p) => p.id !== id));

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle icon={Plus} sub="Máximo 5 días por semana (no necesariamente seguidos) y hasta 2 paseos por día.">Crear paquete</SectionTitle>
        <Field label="Nombre del paquete"><TextInput value={form.name} onChange={set("name")} placeholder="Ej. Plan Mensual x2" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Semanas de duración"><TextInput type="number" min={1} value={form.totalWeeks} onChange={set("totalWeeks")} /></Field>
          <Field label="Días por semana (máx. 5)"><TextInput type="number" min={1} max={5} value={form.daysPerWeek} onChange={set("daysPerWeek")} /></Field>
          <Field label="Veces al día (máx. 2)"><TextInput type="number" min={1} max={2} value={form.timesPerDay} onChange={set("timesPerDay")} /></Field>
          <Field label="Minutos por paseo (15-60)"><TextInput type="number" min={15} max={60} step={5} value={form.duration} onChange={set("duration")} /></Field>
        </div>
        <Field label="Precio total del paquete (₡)"><TextInput type="number" value={form.price} onChange={set("price")} placeholder="Ej. 90000" /></Field>
        <Btn icon={Plus} onClick={add}>Crear paquete</Btn>
      </Card>
      <Card>
        <SectionTitle icon={Package}>Paquetes activos</SectionTitle>
        {packages.length === 0 ? <EmptyState icon={Package} title="Sin paquetes creados" /> : (
          <div className="space-y-2">
            {packages.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: BRAND.sand }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: BRAND.forest }}>{p.name}</p>
                  <p className="text-xs" style={{ color: BRAND.inkSoft }}>
                    {p.daysPerWeek} días/sem · {p.timesPerDay}x/día · {p.duration} min · {p.totalWeeks} sem · {crc(p.price)}
                  </p>
                </div>
                <button onClick={() => remove(p.id)}><Trash2 size={16} style={{ color: BRAND.red }} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminWalkers({ walkers, setWalkers }) {
  const remove = (id) => setWalkers(walkers.filter((w) => w.id !== id));
  return (
    <Card>
      <SectionTitle icon={PawPrint} sub="Perfiles creados por los propios paseadores desde su portal.">Paseadores registrados</SectionTitle>
      {walkers.length === 0 ? <EmptyState icon={PawPrint} title="Sin paseadores aún" /> : (
        <div className="space-y-2">
          {walkers.map((w) => (
            <div key={w.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: BRAND.sand }}>
              {w.photo ? <img src={w.photo} className="w-11 h-11 rounded-full object-cover" /> : <div className="w-11 h-11 rounded-full" style={{ background: "#EFE9CF" }} />}
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: BRAND.forest }}>{w.name}</p>
                <p className="text-xs" style={{ color: BRAND.inkSoft }}>{w.zone} · {w.phone}</p>
              </div>
              <button onClick={() => remove(w.id)}><Trash2 size={16} style={{ color: BRAND.red }} /></button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AdminClients({ clients }) {
  return (
    <Card>
      <SectionTitle icon={Users} sub="Vista de solo lectura de los clientes registrados.">Clientes registrados</SectionTitle>
      {clients.length === 0 ? <EmptyState icon={Users} title="Sin clientes aún" /> : (
        <div className="space-y-2">
          {clients.map((c) => (
            <div key={c.id} className="rounded-xl border p-3" style={{ borderColor: BRAND.sand }}>
              <p className="font-semibold text-sm" style={{ color: BRAND.forest }}>{c.name} <span className="font-normal" style={{ color: BRAND.inkSoft }}>· 🐾 {c.dog?.name}</span></p>
              <p className="text-xs" style={{ color: BRAND.inkSoft }}>{c.phone} · {c.email}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AdminSettings({ settings, setSettings }) {
  const [rate, setRate] = useState(settings.hourlyRate);
  return (
    <Card>
      <SectionTitle icon={Settings} sub="Tarifa base usada para calcular paseos individuales y adicionales.">Ajustes generales</SectionTitle>
      <Field label="Tarifa por hora (₡)"><TextInput type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
      <Btn icon={Check} onClick={() => setSettings({ ...settings, hourlyRate: Number(rate) || 1500 })}>Guardar tarifa</Btn>
    </Card>
  );
}
