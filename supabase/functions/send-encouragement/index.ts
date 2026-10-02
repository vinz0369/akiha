import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

type Subscription = { id: string; endpoint: string; p256dh: string; auth_key: string };

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

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405 });
    const authorization = request.headers.get("Authorization");
    if (!authorization) return Response.json({ error: "unauthorized" }, { status: 401 });
    const url = requiredEnv("SUPABASE_URL");
    const userClient = createClient(url, keyMap("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return Response.json({ error: "forbidden" }, { status: 403 });

    const body = await request.json() as { delivery_id?: string };
    if (!body.delivery_id) return Response.json({ error: "delivery_id_required" }, { status: 400 });
    const admin = createClient(url, keyMap("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: delivery } = await admin.from("notification_deliveries")
      .select("id,recipient_id,message_snapshot,status").eq("id", body.delivery_id)
      .eq("created_by", user.id).eq("kind", "encouragement").single();
    if (!delivery || delivery.status !== "pending") return Response.json({ status: "already_processed" });
    const { data: rows } = await admin.from("push_subscriptions")
      .select("id,endpoint,p256dh,auth_key").eq("user_id", delivery.recipient_id).eq("is_active", true);
    const subscriptions = (rows ?? []) as Subscription[];
    if (subscriptions.length === 0) {
      await admin.from("notification_deliveries").update({ status: "skipped", last_error_code: "no_subscription" }).eq("id", delivery.id);
      return Response.json({ status: "no_subscription" });
    }

    webpush.setVapidDetails(requiredEnv("VAPID_SUBJECT"), requiredEnv("VAPID_PUBLIC_KEY"), requiredEnv("VAPID_PRIVATE_KEY"));
    let successes = 0;
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } },
        JSON.stringify({ title: "A note from Vinh", body: delivery.message_snapshot, route: "/" }), { TTL: 300 });
        successes += 1;
      } catch (caught) {
        const statusCode = typeof caught === "object" && caught && "statusCode" in caught ? Number(caught.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").update({ is_active: false }).eq("id", subscription.id);
        }
      }
    }
    await admin.from("notification_deliveries").update({
      status: successes > 0 ? "sent" : "failed",
      sent_at: successes > 0 ? new Date().toISOString() : null,
      last_error_code: successes > 0 ? null : "push_failed",
    }).eq("id", delivery.id);
    return Response.json({ status: successes > 0 ? "sent" : "failed", successes });
  },
};
