import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const deviceSchema = z.object({
  id: z.uuid(),
  user_agent: z.string(),
  is_active: z.boolean(),
  last_success_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type PushDevice = z.infer<typeof deviceSchema>;

export async function getSettingsData() {
  const { data, error } = await (await createClient()).rpc("get_push_devices");
  if (error) throw new Error("Chưa thể tải cài đặt thiết bị.");
  return { devices: z.array(deviceSchema).parse(data) };
}
