import { Buffer } from "node:buffer";
import { strToU8, zipSync } from "fflate";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Bạn cần đăng nhập lại." }, { status: 401 });

  const { data: checkins, error: checkinError } = await supabase.from("checkins").select("id,user_id,local_date,checked_in_at").order("checked_in_at");
  if (checkinError) return Response.json({ error: "Chưa thể chuẩn bị danh sách ảnh." }, { status: 500 });
  const metaById = new Map((checkins ?? []).map((item) => [item.id, item]));
  const ids = [...metaById.keys()];
  if (!ids.length) return Response.json({ error: "Chưa có ảnh để tải." }, { status: 404 });

  const { data: assets, error: assetError } = await supabase.from("moment_assets").select("id,checkin_id,position,full_path").in("checkin_id", ids).order("checkin_id").order("position");
  if (assetError || !assets?.length) return Response.json({ error: "Chưa có ảnh để tải." }, { status: assetError ? 500 : 404 });

  const files: Record<string, Uint8Array> = {};
  for (const asset of assets) {
    const { data, error } = await supabase.storage.from("moments").download(asset.full_path);
    if (error) continue;
    const extension = asset.full_path.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const meta = metaById.get(asset.checkin_id);
    const date = meta?.local_date ?? "unknown-date";
    const author = meta?.user_id?.slice(0, 8) ?? "unknown";
    const time = meta?.checked_in_at ? new Date(meta.checked_in_at).toISOString().slice(11, 19).replaceAll(":", "-") : asset.id.slice(0, 8);
    files[`${date}/${time}-${author}.${extension}`] = new Uint8Array(await data.arrayBuffer());
  }
  if (!Object.keys(files).length) return Response.json({ error: "Ảnh tạm thời chưa tải được." }, { status: 502 });
  files["README.txt"] = strToU8("Bản sao ảnh khoảnh khắc riêng tư từ Akiha. Không chia sẻ gói này nếu chưa có sự đồng ý của Thu và Vinh.");
  const archive = zipSync(files, { level: 6 });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(Buffer.from(archive), { headers: { "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="akiha-photos-${stamp}.zip"`, "Content-Type": "application/zip" } });
}
