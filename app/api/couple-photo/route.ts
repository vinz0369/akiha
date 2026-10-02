import { readFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response("Unauthorized", { status: 401 });

  try {
    const photo = await readFile(path.join(process.cwd(), "private-assets", "couple.webp"));
    return new Response(photo, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Photo unavailable", { status: 404 });
  }
}
