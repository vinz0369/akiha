export const MAX_IMAGES = 1;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

export type PreparedImage = {
  full: Blob;
  thumbnail: Blob;
  mimeType: "image/jpeg" | "image/webp";
  width: number;
  height: number;
};

function sniffImageType(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encode(
  source: ImageBitmap,
  maxEdge: number,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number; mimeType: "image/jpeg" | "image/webp" }> {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) throw new Error("Trình duyệt này không thể xử lý ảnh.");

  context.drawImage(source, 0, 0, width, height);
  const webp = await canvasBlob(canvas, "image/webp", quality);
  if (webp?.type === "image/webp") {
    return { blob: webp, width, height, mimeType: "image/webp" };
  }

  const jpegCanvas = document.createElement("canvas");
  jpegCanvas.width = width;
  jpegCanvas.height = height;
  const jpegContext = jpegCanvas.getContext("2d");
  if (!jpegContext) throw new Error("Trình duyệt này không thể xử lý ảnh.");
  jpegContext.fillStyle = "#ffffff";
  jpegContext.fillRect(0, 0, width, height);
  jpegContext.drawImage(canvas, 0, 0);
  const jpeg = await canvasBlob(jpegCanvas, "image/jpeg", quality);
  if (!jpeg) throw new Error("Không thể mã hóa ảnh. Hãy thử ảnh khác.");
  return { blob: jpeg, width, height, mimeType: "image/jpeg" };
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Mỗi ảnh gốc phải nhỏ hơn 15 MB.");
  }

  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!sniffImageType(signature)) {
    throw new Error("Hãy chọn ảnh JPEG, PNG hoặc WebP.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Không thể đọc ảnh này.");
  }

  try {
    const [full, thumbnail] = await Promise.all([
      encode(bitmap, 1280, 0.8),
      encode(bitmap, 256, 0.74),
    ]);

    if (full.blob.size > 1024 * 1024) {
      throw new Error("Ảnh sau xử lý vẫn quá lớn. Hãy thử cắt ảnh gọn hơn.");
    }

    return {
      full: full.blob,
      thumbnail: thumbnail.blob,
      mimeType: full.mimeType,
      width: full.width,
      height: full.height,
    };
  } finally {
    bitmap.close();
  }
}
