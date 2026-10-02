import { z } from "zod";

export const reactionKindSchema = z.enum(["heart", "hug", "laugh"]);
export type ReactionKind = z.infer<typeof reactionKindSchema>;

export const momentCardSchema = z.object({
  id: z.uuid(),
  author_id: z.uuid(),
  author_name: z.string(),
  local_date: z.iso.date(),
  captured_at: z.string(),
  caption: z.string().nullable(),
  full_path: z.string().nullable(),
  thumb_path: z.string().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  seen_by_partner: z.boolean(),
  viewer_reaction: reactionKindSchema.nullable(),
  reply_count: z.number().int().nonnegative(),
});

export type MomentCard = z.infer<typeof momentCardSchema> & {
  imageUrl: string | null;
  partnerReaction: ReactionKind | null;
};

export const replySchema = z.object({
  id: z.uuid(),
  author_id: z.uuid(),
  author_name: z.string(),
  text: z.string(),
  created_at: z.string(),
});
