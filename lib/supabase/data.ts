import { createServerClient, isSupabaseConfigured } from "./server";
import { SEED_OFFICERS } from "@/lib/demo/seedData";
import { Officer } from "@/types";

/**
 * Single place every API route calls to get officers, so the app works
 * identically whether Supabase is wired up or not. Mirrors the fallback
 * pattern already used for Gemini (lib/gemini/client.ts).
 */
export async function getOfficers(): Promise<{ officers: Officer[]; source: "supabase" | "demo_data" }> {
  if (!isSupabaseConfigured()) {
    return { officers: SEED_OFFICERS, source: "demo_data" };
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.from("officers").select("*");
    if (error) throw error;

    const officers: Officer[] = data.map((row) => ({
      id: row.id,
      name: row.name,
      department: row.department,
      skills: row.skills ?? [],
      authority: row.authority ?? [],
      current_load: row.current_load,
      max_load: row.max_load,
      avg_processing_days: Number(row.avg_processing_days),
      available: row.available,
    }));

    return { officers, source: "supabase" };
  } catch (err) {
    console.error("Supabase officer fetch failed, using demo data:", err);
    return { officers: SEED_OFFICERS, source: "demo_data" };
  }
}
