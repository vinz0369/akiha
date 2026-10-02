import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const rewardSchema = z.object({
  id: z.uuid(),
  source: z.enum(["admin", "user_proposal"]),
  title: z.string(),
  public_description: z.string().nullable(),
  is_mystery: z.boolean(),
  rule_type: z.enum(["streak_days", "total_checkins"]),
  threshold: z.number().int().positive(),
  progress: z.number().int().nonnegative(),
  status: z.enum(["proposed", "rejected", "active", "unlocked", "claimed", "archived"]),
  rejected_reason: z.string().nullable(),
  unlocked_at: z.string().nullable(),
  claimed_at: z.string().nullable(),
  secret: z.object({
    type: z.enum(["letter", "message", "image"]),
    text: z.string().nullable(),
    asset_path: z.string().nullable(),
  }).nullable(),
});

export type Reward = z.infer<typeof rewardSchema>;

export async function getRewards(): Promise<Reward[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_reward_state");
  if (error) throw new Error(`Chưa thể tải phần thưởng: ${error.message}`);
  return z.array(rewardSchema).parse(data);
}
