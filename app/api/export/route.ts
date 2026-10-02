import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });

  const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const [moments, reactions, replies] = await Promise.all([
    supabase.from("checkins").select("id,user_id,local_date,checked_in_at,note,created_at,updated_at").order("checked_in_at"),
    supabase.from("moment_reactions").select("checkin_id,author_id,kind,created_at").order("created_at"),
    supabase.from("moment_replies").select("id,checkin_id,author_id,text,created_at").order("created_at"),
  ]);
  const failure = [moments, reactions, replies].find((result) => result.error)?.error;
  if (failure) return Response.json({ error: "Chưa thể tạo bản xuất dữ liệu." }, { status: 500 });

  await supabase.rpc("log_data_export", { p_format: format });
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    const columns = ["id", "user_id", "local_date", "checked_in_at", "note", "created_at", "updated_at"];
    const rows = (moments.data ?? []).map((row) => columns.map((column) => csvCell(row[column as keyof typeof row])).join(","));
    return new Response(`\uFEFF${columns.join(",")}\n${rows.join("\n")}`, {
      headers: { "Content-Disposition": `attachment; filename="akiha-moments-${stamp}.csv"`, "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return new Response(JSON.stringify({ exported_at: new Date().toISOString(), moments: moments.data, reactions: reactions.data, replies: replies.data }, null, 2), {
    headers: { "Content-Disposition": `attachment; filename="akiha-data-${stamp}.json"`, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
