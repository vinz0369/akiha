import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const reminderSchema = z.object({ eligible: z.boolean(), message: z.string() });

export async function getInAppReminder() {
  const { data, error } = await (await createClient()).rpc("get_in_app_reminder");
  if (error) return { eligible: false, message: "" };
  return reminderSchema.parse(data);
}
