import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Home, Calendar, Clock, Bell, Camera, Check, X, Plus, User, Users,
  MapPin, Package, Pill, Utensils, AlertTriangle, Settings, Star,
  ChevronLeft, ChevronRight, Trash2, PawPrint,
  Building2, LogOut, Dog as DogIcon, Sparkles, ShieldAlert, Heart, Image as ImageIcon,
} from "lucide-react";
import {
  signUp, signIn, signOut, getSession, onAuthStateChange, fetchProfile,
  fetchAllData, updateProfilePhone, insertPet, updatePet, updateWalker,
  insertPackage, deletePackage, insertWalks, updateWalk, insertNotification, updateSettings,
} from "./supabaseClient";

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
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : uid());

function statusBadge(status) {
  if (status === "pending") return <Badge tone="grey">Pendiente</Badge>;
  if (status === "in_progress") return <Badge tone="brown">En curso</Badge>;
  if (status === "completed") return <Badge tone="green">Completado</Badge>;
  if (status === "cancelled") return <Badge tone="red">Cancelado</Badge>;
  return null;
}

function WalkRow({ walk }) {
  return (
    <div className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: BRAND.sand }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: BRAND.forest }}>{walk.time} · {walk.duration} min</p>
        <p className="text-xs" style={{ color: BRAND.inkSoft }}>{walk.type === "paquete" ? "Paquete" : "Individual"} {walk.price ? `· ${crc(walk.price)}` : ""}</p>
      </div>
      <div className="flex items-center gap-2">{statusBadge(walk.status)}</div>
    </div>
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

export default function DogGoApp() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [pets, setPets] = useState([]);
  const [walkers, setWalkers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [walks, setWalks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({ hourlyRate: 1500 });
  const [tick, setTick] = useState(0);

  const refreshData = useCallback(async () => {
    const all = await fetchAllData();
    setPets(all.pets);
    setWalkers(all.walkers);
    setPackages(all.packages);
    setWalks(all.walks);
    setNotifications(all.notifications);
    setSettings(all.settings);
  }, []);

  useEffect(() => {
    (async () => {
      const s = await getSession();
      setSession(s);
      setCheckingSession(false);
    })();
    const sub = onAuthStateChange((s) => setSession(s));
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    (async () => { setProfile(await fetchProfile(session.user.id)); })();
  }, [session]);

  useEffect(() => {
    if (!session || !profile) return;
    (async () => { setDataLoading(true); await refreshData(); setDataLoading(false); })();
  }, [session, profile, refreshData]);

  useEffect(() => {
    if (!session || !profile) return;
    const t = setInterval(refreshData, REFRESH_MS);
    return () => clearInterval(t);
  }, [session, profile, refreshData]);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const pushNotification = useCallback((n) => {
    setNotifications((prev) => [{ id: uuid(), createdAt: Date.now(), ...n }, ...prev]);
    insertNotification(n);
  }, []);

  const patchWalk = useCallback((id, patch) => {
    setWalks((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    updateWalk(id, patch);
  }, []);

  // recordatorio "avisar antes de recoger"
  useEffect(() => {
    if (!profile || dataLoading) return;
    const now = Date.now();
    walks.forEach((w) => {
      if (w.status !== "pending" || w.remindedSent) return;
      const pet = pets.find((p) => p.id === w.petId);
      if (!pet?.notifyBefore?.enabled) return;
      const sched = scheduledDate(w).getTime();
      const mins = pet.notifyBefore.minutes || 15;
      if (now >= sched - mins * 60000 && now < sched) {
        pushNotification({ petId: w.petId, walkId: w.id, type: "reminder", message: `Tu paseador llegará en unos ${mins} min por ${pet.dog?.name || "tu perro"}.` });
        patchWalk(w.id, { remindedSent: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, dataLoading]);

  const patchPet = useCallback((id, patch) => {
    setPets((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    updatePet(id, patch);
  }, []);

  const addPet = useCallback(async (pet) => {
    const withId = { ...pet, id: uuid() };
    setPets((prev) => [...prev, withId]);
    await insertPet(withId);
    return withId;
  }, []);

  const patchWalkerFn = useCallback((id, patch) => {
    setWalkers((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    updateWalker(id, patch);
  }, []);

  const addWalks = useCallback((newWalks) => {
    setWalks((prev) => [...prev, ...newWalks]);
    insertWalks(newWalks);
  }, []);

  const addPackage = useCallback((pkg) => {
    const withId = { ...pkg, id: uuid(), createdAt: Date.now() };
    setPackages((prev) => [...prev, withId]);
    insertPackage(withId);
  }, []);

  const removePackage = useCallback((id) => {
    setPackages((prev) => prev.filter((p) => p.id !== id));
    deletePackage(id);
  }, []);

  const patchSettings = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    updateSettings(patch);
  }, []);

  const handleLogout = async () => {
    await signOut();
    setSession(null);
    setProfile(null);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BRAND.forest }}>
        <style>{FONT_IMPORT}</style>
        <PawPrint size={30} className="animate-bounce" style={{ color: BRAND.lime }} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen" style={{ fontFamily: "Inter" }}>
        <style>{FONT_IMPORT}</style>
        <HomeScreen />
      </div>
    );
  }

  if (!profile || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BRAND.cream }}>
        <style>{FONT_IMPORT}</style>
        <div className="flex flex-col items-center gap-3">
          <PawPrint size={30} className="animate-bounce" style={{ color: BRAND.forest }} />
          <p className="font-semibold" style={{ color: BRAND.forest, fontFamily: "'Baloo 2'" }}>Cargando Dog Go!...</p>
        </div>
      </div>
    );
  }

  const me = profile.role === "paseador" ? walkers.find((w) => w.id === profile.id) : null;
  const myPets = profile.role === "cliente" ? pets.filter((p) => p.ownerId === profile.id) : [];

  return (
    <div className="min-h-screen" style={{ background: BRAND.cream, fontFamily: "Inter" }}>
      <style>{FONT_IMPORT}</style>
      <Header profile={profile} onLogout={handleLogout} />
      <main className="max-w-3xl mx-auto px-3 pb-16 pt-4">
        {profile.role === "cliente" && (
          <ClientPortal
            profile={profile} myPets={myPets} walkers={walkers} packages={packages}
            walks={walks} notifications={notifications} settings={settings} tick={tick}
            patchPet={patchPet} addPet={addPet} patchWalk={patchWalk} addWalks={addWalks}
          />
        )}
        {profile.role === "paseador" && me && (
          <WalkerPortal
            me={me} pets={pets}
            walks={walks.filter((w) => w.walkerId === me.id)}
            pushNotification={pushNotification}
            patchWalker={patchWalkerFn} patchWalk={patchWalk}
          />
        )}
        {profile.role === "admin" && (
          <AdminPortal
            packages={packages} addPackage={addPackage} removePackage={removePackage}
            walkers={walkers} pets={pets}
            settings={settings} patchSettings={patchSettings}
          />
        )}
      </main>
    </div>
  );
}

function Header({ profile, onLogout }) {
  const roleLabel = { cliente: "Cliente", paseador: "Paseador", admin: "Administrador" }[profile.role];
  return (
    <header className="sticky top-0 z-20" style={{ background: BRAND.forest }}>
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: BRAND.lime }}>
            <DogIcon size={19} style={{ color: BRAND.forest }} />
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ color: BRAND.cream, fontFamily: "'Baloo 2'" }}>
            Dog Go<span style={{ color: BRAND.lime }}>!</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full hidden sm:inline" style={{ background: "rgba(255,255,255,0.12)", color: BRAND.cream }}>
            {profile.name.split(" ")[0]} · {roleLabel}
          </span>
          <button onClick={onLogout} className="text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-full" style={{ color: BRAND.cream, border: `1px solid rgba(255,255,255,0.4)` }}>
            <LogOut size={12} /> Salir
          </button>
        </div>
      </div>
    </header>
  );
}

/* ============================== HOME / AUTH ============================== */
function HomeScreen() {
  const [mode, setMode] = useState("hero"); // hero | login | signup
  const [signupRole, setSignupRole] = useState("cliente");

  const isLightPage = mode === "signup" && signupRole === "cliente";

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col" style={{ background: isLightPage ? BRAND.cream : BRAND.forest }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <PawPrint key={i} size={16 + (i % 3) * 8} className="absolute -z-0"
          style={{ color: isLightPage ? BRAND.forest : BRAND.cream, opacity: 0.06, top: `${(i * 31) % 100}%`, left: `${(i * 43) % 100}%`, transform: `rotate(${(i * 53) % 360}deg)` }}
        />
      ))}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center py-16">
        {mode === "hero" && (
          <>
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
              <Btn variant="accent" className="w-full py-3 text-base" onClick={() => { setSignupRole("cliente"); setMode("signup"); }}>Registrarme</Btn>
              <button onClick={() => setMode("login")} className="w-full py-3 rounded-full text-base font-semibold" style={{ border: `1.5px solid ${BRAND.cream}`, color: BRAND.cream }}>
                Iniciar sesión
              </button>
              <p className="text-[11px] mt-2" style={{ color: "#8FA396" }}>
                Al continuar aceptás formar parte del programa de perros más felices de la ciudad.
              </p>
              <button onClick={() => { setSignupRole("paseador"); setMode("signup"); }} className="text-xs font-semibold flex items-center gap-1.5 justify-center mt-2" style={{ color: BRAND.lime }}>
                <PawPrint size={13} /> Soy paseador
              </button>
            </div>
          </>
        )}

        {mode !== "hero" && (
          <div className="w-full max-w-sm">
            <AuthForm mode={mode} setMode={setMode} signupRole={signupRole} isLightPage={isLightPage} />
          </div>
        )}
      </div>
    </div>
  );
}

const AUTH_HEADLINES = {
  login: { title: "TE ESTÁBAMOS", titleAccent: "ESPERANDO!", sub: null },
  "signup-cliente": { title: "WOOF WOOF!", titleAccent: "", sub: "Hola, nos alegra saber que uniste a tu peludo a los paseos más felices!!" },
  "signup-paseador": { title: "BIENVENIDO", titleAccent: "PASEADOR!", sub: "Gracias por unirte y ser parte de un día feliz para esas mascotas y una preocupación menos para sus dueños!!" },
};

function AuthForm({ mode, setMode, signupRole, isLightPage }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const headline = mode === "login" ? AUTH_HEADLINES.login : AUTH_HEADLINES[`signup-${signupRole}`];
  const textColor = isLightPage ? BRAND.forest : BRAND.cream;

  const doLogin = async () => {
    setError(""); setBusy(true);
    const { error } = await signIn({ email: form.email, password: form.password });
    setBusy(false);
    if (error) setError("Email o contraseña incorrectos.");
  };

  const doSignup = async () => {
    setError(""); setInfo(""); setBusy(true);
    if (!form.name || !form.email || !form.password) { setError("Completá nombre, email y contraseña."); setBusy(false); return; }
    if (form.password !== form.confirmPassword) { setError("Las contraseñas no coinciden."); setBusy(false); return; }

    const { data, error } = await signUp({ email: form.email, password: form.password, name: form.name, phone: form.phone, role: signupRole });
    if (error) { setError(error.message || "No se pudo crear la cuenta."); setBusy(false); return; }

    setBusy(false);
    if (!data.session) {
      setInfo("Cuenta creada. Revisá tu correo para confirmarla y después iniciá sesión.");
      setMode("login");
    }
    // si Supabase ya devuelve sesión, el listener del root te mete directo a la app
  };

  return (
    <div>
      <button onClick={() => setMode("hero")} className="mb-4 text-xs font-semibold flex items-center gap-1" style={{ color: textColor, opacity: 0.8 }}>
        <ChevronLeft size={14} /> Volver
      </button>
      <h1 className="text-3xl font-extrabold leading-tight mb-1" style={{ color: mode === "login" ? BRAND.cream : (isLightPage ? BRAND.lime : BRAND.lime), fontFamily: "'Baloo 2'" }}>
        {headline.title} {headline.titleAccent && <span style={{ color: isLightPage ? BRAND.forest : BRAND.cream }}>{headline.titleAccent}</span>}
      </h1>
      {headline.sub && <p className="text-sm mb-6" style={{ color: textColor, opacity: 0.85 }}>{headline.sub}</p>}
      {!headline.sub && <div className="mb-6" />}

      <div className="text-left">
        {mode === "signup" && (
          <Field label={<span style={{ color: textColor }}>Nombre</span>}>
            <TextInput value={form.name} onChange={set("name")} placeholder={signupRole === "cliente" ? "Tu nombre" : "Ej. Andrés Gómez"} />
          </Field>
        )}
        <Field label={<span style={{ color: textColor }}>Email</span>}>
          <TextInput type="email" value={form.email} onChange={set("email")} placeholder="correo@ejemplo.com" />
        </Field>
        {mode === "signup" && (
          <Field label={<span style={{ color: textColor }}>Teléfono</span>}>
            <TextInput value={form.phone} onChange={set("phone")} placeholder="8000 0000" />
          </Field>
        )}
        <Field label={<span style={{ color: textColor }}>Contraseña</span>}>
          <TextInput type="password" value={form.password} onChange={set("password")} />
        </Field>
        {mode === "signup" && (
          <Field label={<span style={{ color: textColor }}>Confirmar contraseña</span>}>
            <TextInput type="password" value={form.confirmPassword} onChange={set("confirmPassword")} />
          </Field>
        )}
        {mode === "login" && (
          <button className="text-xs mb-3" style={{ color: textColor, opacity: 0.7 }}>¿Olvidaste tu contraseña?</button>
        )}

        {error && <p className="text-xs mb-3" style={{ color: "#F2A19C" }}>{error}</p>}
        {info && <p className="text-xs mb-3" style={{ color: BRAND.lime }}>{info}</p>}

        <Btn variant="accent" className="w-full py-3" disabled={busy} onClick={mode === "login" ? doLogin : doSignup}>
          {busy ? "Un momento..." : mode === "login" ? "Sing in" : "Sing Up"}
        </Btn>

        <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="w-full text-center text-xs font-semibold mt-4" style={{ color: textColor, opacity: 0.85 }}>
          {mode === "login" ? "¿No tenés cuenta? Sing up" : "¿Ya tenés cuenta? Sing in"}
        </button>
      </div>
    </div>
  );
}

/* ============================== CLIENT PORTAL (dueño + sus mascotas) ============================== */
function ClientPortal({ profile, myPets, walkers, packages, walks, notifications, settings, tick, patchPet, addPet, patchWalk, addWalks }) {
  const [currentPetId, setCurrentPetId] = useState(null);
  const [mode, setMode] = useState(myPets.length === 0 ? "register" : "list");

  useEffect(() => {
    if (myPets.length === 0) { setMode("register"); setCurrentPetId(null); }
  }, [myPets.length]);

  const currentPet = myPets.find((p) => p.id === currentPetId);

  if (mode === "register" || (myPets.length === 0)) {
    return (
      <PetRegisterForm
        profile={profile} walkers={walkers}
        onCancel={myPets.length > 0 ? () => setMode("list") : null}
        onSave={async (petData) => {
          const saved = await addPet(petData);
          setCurrentPetId(saved.id);
          setMode("dashboard");
        }}
      />
    );
  }

  if (mode === "list" || !currentPet) {
    return (
      <PetsListScreen
        profile={profile} pets={myPets}
        onSelect={(id) => { setCurrentPetId(id); setMode("dashboard"); }}
        onCreateNew={() => setMode("register")}
      />
    );
  }

  return (
    <PetDashboard
      pet={currentPet} walkers={walkers} packages={packages}
      walks={walks.filter((w) => w.petId === currentPet.id)}
      notifications={notifications.filter((n) => n.petId === currentPet.id)}
      settings={settings} tick={tick}
      patchPet={patchPet} patchWalk={patchWalk} addWalks={addWalks}
      onBack={() => { setCurrentPetId(null); setMode("list"); }}
    />
  );
}

function PetsListScreen({ profile, pets, onSelect, onCreateNew }) {
  return (
    <div>
      <div className="mb-4">
        <p className="text-xs" style={{ color: BRAND.inkSoft }}>Hola,</p>
        <h1 className="text-xl font-bold" style={{ color: BRAND.forest, fontFamily: "'Baloo 2'" }}>{profile.name.split(" ")[0]} 🐾</h1>
      </div>
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: BRAND.paper, border: `1.5px solid ${BRAND.forest}`, color: BRAND.forest }}>
            <PawPrint size={14} /> MASCOTAS
          </span>
        </div>
        <div className="space-y-2 mb-4">
          {pets.map((p) => (
            <button key={p.id} onClick={() => onSelect(p.id)}
              className="w-full flex items-center justify-between rounded-xl border p-3 text-left"
              style={{ borderColor: BRAND.sand }}>
              <div>
                <p className="font-bold" style={{ color: BRAND.forest, fontFamily: "'Baloo 2'" }}>{p.dog?.name || "Mascota"}</p>
                <p className="text-xs" style={{ color: BRAND.inkSoft }}>Dueño: {profile.name}</p>
              </div>
              <ChevronRight size={16} style={{ color: BRAND.green }} />
            </button>
          ))}
        </div>
        <Btn variant="accent" icon={Plus} onClick={onCreateNew}>Crear nuevo perfil</Btn>
      </Card>
    </div>
  );
}

function PetRegisterForm({ profile, walkers, onCancel, onSave }) {
  const [form, setForm] = useState({
    dogName: "", breed: "", age: "", weight: "", preferredWalkerId: "", phone: profile.phone || "", notes: "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (!form.dogName) return;
    if (form.phone && form.phone !== profile.phone) {
      updateProfilePhone(profile.id, form.phone);
    }
    onSave({
      ownerId: profile.id,
      dog: { name: form.dogName, breed: form.breed, age: form.age, weight: form.weight, notes: form.notes },
      preferredWalkerId: form.preferredWalkerId || null,
      hotel: { medications: [], meals: [], complications: "", quirks: "", behaviorPeople: "", behaviorAnimals: "", stays: [] },
      notifyBefore: { enabled: false, minutes: 15 },
    });
  };

  return (
    <Card className="mt-2">
      <SectionTitle icon={PawPrint} sub="Cuéntanos de tu mascota">REGISTRO</SectionTitle>
      <Field label="Nombre"><TextInput value={form.dogName} onChange={set("dogName")} placeholder="Ej. Draco" /></Field>
      <Field label="Raza"><TextInput value={form.breed} onChange={set("breed")} placeholder="Ej. Zaguate" /></Field>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <Field label="Edad"><TextInput value={form.age} onChange={set("age")} placeholder="Ej. 2 años" /></Field>
        <Field label="Peso"><TextInput value={form.weight} onChange={set("weight")} placeholder="Ej. 12 kg" /></Field>
      </div>
      <Field label="Paseador preferido">
        <Select value={form.preferredWalkerId} onChange={set("preferredWalkerId")}>
          <option value="">Elegir después</option>
          {walkers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </Select>
      </Field>
      <Field label="Teléfono (dueño)"><TextInput value={form.phone} onChange={set("phone")} placeholder="7000 0000" /></Field>
      <Field label="Notas / Recomendaciones para el paseador">
        <TextArea rows={3} value={form.notes} onChange={set("notes")} placeholder="Alergias, temperamento, correa preferida..." />
      </Field>
      <div className="flex gap-2 mt-2">
        {onCancel && <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>}
        <Btn icon={Check} onClick={submit}>Guardar y continuar</Btn>
      </div>
    </Card>
  );
}

function PetDashboard({ pet, walkers, packages, walks, notifications, settings, tick, patchPet, patchWalk, addWalks, onBack }) {
  const [tab, setTab] = useState("calendario");
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs" style={{ color: BRAND.inkSoft }}>Mascota</p>
          <h1 className="text-xl font-bold" style={{ color: BRAND.forest, fontFamily: "'Baloo 2'" }}>{pet.dog?.name} 🐾</h1>
        </div>
        <button onClick={onBack} className="text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-full" style={{ color: BRAND.forest, border: `1px solid ${BRAND.forest}` }}>
          <PawPrint size={12} /> Cambiar mascota
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {tabs.map((t) => <TabPill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon}>{t.label}</TabPill>)}
      </div>

      {tab === "calendario" && <ClientCalendar walks={walks} />}
      {tab === "pendientes" && <ClientPending walks={walks} patchWalk={patchWalk} walkers={walkers} pet={pet} tick={tick} />}
      {tab === "paquetes" && <ClientPackages pet={pet} packages={packages} walkers={walkers} settings={settings} walks={walks} addWalks={addWalks} />}
      {tab === "paseador" && <ClientWalkerPicker pet={pet} walkers={walkers} onChange={(walkerId) => patchPet(pet.id, { preferredWalkerId: walkerId })} />}
      {tab === "hotel" && <ClientHotel pet={pet} onChange={(hotel) => patchPet(pet.id, { hotel })} />}
      {tab === "notis" && <ClientNotifications notifications={notifications} pet={pet} onToggle={(notifyBefore) => patchPet(pet.id, { notifyBefore })} />}
    </div>
  );
}

function ClientPending({ walks, patchWalk, walkers, pet, tick }) {
  const pending = walks.filter((w) => w.status === "pending" || w.status === "in_progress")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

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
                    <Select value={w.walkerId || ""} onChange={(e) => patchWalk(w.id, { walkerId: e.target.value || null })} className="flex-1">
                      <option value="">Sin asignar</option>
                      {walkers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </Select>
                    <Btn variant="danger" icon={X} onClick={() => patchWalk(w.id, { status: "cancelled" })}>Cancelar</Btn>
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
      <RecommendationsBox pet={pet} />
    </Card>
  );
}

function RecommendationsBox({ pet }) {
  const tips = [
    `Deja agua fresca disponible antes de que ${pet.dog?.name || "tu perro"} salga a caminar.`,
    "Verifica que la correa y el arnés estén en buen estado.",
    "Comparte cualquier cambio de comportamiento reciente con el paseador.",
  ];
  if (pet.dog?.notes) tips.unshift(`Recuerda: ${pet.dog.notes}`);
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

function ClientPackages({ pet, packages, walkers, settings, walks, addWalks }) {
  const [subscribingId, setSubscribingId] = useState(null);
  const [indForm, setIndForm] = useState({ date: todayStr(), time: "08:00", duration: 30, walkerId: pet.preferredWalkerId || "" });

  const indPrice = Math.round((indForm.duration / 60) * (settings.hourlyRate || 1500));

  const addIndividual = () => {
    if (!indForm.date || !indForm.time) return;
    const w = {
      id: uuid(), petId: pet.id, walkerId: indForm.walkerId || null,
      type: "individual", date: indForm.date, time: indForm.time,
      duration: clamp(Number(indForm.duration) || 30, 15, 60), price: indPrice,
      status: "pending", createdAt: Date.now(),
    };
    addWalks([w]);
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
                  <SubscribeForm pkg={p} walkers={walkers} pet={pet}
                    onCancel={() => setSubscribingId(null)}
                    onConfirm={(newWalks) => { addWalks(newWalks); setSubscribingId(null); }}
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

function SubscribeForm({ pkg, walkers, pet, onCancel, onConfirm }) {
  const [startDate, setStartDate] = useState(todayStr());
  const [walkerId, setWalkerId] = useState(pet.preferredWalkerId || "");
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
      if (selectedInWeek >= pkg.daysPerWeek) return prev;
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
          id: uuid(), petId: pet.id, walkerId: walkerId || null,
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

function ClientWalkerPicker({ pet, walkers, onChange }) {
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
              style={{ borderColor: pet.preferredWalkerId === w.id ? BRAND.lime : BRAND.sand, background: pet.preferredWalkerId === w.id ? "#EFE9CF" : "transparent" }}>
              {w.photo ? <img src={w.photo} className="w-12 h-12 rounded-full object-cover" /> : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#EFE9CF" }}><User style={{ color: BRAND.forest }} /></div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: BRAND.forest }}>{w.name}</p>
                <p className="text-xs flex items-center gap-1" style={{ color: BRAND.inkSoft }}><MapPin size={11} /> {w.zone || "Zona no especificada"} · {w.experienceYears || 0} años exp.</p>
              </div>
              {pet.preferredWalkerId === w.id && <Check size={18} style={{ color: BRAND.forest }} />}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function ClientHotel({ pet, onChange }) {
  const h = pet.hotel || { medications: [], meals: [], complications: "", quirks: "", behaviorPeople: "", behaviorAnimals: "", stays: [] };
  const [form, setForm] = useState({ ...h, stays: h.stays || [] });
  useEffect(() => setForm({ ...h, stays: h.stays || [] }), [pet.id]);

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

function ClientNotifications({ notifications, pet, onToggle }) {
  const nb = pet.notifyBefore || { enabled: false, minutes: 15 };
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
function WalkerPortal({ me, pets, walks, pushNotification, patchWalker, patchWalk }) {
  const [tab, setTab] = useState("hoy");

  const today = todayStr();
  const todayWalks = walks.filter((w) => w.date === today && w.status !== "cancelled").sort((a, b) => a.time.localeCompare(b.time));
  const pendingWalks = walks.filter((w) => w.status === "pending" || w.status === "in_progress").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const startWalk = (w, photo) => {
    patchWalk(w.id, { status: "in_progress", startedAt: Date.now(), startPhoto: photo, remindedSent: true });
    const pet = pets.find((p) => p.id === w.petId);
    pushNotification({ petId: w.petId, walkId: w.id, type: "start", message: `¡El paseo de ${pet?.dog?.name || "tu perro"} comenzó! ${me.name} lo recogió.`, photo });
  };
  const finishWalk = (w, photo) => {
    patchWalk(w.id, { status: "completed", endedAt: Date.now(), endPhoto: photo });
    const pet = pets.find((p) => p.id === w.petId);
    pushNotification({ petId: w.petId, walkId: w.id, type: "end", message: `¡El paseo de ${pet?.dog?.name || "tu perro"} terminó! ${me.name} ya lo devolvió a casa.`, photo });
  };
  const cancelWalk = (w) => {
    patchWalk(w.id, { status: "cancelled" });
    const pet = pets.find((p) => p.id === w.petId);
    pushNotification({ petId: w.petId, walkId: w.id, type: "cancel", message: `El paseo de ${pet?.dog?.name || "tu perro"} del ${humanDate(w.date)} a las ${w.time} fue cancelado.` });
  };

  const uniqueDogPets = [...new Map(walks.map((w) => [w.petId, w])).values()]
    .map((w) => pets.find((p) => p.id === w.petId)).filter(Boolean);

  const hotelPets = pets.filter((p) => (p.hotel?.stays || []).length > 0);

  const tabs = [
    { id: "hoy", label: "Hoy", icon: Home },
    { id: "perros", label: "Mis perros", icon: DogIcon },
    { id: "pendientes", label: "Pendientes", icon: Clock },
    { id: "hotel", label: "Hotel", icon: Building2 },
    { id: "perfil", label: "Perfil", icon: User },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs" style={{ color: BRAND.inkSoft }}>Bienvenido,</p>
          <h1 className="text-xl font-bold" style={{ color: BRAND.forest, fontFamily: "'Baloo 2'" }}>{me.name.split(" ")[0]} 🐕‍🦺</h1>
        </div>
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
                <WalkerWalkCard key={w.id} walk={w} pet={pets.find((p) => p.id === w.petId)}
                  onStart={(photo) => startWalk(w, photo)} onFinish={(photo) => finishWalk(w, photo)} onCancel={() => cancelWalk(w)} />
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "perros" && (
        <Card>
          <SectionTitle icon={DogIcon} sub="Perros a tu cargo, con su información de cuidado.">Mis perros</SectionTitle>
          {uniqueDogPets.length === 0 ? <EmptyState icon={DogIcon} title="Aún no tienes perros asignados" /> : (
            <div className="space-y-3">{uniqueDogPets.map((p) => <DogInfoCard key={p.id} pet={p} />)}</div>
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
                  <WalkerWalkCard walk={w} pet={pets.find((p) => p.id === w.petId)}
                    onStart={(photo) => startWalk(w, photo)} onFinish={(photo) => finishWalk(w, photo)} onCancel={() => cancelWalk(w)} />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "hotel" && (
        <Card>
          <SectionTitle icon={Building2} sub="Perros con estadías registradas en el hotel Dog Go!, con toda su info de cuidado.">Hotel de perros</SectionTitle>
          {hotelPets.length === 0 ? <EmptyState icon={Building2} title="No hay perros con estadías de hotel registradas" /> : (
            <div className="space-y-3">{hotelPets.map((p) => <DogInfoCard key={p.id} pet={p} />)}</div>
          )}
        </Card>
      )}

      {tab === "perfil" && <WalkerProfileEdit walker={me} onSave={(patch) => patchWalker(me.id, patch)} />}
    </div>
  );
}

function WalkerWalkCard({ walk, pet, onStart, onFinish, onCancel }) {
  const remaining = walk.status === "in_progress" ? walk.duration * 60 - Math.floor((Date.now() - walk.startedAt) / 1000) : null;
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: BRAND.sand }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: BRAND.forest }}>{pet?.dog?.name || "Perro"} · {walk.time}</p>
          <p className="text-xs" style={{ color: BRAND.inkSoft }}>{pet?.ownerName} · {walk.duration} min · {walk.type === "paquete" ? "Paquete" : "Individual"}</p>
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

function DogInfoCard({ pet }) {
  const [open, setOpen] = useState(false);
  const h = pet.hotel || {};
  const now = todayStr();
  const activeStay = (h.stays || []).find((s) => s.checkIn <= now && now <= s.checkOut);
  const upcomingStay = (h.stays || []).filter((s) => s.checkIn > now).sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: BRAND.sand }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between">
        <div className="text-left">
          <p className="font-semibold text-sm" style={{ color: BRAND.forest }}>
            {pet.dog?.name} <span className="text-xs font-normal" style={{ color: BRAND.inkSoft }}>· {pet.dog?.breed}, {pet.dog?.age}</span>
          </p>
          <p className="text-xs" style={{ color: BRAND.inkSoft }}>Dueño: {pet.ownerName} · {pet.ownerPhone}</p>
          {activeStay && <span className="inline-block mt-1"><Badge tone="green">En el hotel hasta {humanDate(activeStay.checkOut)}</Badge></span>}
          {!activeStay && upcomingStay && <span className="inline-block mt-1"><Badge tone="brown">Ingresa {humanDate(upcomingStay.checkIn)}</Badge></span>}
        </div>
        <ChevronRight size={16} style={{ color: BRAND.green, transform: open ? "rotate(90deg)" : "none" }} />
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-sm" style={{ color: BRAND.forest }}>
          {pet.dog?.notes && <p className="flex gap-1.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> {pet.dog.notes}</p>}
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
          {h.stays?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase" style={{ color: BRAND.green }}>Estadías</p>
              {h.stays.map((s) => <p key={s.id} className="text-xs">• {humanDate(s.checkIn)} → {humanDate(s.checkOut)} {s.notes ? `— ${s.notes}` : ""}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
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
function AdminPortal({ packages, addPackage, removePackage, walkers, pets, settings, patchSettings }) {
  const [tab, setTab] = useState("paquetes");
  const tabs = [
    { id: "paquetes", label: "Paquetes", icon: Package },
    { id: "paseadores", label: "Paseadores", icon: PawPrint },
    { id: "clientes", label: "Mascotas", icon: Users },
    { id: "ajustes", label: "Ajustes", icon: Settings },
  ];
  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ color: BRAND.forest, fontFamily: "'Baloo 2'" }}>Panel de administración</h1>
      <p className="text-xs mb-4" style={{ color: BRAND.inkSoft }}>Solo vos podés ver esta pantalla, iniciando sesión con tu cuenta de administradora.</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {tabs.map((t) => <TabPill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon}>{t.label}</TabPill>)}
      </div>
      {tab === "paquetes" && <AdminPackages packages={packages} addPackage={addPackage} removePackage={removePackage} />}
      {tab === "paseadores" && <AdminWalkers walkers={walkers} />}
      {tab === "clientes" && <AdminPets pets={pets} />}
      {tab === "ajustes" && <AdminSettings settings={settings} patchSettings={patchSettings} />}
    </div>
  );
}

function AdminPackages({ packages, addPackage, removePackage }) {
  const [form, setForm] = useState({ name: "", totalWeeks: 4, daysPerWeek: 3, timesPerDay: 1, duration: 30, price: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const add = () => {
    if (!form.name || !form.price) return;
    addPackage({
      name: form.name,
      totalWeeks: clamp(Number(form.totalWeeks) || 1, 1, 52),
      daysPerWeek: clamp(Number(form.daysPerWeek) || 1, 1, 5),
      timesPerDay: clamp(Number(form.timesPerDay) || 1, 1, 2),
      duration: clamp(Number(form.duration) || 30, 15, 60),
      price: Number(form.price) || 0,
    });
    setForm({ name: "", totalWeeks: 4, daysPerWeek: 3, timesPerDay: 1, duration: 30, price: "" });
  };

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
                <button onClick={() => removePackage(p.id)}><Trash2 size={16} style={{ color: BRAND.red }} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminWalkers({ walkers }) {
  return (
    <Card>
      <SectionTitle icon={PawPrint} sub="Perfiles creados por los propios paseadores al registrarse.">Paseadores registrados</SectionTitle>
      {walkers.length === 0 ? <EmptyState icon={PawPrint} title="Sin paseadores aún" /> : (
        <div className="space-y-2">
          {walkers.map((w) => (
            <div key={w.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: BRAND.sand }}>
              {w.photo ? <img src={w.photo} className="w-11 h-11 rounded-full object-cover" /> : <div className="w-11 h-11 rounded-full" style={{ background: "#EFE9CF" }} />}
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: BRAND.forest }}>{w.name}</p>
                <p className="text-xs" style={{ color: BRAND.inkSoft }}>{w.zone} · {w.phone}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AdminPets({ pets }) {
  return (
    <Card>
      <SectionTitle icon={Users} sub="Vista de solo lectura de las mascotas registradas.">Mascotas registradas</SectionTitle>
      {pets.length === 0 ? <EmptyState icon={Users} title="Sin mascotas aún" /> : (
        <div className="space-y-2">
          {pets.map((p) => (
            <div key={p.id} className="rounded-xl border p-3" style={{ borderColor: BRAND.sand }}>
              <p className="font-semibold text-sm" style={{ color: BRAND.forest }}>{p.dog?.name} <span className="font-normal" style={{ color: BRAND.inkSoft }}>· dueño: {p.ownerName}</span></p>
              <p className="text-xs" style={{ color: BRAND.inkSoft }}>{p.ownerPhone} · {p.ownerEmail}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AdminSettings({ settings, patchSettings }) {
  const [rate, setRate] = useState(settings.hourlyRate);
  return (
    <Card>
      <SectionTitle icon={Settings} sub="Tarifa base usada para calcular paseos individuales y adicionales.">Ajustes generales</SectionTitle>
      <Field label="Tarifa por hora (₡)"><TextInput type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
      <Btn icon={Check} onClick={() => patchSettings({ hourlyRate: Number(rate) || 1500 })}>Guardar tarifa</Btn>
    </Card>
  );
}
