import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/pjpeg"]);

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const AUDIO_EXT = new Set([".mp3", ".wav", ".ogg", ".webm", ".m4a"]);
const AUDIO_MIME = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm", "audio/mp4", "audio/x-m4a"]);

export type SaveMediaResult =
  | { ok: true; publicPath: string }
  | { ok: false; reason: "empty" | "type" | "size" | "write" };

function extFromName(filename: string): string {
  return path.extname(filename).toLowerCase();
}

async function saveFile(
  file: File,
  opts: { maxBytes: number; allowedExt: Set<string>; allowedMime: Set<string>; subdir: string },
): Promise<SaveMediaResult> {
  if (!file || file.size === 0) return { ok: false, reason: "empty" };
  if (file.size > opts.maxBytes) return { ok: false, reason: "size" };

  const ext = extFromName(file.name);
  if (!opts.allowedExt.has(ext)) return { ok: false, reason: "type" };
  if (file.type && !opts.allowedMime.has(file.type)) return { ok: false, reason: "type" };

  const uploadDir = path.join(process.cwd(), "public", "uploads", opts.subdir);
  const filename = `${randomUUID()}${ext}`;
  const diskPath = path.join(uploadDir, filename);

  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(diskPath, buf);
  } catch {
    return { ok: false, reason: "write" };
  }

  return { ok: true, publicPath: `/uploads/${opts.subdir}/${filename}` };
}

/** Question/option image — png/jpg/jpeg/webp, 2MB cap. Mirrors saveTenantLogoFile's pattern. */
export async function saveQuestionImageFile(file: File): Promise<SaveMediaResult> {
  return saveFile(file, { maxBytes: MAX_IMAGE_BYTES, allowedExt: IMAGE_EXT, allowedMime: IMAGE_MIME, subdir: "questions" });
}

/** Question audio clip — mp3/wav/ogg/webm/m4a, 10MB cap. */
export async function saveQuestionAudioFile(file: File): Promise<SaveMediaResult> {
  return saveFile(file, { maxBytes: MAX_AUDIO_BYTES, allowedExt: AUDIO_EXT, allowedMime: AUDIO_MIME, subdir: "question-audio" });
}

/** Reads `${namePrefix}1`..`${namePrefix}max` from a submitted FormData, uploads whichever are present, and returns their public paths in order — skips empty/missing slots (rejected files are silently skipped too, matching the "optional, best-effort" nature of this field). */
export async function collectQuestionImages(formData: FormData, namePrefix = "img", max = 3): Promise<string[]> {
  const urls: string[] = [];
  for (let n = 1; n <= max; n++) {
    const file = formData.get(`${namePrefix}${n}`);
    if (file instanceof File && file.size > 0) {
      const result = await saveQuestionImageFile(file);
      if (result.ok) urls.push(result.publicPath);
    }
  }
  return urls;
}

/** Reads one optional audio file field, uploads it if present, returns its public path or null. */
export async function collectQuestionAudio(formData: FormData, name = "audio"): Promise<string | null> {
  const file = formData.get(name);
  if (file instanceof File && file.size > 0) {
    const result = await saveQuestionAudioFile(file);
    if (result.ok) return result.publicPath;
  }
  return null;
}

/** Reads one optional option-image file field, uploads it if present, returns its public path or null. */
export async function collectOptionImage(formData: FormData, name: string): Promise<string | null> {
  const file = formData.get(name);
  if (file instanceof File && file.size > 0) {
    const result = await saveQuestionImageFile(file);
    if (result.ok) return result.publicPath;
  }
  return null;
}
