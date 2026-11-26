import { isAdmin, unauthorized } from "@/lib/auth";
import { createUpload, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/media";

/** One-time upload link for a photo, video or video cover. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return unauthorized();
  const { contentType, size } = (await req.json().catch(() => ({}))) as { contentType?: string; size?: number };
  const type = String(contentType ?? "");
  const max = type.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!Number(size) || Number(size) > max)
    return Response.json({ error: `File is too large (max ${Math.round(max / 1024 / 1024)} MB)` }, { status: 400 });
  try {
    return Response.json(await createUpload(type));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
