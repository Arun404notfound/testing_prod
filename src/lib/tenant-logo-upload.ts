import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/pjpeg"]);

export type SaveTenantLogoResult =
  | { ok: true; publicPath: string }
  | { ok: false; reason: "empty" | "type" | "size" | "write" };

function extFromName(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export async function saveTenantLogoFile(file: File): Promise<SaveTenantLogoResult> {
  if (!file || file.size === 0) return { ok: false, reason: "empty" };
  if (file.size > MAX_BYTES) return { ok: false, reason: "size" };

  const ext = extFromName(file.name);
  if (!ALLOWED_EXT.has(ext)) return { ok: false, reason: "type" };
  if (file.type && !ALLOWED_MIME.has(file.type)) return { ok: false, reason: "type" };

  const uploadDir = path.join(process.cwd(), "public", "uploads", "tenants");
  const filename = `${randomUUID()}${ext}`;
  const diskPath = path.join(uploadDir, filename);

  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(diskPath, buf);
  } catch {
    return { ok: false, reason: "write" };
  }

  return { ok: true, publicPath: `/uploads/tenants/${filename}` };
}
