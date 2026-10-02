"use client";

import { z } from "zod";

import { prepareImage } from "@/features/checkins/image";
import { createClient } from "@/lib/supabase/client";

const momentResultSchema = z.object({
  status: z.enum(["created", "existing"]),
  moment_id: z.uuid(),
  local_date: z.iso.date(),
});

export type MomentResult = z.infer<typeof momentResultSchema>;

type SubmitMomentInput = {
  localDate: string;
  caption: string | null;
  file: File;
  clientRequestId: string;
  onProgress?: (message: string) => void;
};

function isAlreadyUploaded(error: { message?: string; statusCode?: string } | null) {
  return error?.statusCode === "409" || /already exists|duplicate/i.test(error?.message ?? "");
}

export async function submitMoment(input: SubmitMomentInput): Promise<MomentResult> {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");

  input.onProgress?.("Đang xử lý ảnh…");
  const image = await prepareImage(input.file);
  const extension = image.mimeType === "image/webp" ? "webp" : "jpg";
  const prefix = `${user.id}/${input.localDate}/${input.clientRequestId}`;
  const fullPath = `${prefix}/full.${extension}`;
  const thumbPath = `${prefix}/thumb.${extension}`;
  const uploadedPaths: string[] = [];

  try {
    input.onProgress?.("Đang tải ảnh lên…");
    const { error: fullError } = await supabase.storage.from("moments").upload(
      fullPath,
      image.full,
      { contentType: image.mimeType, upsert: false },
    );
    if (fullError && !isAlreadyUploaded(fullError)) {
      throw new Error("Tải ảnh chưa thành công. Ảnh nháp vẫn được giữ để thử lại.");
    }
    if (!fullError) uploadedPaths.push(fullPath);

    const { error: thumbError } = await supabase.storage.from("moments").upload(
      thumbPath,
      image.thumbnail,
      { contentType: image.mimeType, upsert: false },
    );
    if (thumbError && !isAlreadyUploaded(thumbError)) {
      throw new Error("Tải ảnh xem trước chưa thành công. Ảnh nháp vẫn được giữ để thử lại.");
    }
    if (!thumbError) uploadedPaths.push(thumbPath);

    input.onProgress?.("Đang gửi cho người thương…");
    const { data, error } = await supabase.rpc("create_couple_moment", {
      p_local_date: input.localDate,
      p_caption: input.caption,
      p_asset: {
        full_path: fullPath,
        thumb_path: thumbPath,
        mime_type: image.mimeType,
        width: image.width,
        height: image.height,
        size_bytes: image.full.size,
      },
      p_client_request_id: input.clientRequestId,
    });
    if (error) throw new Error(error.message);
    const result = momentResultSchema.parse(data);

    // The database queues and invokes this server-side. This second idempotent
    // call also retries delivery when a previous upload response was interrupted.
    void supabase.functions.invoke("send-moment-notification", {
      body: { moment_id: result.moment_id },
    });
    return result;
  } catch (error) {
    // Keep complete uploads for an idempotent retry after a dropped response.
    if (uploadedPaths.length === 1) {
      await supabase.storage.from("moments").remove(uploadedPaths);
    }
    throw error;
  }
}
