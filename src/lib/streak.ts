import { supabase } from "@/integrations/supabase/client";

/**
 * Bumps the user's daily practice streak. Safe to call multiple times per day.
 * - Same day: no change
 * - Yesterday: streak + 1
 * - Otherwise: reset to 1
 */
export async function bumpStreak(userId: string): Promise<number | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: prof } = await supabase
    .from("profiles")
    .select("last_practice_date, current_streak")
    .eq("id", userId)
    .maybeSingle();
  if (!prof) return null;
  const last = prof.last_practice_date;
  let streak = prof.current_streak ?? 0;
  if (last === today) return streak;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yStr = y.toISOString().slice(0, 10);
  streak = last === yStr ? streak + 1 : 1;
  await supabase
    .from("profiles")
    .update({ last_practice_date: today, current_streak: streak })
    .eq("id", userId);
  return streak;
}
