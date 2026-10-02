export type ReactionKind = "normal" | "milestone" | "late_night" | "with_photo" | "without_photo";

export type ReactionTemplate = {
  id: string;
  kind: ReactionKind;
  text: string;
  milestoneValue: number | null;
  weight: number;
  active: boolean;
};

export type ReactionContext = {
  streak: number;
  localMinutes: number;
  photoCount: number;
};

export function reactionPool(context: ReactionContext, templates: ReactionTemplate[]): ReactionKind {
  const hasMilestone = templates.some((template) =>
    template.active && template.kind === "milestone" && template.milestoneValue === context.streak,
  );
  if (hasMilestone) return "milestone";
  if (context.localMinutes >= 22 * 60 + 30) return "late_night";
  return context.photoCount > 0 ? "with_photo" : "without_photo";
}

export function selectReaction(
  templates: ReactionTemplate[],
  context: ReactionContext,
  recentTemplateIds: string[],
  randomValue = Math.random(),
): ReactionTemplate | null {
  const selectedPool = reactionPool(context, templates);
  let pool = templates.filter((template) => template.active && template.kind === selectedPool
    && (selectedPool !== "milestone" || template.milestoneValue === context.streak));
  if (pool.length === 0 && selectedPool !== "normal") {
    pool = templates.filter((template) => template.active && template.kind === "normal");
  }
  const withoutRecent = pool.filter((template) => !recentTemplateIds.slice(0, 3).includes(template.id));
  const candidates = withoutRecent.length > 0 ? withoutRecent : pool;
  const totalWeight = candidates.reduce((total, template) => total + template.weight, 0);
  if (totalWeight <= 0) return null;
  let cursor = Math.min(Math.max(randomValue, 0), 0.999999) * totalWeight;
  for (const template of candidates) {
    cursor -= template.weight;
    if (cursor < 0) return template;
  }
  return candidates.at(-1) ?? null;
}
