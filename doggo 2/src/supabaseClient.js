import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Revisa tu archivo .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TABLE = "app_state";

/** Lee una "tabla" lógica (fila) de app_state. Devuelve fallback si no existe o falla. */
export async function loadKey(key, fallback) {
  try {
    const { data, error } = await supabase.from(TABLE).select("value").eq("key", key).maybeSingle();
    if (error || !data) return fallback;
    return data.value ?? fallback;
  } catch (e) {
    console.error("Supabase load error", key, e);
    return fallback;
  }
}

/** Guarda una "tabla" lógica (fila) en app_state, compartida entre todos los usuarios. */
export async function saveKey(key, value) {
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) console.error("Supabase save error", key, error);
  } catch (e) {
    console.error("Supabase save error", key, e);
  }
}
