import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Revisa tu archivo .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ============================== AUTH ============================== */

export async function signUp({ email, password, name, phone, role }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error };
  const userId = data.user?.id;
  if (!userId) return { error: { message: "No se pudo crear la cuenta." } };

  const { error: profileError } = await supabase.from("profiles").insert({ id: userId, role, name, phone, email });
  if (profileError) return { error: profileError };

  if (role === "paseador") {
    const { error: walkerError } = await supabase.from("walkers").insert({ id: userId });
    if (walkerError) return { error: walkerError };
  }
  // Los clientes no crean fila propia -- sus mascotas se crean después, cada una como fila en "pets".

  return { data };
}

export async function signIn({ email, password }) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) { console.error("fetchProfile error", error); return null; }
  return data;
}

/* ============================== DATA (tablas reales) ============================== */

const petRowToJs = (r) => ({
  id: r.id,
  ownerId: r.owner_id,
  ownerName: r.profiles?.name,
  ownerPhone: r.profiles?.phone,
  ownerEmail: r.profiles?.email,
  dog: r.dog || {},
  hotel: r.hotel || { medications: [], meals: [], complications: "", quirks: "", behaviorPeople: "", behaviorAnimals: "", stays: [] },
  preferredWalkerId: r.preferred_walker_id,
  notifyBefore: r.notify_before || { enabled: false, minutes: 15 },
  createdAt: r.created_at,
});

const walkerRowToJs = (r) => ({
  id: r.id,
  name: r.profiles?.name,
  phone: r.profiles?.phone,
  zone: r.zone,
  experienceYears: r.experience_years,
  bio: r.bio,
  photo: r.photo,
});

const packageRowToJs = (r) => ({
  id: r.id,
  name: r.name,
  totalWeeks: r.total_weeks,
  daysPerWeek: r.days_per_week,
  timesPerDay: r.times_per_day,
  duration: r.duration,
  price: Number(r.price),
  createdAt: r.created_at,
});

const walkRowToJs = (r) => ({
  id: r.id,
  petId: r.pet_id,
  walkerId: r.walker_id,
  type: r.type,
  packageId: r.package_id,
  date: r.date,
  time: r.time,
  duration: r.duration,
  price: Number(r.price),
  status: r.status,
  remindedSent: r.reminded_sent,
  startedAt: r.started_at ? new Date(r.started_at).getTime() : null,
  endedAt: r.ended_at ? new Date(r.ended_at).getTime() : null,
  startPhoto: r.start_photo,
  endPhoto: r.end_photo,
  createdAt: r.created_at,
});

const notificationRowToJs = (r) => ({
  id: r.id,
  petId: r.pet_id,
  walkId: r.walk_id,
  type: r.type,
  message: r.message,
  photo: r.photo,
  createdAt: new Date(r.created_at).getTime(),
});

export async function fetchAllData() {
  const [petsRes, walkersRes, packagesRes, walksRes, notifsRes, settingsRes] = await Promise.all([
    supabase.from("pets").select("*, profiles!pets_owner_id_fkey(name, phone, email)"),
    supabase.from("walkers").select("*, profiles!inner(name, phone, email)"),
    supabase.from("packages").select("*"),
    supabase.from("walks").select("*"),
    supabase.from("notifications").select("*"),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const pets = (petsRes.data || []).map(petRowToJs);
  const walkers = (walkersRes.data || []).map(walkerRowToJs);
  const packages = (packagesRes.data || []).map(packageRowToJs);
  const walks = (walksRes.data || []).map(walkRowToJs);
  const notifications = (notifsRes.data || []).map(notificationRowToJs);
  const settings = settingsRes.data ? { hourlyRate: Number(settingsRes.data.hourly_rate) } : { hourlyRate: 1500 };

  return { pets, walkers, packages, walks, notifications, settings };
}

export async function updateProfilePhone(id, phone) {
  const { error } = await supabase.from("profiles").update({ phone }).eq("id", id);
  if (error) console.error("updateProfilePhone error", error);
}

export async function insertPet(pet) {
  const { data, error } = await supabase.from("pets").insert({
    id: pet.id, owner_id: pet.ownerId, dog: pet.dog,
    preferred_walker_id: pet.preferredWalkerId || null,
  }).select().maybeSingle();
  if (error) console.error("insertPet error", error);
  return data;
}

export async function updatePet(id, patch) {
  const dbPatch = {};
  if ("dog" in patch) dbPatch.dog = patch.dog;
  if ("hotel" in patch) dbPatch.hotel = patch.hotel;
  if ("preferredWalkerId" in patch) dbPatch.preferred_walker_id = patch.preferredWalkerId;
  if ("notifyBefore" in patch) dbPatch.notify_before = patch.notifyBefore;
  const { error } = await supabase.from("pets").update(dbPatch).eq("id", id);
  if (error) console.error("updatePet error", error);
}

export async function updateWalker(id, patch) {
  const dbPatch = {};
  if ("zone" in patch) dbPatch.zone = patch.zone;
  if ("experienceYears" in patch) dbPatch.experience_years = patch.experienceYears;
  if ("bio" in patch) dbPatch.bio = patch.bio;
  if ("photo" in patch) dbPatch.photo = patch.photo;
  const { error } = await supabase.from("walkers").update(dbPatch).eq("id", id);
  if (error) console.error("updateWalker error", error);
  if (patch.name || patch.phone) {
    await supabase.from("profiles").update({ name: patch.name, phone: patch.phone }).eq("id", id);
  }
}

export async function insertPackage(pkg) {
  const { error } = await supabase.from("packages").insert({
    id: pkg.id, name: pkg.name, total_weeks: pkg.totalWeeks, days_per_week: pkg.daysPerWeek,
    times_per_day: pkg.timesPerDay, duration: pkg.duration, price: pkg.price,
  });
  if (error) console.error("insertPackage error", error);
}

export async function deletePackage(id) {
  const { error } = await supabase.from("packages").delete().eq("id", id);
  if (error) console.error("deletePackage error", error);
}

export async function insertWalks(walkList) {
  const rows = walkList.map((w) => ({
    id: w.id, pet_id: w.petId, walker_id: w.walkerId, type: w.type, package_id: w.packageId || null,
    date: w.date, time: w.time, duration: w.duration, price: w.price, status: w.status,
  }));
  const { error } = await supabase.from("walks").insert(rows);
  if (error) console.error("insertWalks error", error);
}

export async function updateWalk(id, patch) {
  const dbPatch = {};
  if ("status" in patch) dbPatch.status = patch.status;
  if ("walkerId" in patch) dbPatch.walker_id = patch.walkerId;
  if ("startedAt" in patch) dbPatch.started_at = patch.startedAt ? new Date(patch.startedAt).toISOString() : null;
  if ("endedAt" in patch) dbPatch.ended_at = patch.endedAt ? new Date(patch.endedAt).toISOString() : null;
  if ("startPhoto" in patch) dbPatch.start_photo = patch.startPhoto;
  if ("endPhoto" in patch) dbPatch.end_photo = patch.endPhoto;
  if ("remindedSent" in patch) dbPatch.reminded_sent = patch.remindedSent;
  const { error } = await supabase.from("walks").update(dbPatch).eq("id", id);
  if (error) console.error("updateWalk error", error);
}

export async function insertNotification(n) {
  const { error } = await supabase.from("notifications").insert({
    pet_id: n.petId, walk_id: n.walkId || null, type: n.type, message: n.message, photo: n.photo || null,
  });
  if (error) console.error("insertNotification error", error);
}

export async function updateSettings(patch) {
  const dbPatch = {};
  if ("hourlyRate" in patch) dbPatch.hourly_rate = patch.hourlyRate;
  const { error } = await supabase.from("settings").update(dbPatch).eq("id", 1);
  if (error) console.error("updateSettings error", error);
}
