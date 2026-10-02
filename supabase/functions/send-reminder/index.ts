import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

type Subscription = { id: string; endpoint: string; p256dh: string; auth_key: string };
type Settings = { reminder_time: string; reminder_enabled: boolean; timezone: string };

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function secretApiKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    const value = (JSON.parse(raw) as Record<string, string>).default;
    if (value) return value;
  }
  return requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function localDateAndMinutes(now: Date, timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { localDate: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
    if (request.headers.get("x-cron-secret") !== requiredEnv("CRON_SECRET")) return response({ error: "unauthorized" }, 401);

    const supabase = createClient(requiredEnv("SUPABASE_URL"), secretApiKey(), { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: settingsData, error: settingsError } = await supabase.from("app_settings").select("reminder_time,reminder_enabled,timezone").eq("key", "default").single();
    if (settingsError) return response({ error: "settings_unavailable" }, 500);
    const settings = settingsData as Settings;
    if (!settings.reminder_enabled) return response({ status: "disabled" });
    const local = localDateAndMinutes(new Date(), settings.timezone);
    const [hour, minute] = settings.reminder_time.split(":").map(Number);
    const scheduled = hour * 60 + minute;
    if (local.minutes < scheduled || local.minutes >= scheduled + 15) return response({ status: "outside_window" });

    const { data: members, error: membersError } = await supabase.from("couple_members").select("user_id");
    if (membersError) return response({ error: "members_unavailable" }, 500);
    webpush.setVapidDetails(requiredEnv("VAPID_SUBJECT"), requiredEnv("VAPID_PUBLIC_KEY"), requiredEnv("VAPID_PRIVATE_KEY"));
    let sentTo = 0;

    for (const member of members ?? []) {
      const recipientId = String(member.user_id);
      const { data: moment } = await supabase.from("checkins").select("id").eq("user_id", recipientId).eq("local_date", local.localDate).limit(1).maybeSingle();
      if (moment) continue;
      const message = "Hôm nay album chung vẫn đang chờ một khoảnh khắc từ bạn ♡";
      const { data: delivery, error: deliveryError } = await supabase.from("notification_deliveries").insert({
        recipient_id: recipientId,
        local_date: local.localDate,
        kind: "daily_reminder",
        message_snapshot: message,
        status: "pending",
        attempt_count: 1,
      }).select("id").single();
      if (deliveryError?.code === "23505") continue;
      if (deliveryError || !delivery) continue;

      const { data: rows } = await supabase.from("push_subscriptions").select("id,endpoint,p256dh,auth_key").eq("user_id", recipientId).eq("is_active", true);
      let successes = 0;
      for (const subscription of (rows ?? []) as Subscription[]) {
        try {
          await webpush.sendNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } },
            JSON.stringify({ title: "Akiha", body: message, route: "/#camera", icon: "/icons/icon-192.png" }),
            { TTL: 300 },
          );
          successes += 1;
          await supabase.from("push_subscriptions").update({ last_success_at: new Date().toISOString() }).eq("id", subscription.id);
        } catch (caught) {
          const statusCode = typeof caught === "object" && caught && "statusCode" in caught ? Number(caught.statusCode) : 0;
          if (statusCode === 404 || statusCode === 410) await supabase.from("push_subscriptions").update({ is_active: false }).eq("id", subscription.id);
        }
      }
      await supabase.from("notification_deliveries").update({
        status: successes > 0 ? "sent" : "skipped",
        sent_at: successes > 0 ? new Date().toISOString() : null,
        last_error_code: successes > 0 ? null : "no_active_subscription",
      }).eq("id", delivery.id);
      if (successes > 0) sentTo += 1;
    }
    return response({ status: "complete", sent_to: sentTo });
  },
};
