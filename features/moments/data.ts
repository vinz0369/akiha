import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { momentCardSchema, reactionKindSchema, replySchema, type MomentCard } from "@/features/moments/types";

const homeSchema = z.object({
  today: z.iso.date(),
  couple_id: z.uuid(),
  viewer_id: z.uuid(),
  viewer_name: z.string(),
  partner_name: z.string(),
  unseen_count: z.number().int().nonnegative(),
  moments: z.array(momentCardSchema),
});

const daySchema = z.object({
  local_date: z.iso.date(),
  viewer_id: z.uuid(),
  moments: z.array(momentCardSchema),
});

const detailSchema = z.object({
  id: z.uuid(),
  author_id: z.uuid(),
  author_name: z.string(),
  viewer_id: z.uuid(),
  local_date: z.iso.date(),
  captured_at: z.string(),
  caption: z.string().nullable(),
  full_path: z.string().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  seen_by_partner: z.boolean(),
  viewer_reaction: reactionKindSchema.nullable(),
  replies: z.array(replySchema),
});

async function signMomentImages<T extends { full_path: string | null }>(rows: T[]) {
  const supabase = await createClient();
  const paths = rows.flatMap((row) => row.full_path ? [row.full_path] : []);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data, error } = await supabase.storage.from("moments").createSignedUrls(paths, 60 * 10);
    if (error) throw new Error("Chưa thể mở ảnh riêng tư. Hãy thử tải lại trang.");
    data.forEach((item) => {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    });
  }
  return rows.map((row) => ({ ...row, imageUrl: row.full_path ? urls.get(row.full_path) ?? null : null }));
}

async function partnerReactions(momentIds: string[], viewerId: string) {
  const result = new Map<string, z.infer<typeof reactionKindSchema>>();
  if (!momentIds.length) return result;
  const supabase = await createClient();
  const { data, error } = await supabase.from("moment_reactions").select("checkin_id,author_id,kind").in("checkin_id", momentIds);
  if (error) throw new Error("Chưa thể tải cảm xúc của người thương.");
  z.array(z.object({ checkin_id: z.uuid(), author_id: z.uuid(), kind: reactionKindSchema })).parse(data).forEach((row) => {
    if (row.author_id !== viewerId) result.set(row.checkin_id, row.kind);
  });
  return result;
}

export async function getCoupleHome() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_couple_home");
  if (error) throw new Error(`Chưa thể tải hôm nay: ${error.message}`);
  const parsed = homeSchema.parse(data);
  const [signed, reactions] = await Promise.all([
    signMomentImages(parsed.moments),
    partnerReactions(parsed.moments.map((moment) => moment.id), parsed.viewer_id),
  ]);
  return { ...parsed, moments: signed.map((moment) => ({ ...moment, partnerReaction: reactions.get(moment.id) ?? null })) as MomentCard[] };
}

export async function getCoupleDay(localDate: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_couple_day", { p_local_date: localDate });
  if (error) throw new Error(`Chưa thể tải album ngày: ${error.message}`);
  const parsed = daySchema.parse(data);
  const [signed, reactions] = await Promise.all([
    signMomentImages(parsed.moments),
    partnerReactions(parsed.moments.map((moment) => moment.id), parsed.viewer_id),
  ]);
  return { ...parsed, moments: signed.map((moment) => ({ ...moment, partnerReaction: reactions.get(moment.id) ?? null })) as MomentCard[] };
}

export async function getCoupleMoment(momentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_couple_moment", { p_moment_id: momentId });
  if (error) return null;
  const parsed = detailSchema.parse(data);
  const [[signed], reactions] = await Promise.all([
    signMomentImages([parsed]),
    partnerReactions([parsed.id], parsed.viewer_id),
  ]);
  return { ...signed, partnerReaction: reactions.get(parsed.id) ?? null };
}
