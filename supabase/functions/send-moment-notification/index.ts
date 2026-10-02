import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

type Subscription = { id: string; endpoint: string; p256dh: string; auth_key: string };

const RETRY_DELAYS = [0, 180, 520] as const;

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function keyMap(name: "SUPABASE_PUBLISHABLE_KEYS" | "SUPABASE_SECRET_KEYS", legacy: string) {
  const raw = Deno.env.get(name);
  if (raw) {
    const value = (JSON.parse(raw) as Record<string, string>).default;
    if (value) return value;
  }
  return requiredEnv(legacy);
}

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
    const authorization = request.headers.get("Authorization");
    if (!authorization) return response({ error: "unauthorized" }, 401);

    const url = requiredEnv("SUPABASE_URL");
    const userClient = createClient(url, keyMap("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return response({ error: "unauthorized" }, 401);

    const body = await request.json().catch(() => null) as { moment_id?: string } | null;
    if (!body?.moment_id) return response({ error: "moment_id_required" }, 400);
    const { data: moment } = await userClient.from("checkins")
      .select("id,user_id,couple_id,local_date")
      .eq("id", body.moment_id)
      .eq("user_id", user.id)
      .single();
    if (!moment) return response({ error: "moment_not_found" }, 404);

    const admin = createClient(url, keyMap("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: existingDelivery } = await admin.from("notification_deliveries")
      .select("id,status,attempt_count")
      .eq("idempotency_key", moment.id)
      .maybeSingle();
    if (existingDelivery?.status === "sent") return response({ status: "already_sent" });

    const { data: author } = await admin.from("profiles").select("display_name").eq("id", user.id).single();
    const { data: members } = await admin.from("couple_members").select("user_id")
      .eq("couple_id", moment.couple_id).neq("user_id", user.id);
    const recipientIds = (members ?? []).map((member) => member.user_id);
    if (!recipientIds.length) return response({ status: "no_partner" });
    let delivery = existingDelivery;
    if (!delivery) {
      const { data: createdDelivery } = await admin.from("notification_deliveries").insert({
        recipient_id: recipientIds[0],
        local_date: moment.local_date,
        kind: "moment",
        message_snapshot: `${author?.display_name ?? "Người thương"} vừa gửi một khoảnh khắc.`,
        status: "pending",
        attempt_count: 0,
        created_by: user.id,
        idempotency_key: moment.id,
      }).select("id,status,attempt_count").single();
      delivery = createdDelivery;
    }
    if (!delivery) return response({ error: "delivery_unavailable" }, 500);

    const { data: rows } = await admin.from("push_subscriptions")
      .select("id,endpoint,p256dh,auth_key").in("user_id", recipientIds).eq("is_active", true);
    const subscriptions = (rows ?? []) as Subscription[];
    if (!subscriptions.length) {
      await admin.from("notification_deliveries").update({
        status: "skipped",
        attempt_count: Math.min(Number(delivery.attempt_count ?? 0) + 1, 10),
        last_error_code: "no_active_subscription",
      }).eq("id", delivery.id);
      return response({ status: "no_subscription" });
    }

    webpush.setVapidDetails(requiredEnv("VAPID_SUBJECT"), requiredEnv("VAPID_PUBLIC_KEY"), requiredEnv("VAPID_PRIVATE_KEY"));
    let successes = 0;
    for (const subscription of subscriptions) {
      for (const delay of RETRY_DELAYS) {
        if (delay) await wait(delay);
        try {
          await webpush.sendNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } },
            JSON.stringify({
              title: "Akiha",
              body: `${author?.display_name ?? "Người thương"} vừa gửi một khoảnh khắc.`,
              route: `/moments/${moment.id}`,
              icon: "/icons/icon-192.png",
            }),
            { TTL: 300 },
          );
          successes += 1;
          await admin.from("push_subscriptions").update({ last_success_at: new Date().toISOString() }).eq("id", subscription.id);
          break;
        } catch (caught) {
          const statusCode = typeof caught === "object" && caught && "statusCode" in caught ? Number(caught.statusCode) : 0;
          if (statusCode === 404 || statusCode === 410) {
            await admin.from("push_subscriptions").update({ is_active: false }).eq("id", subscription.id);
            break;
          }
        }
      }
    }
    await admin.from("notification_deliveries").update({
      status: successes > 0 ? "sent" : "failed",
      attempt_count: Math.min(Number(delivery.attempt_count ?? 0) + 1, 10),
      sent_at: successes > 0 ? new Date().toISOString() : null,
      last_error_code: successes > 0 ? null : "push_delivery_failed",
    }).eq("id", delivery.id);
    return response({ status: successes > 0 ? "sent" : "failed", successes });
  },
};
